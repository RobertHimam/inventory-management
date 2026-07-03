#!/usr/bin/env node
// Direct MongoDB seed — no running services required.
// Usage: MONGODB_URI=mongodb://... node scripts/seed-mongo.js
// Defaults to docker-compose MongoDB.

'use strict';

/* eslint-disable no-console, @typescript-eslint/no-var-requires --
   Node CLI seed script: console is the intended output, require is CJS. */

const { MongoClient } = require('mongodb');

const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://admin:admin123@localhost:27017/auth?authSource=admin';
const BCRYPT_ROUNDS = 10;

// Pure JS bcrypt-compatible hash via Node crypto (avoids native deps).
// We use the REST approach: call auth-service container instead.
// But for standalone use we shell out to node -e with bcryptjs if available,
// otherwise fall back to a Docker exec approach.
//
// Simplest: just require bcryptjs (pure JS, no native compilation).

let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  try {
    bcrypt = require('bcrypt');
  } catch {
    console.error('Install bcryptjs: pnpm add -g bcryptjs  or  npm i -g bcryptjs');
    process.exit(1);
  }
}

const USERS = [
  { email: 'admin@example.com', password: 'admin123', username: 'admin', role: 'ADMIN' },
  { email: 'user@example.com', password: 'user123', username: 'user', role: 'USER' },
];

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const users = db.collection('users');

  console.log(`Connected to ${MONGODB_URI}`);
  console.log('Seeding users...');

  for (const u of USERS) {
    const existing = await users.findOne({ email: u.email });
    if (existing) {
      console.log(`  skipped: ${u.email} already exists`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    const now = new Date();
    await users.insertOne({
      email: u.email,
      username: u.username,
      passwordHash,
      role: u.role,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`  created: ${u.email} (${u.role})`);
  }

  await client.close();
  console.log('Done.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
