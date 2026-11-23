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

  // Create user once
  user1 = await insertUser(pg, 'alice@example.com', '550e8400-e29b-41d4-a716-446655440001');
});

afterAll(async () => await teardown());

beforeEach(async () => {
  await db.beforeEach();

  // Seed fresh data for each test
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': user1.id
  });

  await db.loadJson({
    'pets.pets': [
      { name: 'Test Dog', breed: 'Poodle', owner_id: user1.id },
      { name: 'Test Cat', breed: 'Maine Coon', owner_id: user1.id }
    ]
  });
});

afterEach(async () => await db.afterEach());

it('scenario 1 - can modify seeded data', async () => {
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': user1.id
  });

  await db.query(`
    UPDATE pets.pets SET breed = 'Poodle Mix' WHERE name = 'Test Dog' AND owner_id = $1
  `, [user1.id]);

  const result = await db.query(`
    SELECT breed FROM pets.pets WHERE name = 'Test Dog' AND owner_id = $1
  `, [user1.id]);

  expect(result.rows[0].breed).toBe('Poodle Mix');
});

it('scenario 2 - starts with clean data', async () => {
  // Previous test's UPDATE was rolled back
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': user1.id
  });

  const result = await db.query(`
    SELECT breed FROM pets.pets WHERE name = 'Test Dog' AND owner_id = $1
  `, [user1.id]);

  expect(result.rows[0].breed).toBe('Poodle'); // Back to original
});
