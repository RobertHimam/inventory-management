import supertest from 'supertest';
import type { Express } from 'express';
import type { Db } from 'mongodb';

type SupertestAgent = ReturnType<typeof supertest>;

export function setupSupertest(app: Express): SupertestAgent {
  return supertest(app);
}

export interface TestAppSetup {
  agent: SupertestAgent;
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

export function createCleanTestAgent(app: Express): SupertestAgent {
  return supertest.agent(app);
}
