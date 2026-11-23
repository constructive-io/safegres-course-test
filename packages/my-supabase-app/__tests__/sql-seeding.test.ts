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
let user2: any;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // Create users
  user1 = await insertUser(pg, 'alice@example.com', '550e8400-e29b-41d4-a716-446655440001');
  user2 = await insertUser(pg, 'bob@example.com', '550e8400-e29b-41d4-a716-446655440002');
  await insertUser(pg, 'charlie@example.com', '550e8400-e29b-41d4-a716-446655440003');

  // Load SQL fixture
  await pg.loadSql([
    path.join(__dirname, 'fixtures/pets-fixture.sql')
  ]);
});

afterAll(async () => await teardown());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db.afterEach());

it('loads fixtures from SQL file', async () => {
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': user1.id
  });

  const result = await db.query('SELECT * FROM pets.pets WHERE owner_id = $1 ORDER BY name', [user1.id]);
  expect(result.rows).toHaveLength(2);
});

it('supports complex queries on seeded data', async () => {
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': user1.id
  });

  const result = await db.query(`
    SELECT breed, COUNT(*) as count
    FROM pets.pets
    WHERE owner_id = $1
    GROUP BY breed
    ORDER BY breed
  `, [user1.id]);

  expect(result.rows).toHaveLength(2);
  expect(result.rows[0].breed).toBe('Golden Retriever');
  expect(result.rows[1].breed).toBe('Persian');
});
