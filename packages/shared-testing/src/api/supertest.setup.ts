import supertest, { SuperTest, Test } from 'supertest';
import type { Express } from 'express';
import type { Db } from 'mongodb';

export function setupSupertest(app: Express): SuperTest<Test> {
  return supertest(app);
}

export interface TestAppSetup {
  agent: SuperTest<Test>;
  db: Db;
  clearDB: () => Promise<void>;
}

export async function createTestSetup(app: Express): Promise<TestAppSetup> {
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

export function createCleanTestAgent(app: Express): SuperTest<Test> {
  return supertest.agent(app);
}
