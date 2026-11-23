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

  // Insert users into auth.users using pg client (superuser)
  user1 = await insertUser(pg, 'alice@example.com', '550e8400-e29b-41d4-a716-446655440001');
  user2 = await insertUser(pg, 'bob@example.com', '550e8400-e29b-41d4-a716-446655440002');
});

afterAll(async () => await teardown());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db.afterEach());

it('users exist in auth.users', async () => {
  const result = await pg.query('SELECT id, email FROM auth.users ORDER BY email');

  expect(result.rows).toHaveLength(2);
  expect(result.rows[0].email).toBe('alice@example.com');
  expect(result.rows[1].email).toBe('bob@example.com');
});

it('authenticated user can insert their own pet', async () => {
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': user1.id
  });

  const pet = await db.one(
    `INSERT INTO pets.pets (name, breed, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, breed, owner_id`,
    ['Fido', 'Labrador', user1.id]
  );

  expect(pet.name).toBe('Fido');
  expect(pet.owner_id).toBe(user1.id);
});
