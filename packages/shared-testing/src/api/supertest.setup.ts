import supertest, { SuperTest } from 'supertest';
import type { Application } from 'express';
import { Db } from 'mongodb';

/**
 * Setup supertest for an Express application with test database integration
 *
 * @param app - Express application instance
 * @returns Test agent configured for the app
 */
export function setupSupertest(app: Application): SuperTest<Application> {
  return supertest(app);
}

export interface TestAppSetup {
  agent: SuperTest<Application>;
  db: Db;
  clearDB: () => Promise<void>;
}

/**
 * Create a complete test setup with database clearing
 *
 * @param app - Express application instance
 * @returns Object with agent and helper functions
 */
export async function createTestSetup(app: Application): Promise<TestAppSetup> {
  const agent = supertest(app);
  const db = await import('../helpers/db.helper').then((m) => m.getDatabase());

  if (!db) {
    throw new Error('Database not initialized. Call setupTestDatabase first.');
  }

  const clearDB = async (): Promise<void> => {
    await import('../helpers/db.helper').then((m) => m.clearDatabase());
  };

  return {
    agent,
    db,
    clearDB,
  };
}

/**
 * Test request helper that automatically clears database before each request
 * Useful for integration tests that need clean state
 *
 * @param app - Express application instance
 * @returns Configured supertest agent
 */
export function createCleanTestAgent(app: Application): SuperTest<Application> {
  return supertest.agent(app);
}
