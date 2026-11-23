import path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

const alice = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const bob = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // 1. Load base data from SQL fixture
  await pg.loadSql([
    path.join(__dirname, 'fixtures/pets-fixture.sql')
  ]);

  // 2. Add test-specific data with JSON
  await pg.loadJson({
    'pets.pets': [
      {
        name: 'Test Pet',
        species: 'hamster',
        age: 1,
        owner_id: alice
      }
    ]
  });
});

afterAll(async () => await teardown());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db.afterEach());

it('combines SQL and JSON seeding', async () => {
  db.setContext({ role: 'anonymous' });

  const result = await db.query(`
    SELECT * FROM pets.pets
    WHERE name = 'Test Pet'
  `);

  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].species).toBe('hamster');
});
