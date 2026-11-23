import path from 'path';
import { getConnections, PgTestClient } from 'pgsql-test';

const alice = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const bob = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // Load SQL fixture
  await pg.loadSql([
    path.join(__dirname, 'fixtures/pets-fixture.sql')
  ]);
});

afterAll(async () => await teardown?.());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db?.afterEach());

it('loads fixtures from SQL file', async () => {
  db.setContext({ role: 'anonymous', 'jwt.claims.user_id': null });

  const result = await db.query('SELECT * FROM pets.pets ORDER BY name');
  expect(result.rows).toHaveLength(5);
});

it('counts Alice’s seeded pets by species', async () => {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  const result = await db.query(`
    SELECT species, COUNT(*) as count
    FROM pets.pets
    WHERE owner_id = $1
    GROUP BY species
    ORDER BY species
  `, [alice]);

  expect(result.rows).toHaveLength(2);
  expect(result.rows[0]).toEqual({ species: 'cat', count: '1' });
  expect(result.rows[1]).toEqual({ species: 'dog', count: '1' });
});
