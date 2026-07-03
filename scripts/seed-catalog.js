#!/usr/bin/env node
// Direct MongoDB seed for the product + inventory domain, plus the event-derived
// report and audit projections — all kept mutually consistent:
//   categories, suppliers, products    -> `products` DB
//   inventoryitems, stocktransactions  -> `inventory` DB
//   products (projection), sales       -> `reports` DB
//   auditlogs, templates, notifications-> `audit` DB
//
// Integrity is enforced by a ledger: each product's transactions (IN +q, OUT -q,
// ADJUST +/-delta) are replayed in chronological order; the running balance may
// never go negative, and the final balance is written to BOTH the inventory item
// quantity AND the product stockQuantity so the two source-of-truth stores agree.
//
// The report/audit projections are DERIVED from that same in-memory ledger (same
// productIds, same dates), not invented:
//   - reports.products mirrors each catalog product (adds cost for valuation).
//   - reports.sales has one row per OUT transaction (a dispatch == a sale).
//   - audit.auditlogs has a CREATE per product and a CREATE per stock transaction.
//   - notifications has a STOCK_MOVEMENT row per IN/OUT txn (userId = admin, so it
//     surfaces on the user's notifications page) and a LOW_STOCK row per product that
//     ends below its reorderLevel (userId = null, matching the admin-broadcast the
//     service emits). Bodies are rendered through the same templates the service uses.
//     NOTE: notification-service connects with dbName:'audit' (its MONGODB_URI path
//     `notifications` is overridden), so notifications + templates live in the `audit`
//     DB alongside auditlogs — that's where these are written, not a `notifications` DB.
//
// Requires users to exist (run `pnpm seed:mongo` first) — stock transactions and
// audit logs reference the admin user's _id.
//
// Usage:
//   node scripts/seed-catalog.js            # skip if already seeded
//   SEED_RESET=1 node scripts/seed-catalog.js   # wipe seed collections, reseed
//   MONGODB_URI=mongodb://... node scripts/seed-catalog.js
//
// ponytail: reportcaches (5-min TTL, self-regenerating) and reportdefinitions
// (not read by any endpoint) are NOT seeded — reportcaches is only wiped so stale
// entries can't mask the new numbers.

'use strict';

/* eslint-disable no-console, @typescript-eslint/no-var-requires --
   Node CLI seed script: console is the intended output, require is CJS. */

const { MongoClient } = require('mongodb');
const { randomUUID } = require('crypto');

// Assumed gross margin: report cost projection = price * (1 - MARGIN).
const MARGIN = 0.4;
const round2 = (n) => Math.round(n * 100) / 100;

const BASE_URI =
  process.env.MONGODB_URI ?? 'mongodb://admin:admin123@localhost:27017/?authSource=admin';
const RESET = process.env.SEED_RESET === '1';
const DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORIES = [
  { name: 'Electronics', description: 'Devices, peripherals and accessories' },
  { name: 'Furniture', description: 'Office and home furniture' },
  { name: 'Office Supplies', description: 'Stationery and consumables' },
  { name: 'Groceries', description: 'Food and beverages' },
  { name: 'Apparel', description: 'Clothing and wearables' },
];

const SUPPLIERS = [
  {
    name: 'Acme Electronics',
    contactEmail: 'sales@acme-elec.example',
    phone: '+1-202-555-0111',
    address: '12 Circuit Ave, San Jose, CA',
  },
  {
    name: 'Global Furnishings',
    contactEmail: 'orders@globalfurn.example',
    phone: '+1-312-555-0182',
    address: '88 Oakwood Blvd, Chicago, IL',
  },
  {
    name: 'OfficePro Supplies',
    contactEmail: 'hello@officepro.example',
    phone: '+1-415-555-0143',
    address: '5 Market St, San Francisco, CA',
  },
  {
    name: 'FreshFoods Distributors',
    contactEmail: 'contact@freshfoods.example',
    phone: '+1-206-555-0164',
    address: '340 Harbor Way, Seattle, WA',
  },
  {
    name: 'UrbanWear Co',
    contactEmail: 'wholesale@urbanwear.example',
    phone: '+1-718-555-0125',
    address: '77 Loom St, Brooklyn, NY',
  },
];

// Each product carries an ordered `moves` ledger of signed deltas.
//   type IN    -> delta > 0  (received stock)
//   type OUT   -> delta < 0  (sold/dispatched)
//   type ADJUST-> delta != 0 (correction: + recount gain, - shrinkage/damage)
// daysAgo places the transaction in time (feeds sales/time charts).
const PRODUCTS = [
  {
    name: 'Wireless Mouse',
    sku: 'ELEC-001',
    category: 'Electronics',
    price: 25.99,
    description: 'Ergonomic 2.4GHz wireless mouse',
    reorderLevel: 20,
    moves: [
      { type: 'IN', delta: 200, daysAgo: 28 },
      { type: 'OUT', delta: -45, daysAgo: 20 },
      { type: 'OUT', delta: -30, daysAgo: 12 },
      { type: 'ADJUST', delta: -3, daysAgo: 6, reason: 'Damaged units removed after audit' },
      { type: 'OUT', delta: -40, daysAgo: 2 },
    ],
  },
  {
    name: 'Mechanical Keyboard',
    sku: 'ELEC-002',
    category: 'Electronics',
    price: 79.99,
    description: 'RGB hot-swappable mechanical keyboard',
    reorderLevel: 15,
    moves: [
      { type: 'IN', delta: 120, daysAgo: 27 },
      { type: 'OUT', delta: -25, daysAgo: 18 },
      { type: 'OUT', delta: -33, daysAgo: 9 },
      { type: 'OUT', delta: -50, daysAgo: 3 },
    ],
  },
  {
    name: 'USB-C Hub',
    sku: 'ELEC-003',
    category: 'Electronics',
    price: 45.0,
    description: '7-in-1 USB-C multiport adapter',
    reorderLevel: 25,
    moves: [
      { type: 'IN', delta: 80, daysAgo: 25 },
      { type: 'OUT', delta: -20, daysAgo: 15 },
      { type: 'OUT', delta: -48, daysAgo: 4 },
      // ends at 12 -> below reorderLevel 25 (low stock)
    ],
  },
  {
    name: 'Office Chair',
    sku: 'FURN-001',
    category: 'Furniture',
    price: 149.99,
    description: 'Adjustable lumbar-support mesh chair',
    reorderLevel: 10,
    moves: [
      { type: 'IN', delta: 60, daysAgo: 26 },
      { type: 'OUT', delta: -12, daysAgo: 17 },
      {
        type: 'ADJUST',
        delta: 2,
        daysAgo: 10,
        reason: 'Recount correction (found 2 in back store)',
      },
      { type: 'OUT', delta: -8, daysAgo: 5 },
    ],
  },
  {
    name: 'Standing Desk',
    sku: 'FURN-002',
    category: 'Furniture',
    price: 399.0,
    description: 'Electric height-adjustable standing desk',
    reorderLevel: 8,
    moves: [
      { type: 'IN', delta: 30, daysAgo: 24 },
      { type: 'OUT', delta: -6, daysAgo: 14 },
      { type: 'OUT', delta: -9, daysAgo: 3 },
    ],
  },
  {
    name: 'A4 Paper Ream',
    sku: 'OFFS-001',
    category: 'Office Supplies',
    price: 6.5,
    description: '500-sheet 80gsm A4 paper',
    reorderLevel: 50,
    moves: [
      { type: 'IN', delta: 500, daysAgo: 29 },
      { type: 'OUT', delta: -120, daysAgo: 19 },
      { type: 'OUT', delta: -160, daysAgo: 8 },
      { type: 'OUT', delta: -190, daysAgo: 1 },
      // ends at 30 -> below reorderLevel 50 (low stock)
    ],
  },
  {
    name: 'Stapler',
    sku: 'OFFS-002',
    category: 'Office Supplies',
    price: 12.0,
    description: 'Heavy-duty 40-sheet stapler',
    reorderLevel: 15,
    moves: [
      { type: 'IN', delta: 90, daysAgo: 22 },
      { type: 'OUT', delta: -14, daysAgo: 13 },
      { type: 'ADJUST', delta: -1, daysAgo: 7, reason: 'Defective unit written off' },
      { type: 'OUT', delta: -20, daysAgo: 2 },
    ],
  },
  {
    name: 'Ballpoint Pen Pack',
    sku: 'OFFS-003',
    category: 'Office Supplies',
    price: 4.25,
    description: 'Pack of 12 blue ballpoint pens',
    reorderLevel: 40,
    moves: [
      { type: 'IN', delta: 300, daysAgo: 21 },
      { type: 'OUT', delta: -85, daysAgo: 11 },
      { type: 'OUT', delta: -95, daysAgo: 4 },
    ],
  },
  {
    name: 'Coffee Beans 1kg',
    sku: 'GROC-001',
    category: 'Groceries',
    price: 18.0,
    description: 'Single-origin arabica whole beans',
    reorderLevel: 30,
    moves: [
      { type: 'IN', delta: 150, daysAgo: 23 },
      { type: 'OUT', delta: -40, daysAgo: 16 },
      { type: 'OUT', delta: -55, daysAgo: 6 },
      { type: 'ADJUST', delta: -5, daysAgo: 5, reason: 'Expired stock discarded' },
      { type: 'OUT', delta: -30, daysAgo: 1 },
      // ends at 20 -> below reorderLevel 30 (low stock)
    ],
  },
  {
    name: 'Green Tea Box',
    sku: 'GROC-002',
    category: 'Groceries',
    price: 9.5,
    description: 'Box of 50 green tea bags',
    reorderLevel: 25,
    moves: [
      { type: 'IN', delta: 200, daysAgo: 20 },
      { type: 'OUT', delta: -60, daysAgo: 10 },
      { type: 'OUT', delta: -70, daysAgo: 3 },
    ],
  },
  {
    name: 'Cotton T-Shirt',
    sku: 'APPR-001',
    category: 'Apparel',
    price: 14.99,
    description: 'Unisex 180gsm cotton crew-neck tee',
    reorderLevel: 30,
    moves: [
      { type: 'IN', delta: 250, daysAgo: 27 },
      { type: 'OUT', delta: -60, daysAgo: 18 },
      { type: 'OUT', delta: -75, daysAgo: 9 },
      { type: 'ADJUST', delta: 4, daysAgo: 8, reason: 'Returned items restocked' },
      { type: 'OUT', delta: -50, daysAgo: 2 },
    ],
  },
  {
    name: 'Hoodie',
    sku: 'APPR-002',
    category: 'Apparel',
    price: 34.99,
    description: 'Fleece-lined pullover hoodie',
    reorderLevel: 20,
    moves: [
      { type: 'IN', delta: 140, daysAgo: 25 },
      { type: 'OUT', delta: -30, daysAgo: 15 },
      { type: 'OUT', delta: -44, daysAgo: 5 },
    ],
  },
];

// Runtime notification templates the live NotificationService renders ({{var}}
// substitution). Kept productId-based because the service only receives productId in
// the event payload. Seeded notification rows (below) render with the product NAME
// instead — the seed knows the catalog, so demo data reads cleanly.
const TEMPLATES = [
  {
    key: 'welcome',
    subject: 'Welcome, {{username}}!',
    body: 'Hi {{username}}, your inventory account is ready.',
  },
  {
    key: 'low-stock',
    subject: 'Low stock alert',
    body: 'Product {{productId}} is low on stock ({{currentQuantity}} remaining).',
  },
  {
    key: 'stock-confirm',
    subject: 'Stock movement recorded',
    body: 'Stock movement recorded for product {{productId}}: quantity {{quantity}}.',
  },
];

const SEED_CATEGORY_NAMES = new Set(CATEGORIES.map((c) => c.name));

// Replay a product's moves; enforce integrity; return { finalQty, txns }.
function buildLedger(product, now) {
  if (!SEED_CATEGORY_NAMES.has(product.category)) {
    throw new Error(`${product.sku}: category "${product.category}" is not a seeded category`);
  }
  let balance = 0;
  const txns = [];
  // Chronological order = latest daysAgo first.
  const ordered = [...product.moves].sort((a, b) => b.daysAgo - a.daysAgo);
  for (const move of ordered) {
    if (move.type === 'IN' && move.delta <= 0)
      throw new Error(`${product.sku}: IN must be positive`);
    if (move.type === 'OUT' && move.delta >= 0)
      throw new Error(`${product.sku}: OUT must be negative`);
    if (move.type === 'ADJUST' && move.delta === 0)
      throw new Error(`${product.sku}: ADJUST cannot be zero`);

    const next = balance + move.delta;
    if (next < 0) {
      throw new Error(
        `${product.sku}: ${move.type} ${move.delta} at day -${move.daysAgo} drives balance below zero ` +
          `(${balance} -> ${next})`
      );
    }
    balance = next;
    const at = new Date(now.getTime() - move.daysAgo * DAY_MS);
    txns.push({
      type: move.type,
      quantity: Math.abs(move.delta), // matches app: abs stored, type carries direction
      reason: move.reason,
      createdAt: at,
      updatedAt: at,
    });
  }
  return { finalQty: balance, txns };
}

async function wipe(productsDb, inventoryDb, reportsDb, auditDb, notifDb) {
  console.log('SEED_RESET=1 — wiping seed collections...');
  await Promise.all([
    productsDb.collection('categories').deleteMany({}),
    productsDb.collection('suppliers').deleteMany({}),
    productsDb.collection('products').deleteMany({}),
    inventoryDb.collection('inventoryitems').deleteMany({}),
    inventoryDb.collection('stocktransactions').deleteMany({}),
    reportsDb.collection('products').deleteMany({}),
    reportsDb.collection('sales').deleteMany({}),
    reportsDb.collection('reportcaches').deleteMany({}), // stale cache -> new numbers show
    auditDb.collection('auditlogs').deleteMany({}),
    // notification-service reads these from the `audit` DB (dbName override).
    auditDb.collection('notifications').deleteMany({}),
    auditDb.collection('templates').deleteMany({}),
    // Clear the stale standalone `notifications` DB (nothing reads it — earlier mis-seed).
    notifDb.collection('notifications').deleteMany({}),
    notifDb.collection('templates').deleteMany({}),
  ]);
}

// reports.products mirrors the catalog (with a cost for valuation); reports.sales
// has exactly one row per OUT transaction so sales reconcile with stock dispatches.
async function seedReports(reportsDb, seeded, soldBy, now) {
  console.log('Seeding report projections (products, sales)...');
  const productDocs = seeded.map(({ productId, product, finalQty }) => ({
    productId,
    name: product.name,
    sku: product.sku.toUpperCase(),
    price: product.price,
    cost: round2(product.price * (1 - MARGIN)),
    quantity: finalQty, // equals inventory quantity / product stockQuantity
    reorderLevel: product.reorderLevel,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
  await reportsDb.collection('products').insertMany(productDocs);

  const saleDocs = [];
  for (const { productId, product, txns } of seeded) {
    for (const t of txns) {
      if (t.type !== 'OUT') continue; // a dispatch is a sale
      saleDocs.push({
        productId,
        productName: product.name,
        quantity: t.quantity,
        price: product.price,
        totalAmount: round2(t.quantity * product.price),
        soldBy,
        createdAt: t.createdAt,
      });
    }
  }
  if (saleDocs.length > 0) {
    await reportsDb.collection('sales').insertMany(saleDocs);
  }
  console.log(`  ${productDocs.length} report products, ${saleDocs.length} sales`);
}

// Mirrors what the services emit: a CREATE audit for each product and each stock
// transaction. correlationId is per-event (services generate a fresh UUID).
async function seedAudit(auditDb, seeded, userId, username, now) {
  console.log('Seeding audit log...');
  const RESOURCE_BY_TXN = { IN: 'StockIn', OUT: 'StockOut', ADJUST: 'StockAdjustment' };
  const logs = [];

  for (const { productId, product, txns } of seeded) {
    logs.push({
      correlationId: randomUUID(),
      userId,
      username,
      role: 'ADMIN',
      action: 'CREATE',
      resourceType: 'Product',
      resourceId: productId,
      before: null,
      after: {
        name: product.name,
        sku: product.sku.toUpperCase(),
        price: product.price,
        category: product.category,
      },
      metadata: { sku: product.sku.toUpperCase(), category: product.category },
      createdAt: now, // products created at seed time
    });

    for (const t of txns) {
      logs.push({
        correlationId: randomUUID(),
        userId,
        username,
        role: 'ADMIN',
        action: 'CREATE',
        resourceType: RESOURCE_BY_TXN[t.type],
        resourceId: productId,
        before: null,
        after: {
          productId,
          type: t.type,
          quantity: t.quantity,
          ...(t.reason ? { reason: t.reason } : {}),
        },
        metadata: { productId, quantity: t.quantity },
        createdAt: t.createdAt,
      });
    }
  }
  await auditDb.collection('auditlogs').insertMany(logs);
  console.log(`  ${logs.length} audit log entries`);
}

// Templates + event-derived notifications. Faithful to NotificationService:
//   IN/OUT txn  -> STOCK_MOVEMENT (userId = admin, userEmail recipient)
//   low-stock   -> LOW_STOCK      (userId = null, admin@example.com)
// All marked SENT/1 attempt (the happy path the service reaches on a working SMTP).
//
// Seeded bodies are rendered with the human product NAME (not the raw id) — the
// seed knows the catalog, so demo notifications read cleanly. The runtime TEMPLATES
// collection is left productId-based (the live service only receives productId in the
// event payload), so live behaviour is unchanged and no image rebuild is needed.
// ponytail: to show names on live runtime notifications too, wire productName through
// stock.events + the inventory publishers + NotificationService handlers — separate
// change, needs the service images rebuilt.
async function seedNotifications(notifDb, seeded, userId, adminEmail, now) {
  console.log('Seeding notification templates and notifications...');
  await notifDb.collection('templates').insertMany(TEMPLATES.map((t) => ({ ...t })));

  const recipient = adminEmail ?? 'admin@example.com';
  const notifs = [];

  const push = (type, uid, to, subject, body, at) => {
    notifs.push({
      userId: uid,
      type,
      recipient: to,
      subject,
      body,
      status: 'SENT',
      read: false,
      attempts: 1,
      createdAt: at,
    });
  };

  for (const { finalQty, product, txns } of seeded) {
    for (const t of txns) {
      if (t.type === 'ADJUST') continue; // service only notifies on stock in/out
      push(
        'STOCK_MOVEMENT',
        userId,
        recipient,
        'Stock movement recorded',
        `Stock movement recorded for ${product.name}: quantity ${t.quantity}.`,
        t.createdAt
      );
    }
    if (finalQty < product.reorderLevel) {
      push(
        'LOW_STOCK',
        null,
        'admin@example.com',
        'Low stock alert',
        `${product.name} is low on stock (${finalQty} remaining).`,
        now
      );
    }
  }
  await notifDb.collection('notifications').insertMany(notifs);
  const lowCount = notifs.filter((n) => n.type === 'LOW_STOCK').length;
  console.log(
    `  ${TEMPLATES.length} templates, ${notifs.length} notifications ` +
      `(${notifs.length - lowCount} stock-movement, ${lowCount} low-stock)`
  );
}

// Integrity check that fails loudly if the stores disagree. Quantity must be equal
// across product-service, inventory-service AND the report projection.
async function reconcile(productsDb, inventoryDb, reportsDb) {
  const products = await productsDb.collection('products').find({}).toArray();
  const items = await inventoryDb.collection('inventoryitems').find({}).toArray();
  const reportProducts = await reportsDb.collection('products').find({}).toArray();
  const invByProduct = new Map(items.map((i) => [i.productId, i.quantity]));
  const repByProduct = new Map(reportProducts.map((r) => [r.productId, r.quantity]));
  for (const p of products) {
    const id = p._id.toString();
    const invQty = invByProduct.get(id);
    const repQty = repByProduct.get(id);
    if (invQty !== p.stockQuantity || repQty !== p.stockQuantity) {
      throw new Error(
        `Integrity check failed for ${p.sku}: product.stockQuantity=${p.stockQuantity}, ` +
          `inventoryitem.quantity=${invQty}, report.product.quantity=${repQty}`
      );
    }
  }
  console.log(
    `Integrity OK: ${products.length} products reconcile across product, inventory and report stores.`
  );
}

async function seed() {
  const client = new MongoClient(BASE_URI);
  await client.connect();
  console.log(`Connected to ${BASE_URI}`);

  const authDb = client.db('auth');
  const productsDb = client.db('products');
  const inventoryDb = client.db('inventory');
  const reportsDb = client.db('reports');
  const auditDb = client.db('audit');
  const notifDb = client.db('notifications');

  // createdBy must reference a real user (integrity across the auth boundary).
  const admin = await authDb.collection('users').findOne({ role: 'ADMIN' });
  if (!admin) {
    console.error('No ADMIN user found. Run `pnpm seed:mongo` first.');
    await client.close();
    process.exit(1);
  }
  const createdBy = admin._id.toString();
  const adminName = admin.username ?? 'admin';
  console.log(`Using createdBy = ${createdBy} (${admin.email})`);

  if (RESET) {
    await wipe(productsDb, inventoryDb, reportsDb, auditDb, notifDb);
  } else {
    const existing = await productsDb.collection('products').countDocuments({});
    if (existing > 0) {
      console.log(`products collection already has ${existing} docs — skipping.`);
      console.log('Re-run with SEED_RESET=1 to wipe and reseed.');
      await client.close();
      return;
    }
  }

  const now = new Date();

  // 1. Categories
  console.log('Seeding categories...');
  await productsDb.collection('categories').insertMany(
    CATEGORIES.map((c) => ({
      ...c,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
    }))
  );
  console.log(`  ${CATEGORIES.length} categories`);

  // 2. Suppliers
  console.log('Seeding suppliers...');
  await productsDb.collection('suppliers').insertMany(
    SUPPLIERS.map((s) => ({
      ...s,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
    }))
  );
  console.log(`  ${SUPPLIERS.length} suppliers`);

  // 3. Products + 4. inventory items + 5. stock transactions (ledger-consistent)
  console.log('Seeding products, inventory items and stock transactions...');
  let txnTotal = 0;
  const seeded = []; // capture for the report/audit projections below
  for (const p of PRODUCTS) {
    const { finalQty, txns } = buildLedger(p, now);

    const productDoc = {
      name: p.name,
      description: p.description,
      price: p.price,
      cost: round2(p.price * (1 - MARGIN)), // authored here; projected to reports
      sku: p.sku.toUpperCase(),
      category: p.category,
      stockQuantity: finalQty, // agrees with inventory item quantity below
      reorderLevel: p.reorderLevel, // authored here; projected to inventory item
      isActive: true,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await productsDb.collection('products').insertOne(productDoc);
    const productId = insertedId.toString();

    await inventoryDb.collection('inventoryitems').insertOne({
      productId,
      productName: p.name,
      sku: productDoc.sku,
      quantity: finalQty,
      reorderLevel: p.reorderLevel,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
    });

    if (txns.length > 0) {
      await inventoryDb.collection('stocktransactions').insertMany(
        txns.map((t) => ({
          productId,
          type: t.type,
          quantity: t.quantity,
          createdBy,
          ...(t.reason ? { reason: t.reason } : {}),
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }))
      );
    }
    txnTotal += txns.length;
    seeded.push({ productId, product: p, finalQty, txns });

    const low = finalQty < p.reorderLevel ? '  (LOW STOCK)' : '';
    console.log(`  ${p.sku}  ${p.name}: qty ${finalQty}, ${txns.length} txns${low}`);
  }
  console.log(`  ${PRODUCTS.length} products, ${txnTotal} stock transactions`);

  // 6. Report projections (reports DB) — derived from the same seeded ledger.
  await seedReports(reportsDb, seeded, createdBy, now);

  // 7. Audit log (audit DB) — one CREATE per product + one per stock transaction.
  await seedAudit(auditDb, seeded, createdBy, adminName, now);

  // 8. Notifications (audit DB — service overrides dbName) — templates + notifications.
  await seedNotifications(auditDb, seeded, createdBy, admin.email, now);

  // Final reconciliation guards.
  await reconcile(productsDb, inventoryDb, reportsDb);

  await client.close();
  console.log('Done.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
