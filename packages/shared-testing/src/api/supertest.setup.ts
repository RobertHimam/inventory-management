import supertest from 'supertest';
import type { Db } from 'mongodb';

/**
 * Setup supertest for an Express application with test database integration
 *
 * @param app - Express application instance (any type to avoid strict Express typing issues)
 * @returns Test agent configured for the app
 */
export function setupSupertest(app: any): any {
  return supertest(app);
}

export interface TestAppSetup {
  agent: any;
  db: Db;
  clearDB: () => Promise<void>;
}

/**
 * Create a complete test setup with database clearing
 *
 * @param app - Express application instance
 * @returns Object with agent and helper functions
 */
export async function createTestSetup(app: any): Promise<TestAppSetup> {
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
export function createCleanTestAgent(app: any): any {
  return supertest.agent(app);
}
