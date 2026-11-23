import { vector } from '@electric-sql/pglite-pgvector';
import { getConnections } from 'pglite-test';

// Every suite deploys the full module, so register pgvector once and reuse it.
export const connect = () =>
  getConnections({
    pglite: {
      extensions: { vector },
      extensionSql: ['CREATE EXTENSION IF NOT EXISTS vector;']
    }
  });
