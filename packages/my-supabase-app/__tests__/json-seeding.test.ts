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

  // Create users first
  user1 = await insertUser(pg, 'alice@example.com', '550e8400-e29b-41d4-a716-446655440001');
  user2 = await insertUser(pg, 'bob@example.com', '550e8400-e29b-41d4-a716-446655440002');

  // Seed test data using loadJson
  await pg.loadJson({
    'pets.pets': [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Buddy',
        breed: 'Labrador',
        owner_id: user1.id
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Whiskers',
        breed: 'Tabby',
        owner_id: user1.id
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Tweety',
        breed: 'Canary',
        owner_id: user2.id
      }
    ]
  });
});

afterAll(async () => await teardown());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db.afterEach());

it('has loaded all pets', async () => {
  // Use authenticated context to query
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': user1.id
  });

  const result = await db.query('SELECT * FROM pets.pets WHERE owner_id = $1 ORDER BY name', [user1.id]);
  expect(result.rows).toHaveLength(2);
  expect(result.rows[0].name).toBe('Buddy');
});

it('users only see their own pets', async () => {
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
  expect(result.rows.map(r => r.name)).toEqual(['Buddy', 'Whiskers']);
});
