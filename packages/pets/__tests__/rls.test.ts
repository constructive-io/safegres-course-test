import { getConnections, PgTestClient } from 'pgsql-test';

const user1 = '11111111-1111-1111-1111-111111111111';
const user2 = '22222222-2222-2222-2222-222222222222';
const user3 = '33333333-3333-3333-3333-333333333333';
const user4 = '44444444-4444-4444-4444-444444444444';
const user5 = '55555555-5555-5555-5555-555555555555';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // Insert test data as superuser
  await pg.query(`
    INSERT INTO pets.pets (name, species, age, owner_id) VALUES
    ('Public Pet', 'dog', 3, $1)
  `, [user1]);
});

afterAll(async () => await teardown?.());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db?.afterEach());

it('anonymous users can view all pets', async () => {
  // Switch to anonymous role
  db.setContext({ role: 'anonymous', 'jwt.claims.user_id': null });

  const result = await db.query('SELECT * FROM pets.pets');
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].name).toBe('Public Pet');
});

it('anonymous users cannot insert pets', async () => {
  db.setContext({ role: 'anonymous', 'jwt.claims.user_id': null });

  await expect(
    db.query(`
      INSERT INTO pets.pets (name, species, owner_id)
      VALUES ('Hacker Pet', 'cat', $1)
    `, [user2])
  ).rejects.toThrow(/permission denied/);
});

it('authenticated users can insert pets they own', async () => {
  // Switch to authenticated user
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': user3
  });

  await db.query(`
      INSERT INTO pets.pets (name, species, age, owner_id)
      VALUES ('My Pet', 'cat', 2, $1)
    `, [user3]);

  const result = await db.query('SELECT * FROM pets.pets WHERE name = $1', ['My Pet']);
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].owner_id).toBe(user3);
});

it('users cannot insert pets for other users', async () => {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': user4
  });

  await expect(
    db.query(`
        INSERT INTO pets.pets (name, species, owner_id)
        VALUES ('Not My Pet', 'bird', $1)
      `, [user5])
  ).rejects.toThrow(/new row violates row-level security policy/);
});

it('an authenticated role without a user claim cannot insert a pet', async () => {
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': null });

  await db.expectError(
    () => db.query(`
      INSERT INTO pets.pets (name, species, owner_id)
      VALUES ('No Claim', 'dog', $1)
    `, [user3]),
    { code: '42501', message: /new row violates row-level security policy/ }
  );
});
