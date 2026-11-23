import path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

const alice = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // Load CSV data
  await pg.loadCsv({
    'pets.pets': path.join(__dirname, 'fixtures/pets.csv')
  });
});

afterAll(async () => await teardown?.());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db?.afterEach());

it('loads CSV data correctly', async () => {
  db.setContext({ role: 'anonymous', 'jwt.claims.user_id': null });

  const result = await db.query('SELECT * FROM pets.pets ORDER BY name');
  expect(result.rows).toHaveLength(4);
  expect(result.rows[0].name).toBe('Bubbles');
});

it('finds Alice’s two listings in the CSV fixture', async () => {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  const result = await db.query(`
    SELECT name FROM pets.pets
    WHERE owner_id = $1
    ORDER BY name
  `, [alice]);

  expect(result.rows).toHaveLength(2);
  expect(result.rows.map(r => r.name)).toEqual(['Rocky', 'Shadow']);
});
