import { logger } from '@inventory/shared-logger';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

let mongod: MongoMemoryServer | null = null;
let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Teardown test database and cleanup resources
 */
export async function teardownTestDatabase(): Promise<void> {
  try {
    if (client) {
      await client.close();
      client = null;
    }
    if (mongod) {
      await mongod.stop();
      mongod = null;
    }
    db = null;
  } catch (error) {
    logger.error('Error during database teardown:', error);
    throw error;
  }
}

/**
 * Setup test database using MongoDB Memory Server
 * This provides an in-memory MongoDB instance for integration tests
 */
export async function setupTestDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    client = new MongoClient(uri);
    await client.connect();

    db = client.db('test_db');
    return db;
  } catch (error) {
    await teardownTestDatabase();
    throw error;
  }
}

/**
 * Clear all collections in the test database
 */
export async function clearDatabase(): Promise<void> {
  if (!db) {
    throw new Error('Database not initialized. Call setupTestDatabase first.');
  }

  const collections = await db.listCollections().toArray();

  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({});
  }
}

/**
 * Get the database instance (useful for custom queries in tests)
 */
export function getDatabase(): Db | null {
  return db;
}

/**
 * Check if test database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return db !== null && client !== null;
}
