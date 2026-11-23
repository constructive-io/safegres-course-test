import { getConnections, PgTestClient } from 'pgsql-test';

const alice = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());
});

afterAll(async () => await teardown?.());

beforeEach(async () => {
  await db.beforeEach();

  // Seed fresh data for each test
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });
  await db.loadJson({
    'pets.pets': [
      { name: 'Test Dog', species: 'dog', age: 3, owner_id: alice },
      { name: 'Test Cat', species: 'cat', age: 2, owner_id: alice }
    ]
  });
});

afterEach(async () => await db?.afterEach());

it('scenario 1 - can modify seeded data', async () => {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  await db.query(`
    UPDATE pets.pets SET age = age + 1 WHERE name = 'Test Dog'
  `);

  const result = await db.query(`
    SELECT age FROM pets.pets WHERE name = 'Test Dog'
  `);

  expect(result.rows[0].age).toBe(4);
});

it('scenario 2 - starts with clean data', async () => {
  // Previous test's UPDATE was rolled back
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  const result = await db.query(`
    SELECT age FROM pets.pets WHERE name = 'Test Dog'
  `);

  expect(result.rows[0].age).toBe(3); // Back to original
});
