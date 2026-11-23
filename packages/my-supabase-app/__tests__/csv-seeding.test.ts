import path from 'path';
import {
  getConnections,
  PgTestClient,
  insertUser
} from 'supabase-test';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

let user1: any;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // Create users
  user1 = await insertUser(pg, 'alice@example.com', '550e8400-e29b-41d4-a716-446655440001');
  await insertUser(pg, 'bob@example.com', '550e8400-e29b-41d4-a716-446655440002');
  await insertUser(pg, 'charlie@example.com', '550e8400-e29b-41d4-a716-446655440003');

  // Load CSV data
  await pg.loadCsv({
    'pets.pets': path.join(__dirname, 'fixtures/pets.csv')
  });
});

afterAll(async () => await teardown());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db.afterEach());

it('loads CSV data correctly', async () => {
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': user1.id
  });

  const result = await db.query('SELECT * FROM pets.pets WHERE owner_id = $1 ORDER BY name', [user1.id]);
  expect(result.rows).toHaveLength(2);
  expect(result.rows[0].name).toBe('Rocky');
});

it('CSV data works with RLS policies', async () => {
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': user1.id
  });

  const result = await db.query(`
    SELECT name FROM pets.pets
    WHERE owner_id = $1
    ORDER BY name
  `, [user1.id]);

  expect(result.rows).toHaveLength(2);
  expect(result.rows.map(r => r.name)).toEqual(['Rocky', 'Shadow']);
});
