import { PgTestClient } from 'pglite-test';

import { connect } from './connect';

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await connect());
});

afterAll(async () => await teardown());
beforeEach(async () => await pg.beforeEach());
afterEach(async () => await pg.afterEach());

it('ranks documents by cosine distance', async () => {
  await pg.query(
    `INSERT INTO search.documents (content, embedding) VALUES
       ('apple',  '[1, 0, 0]'),
       ('banana', '[0, 1, 0]'),
       ('cherry', '[0, 0, 1]')`
  );

  const nearest = await pg.one<{ content: string }>(
    `SELECT content FROM search.documents ORDER BY embedding <=> $1 LIMIT 1`,
    ['[0.9, 0.1, 0]']
  );

  expect(nearest.content).toBe('apple');
});
