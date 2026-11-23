import { getConnections, PgTestClient } from 'pgsql-test';

const alice = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const bob = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const charlie = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // Insert test data for multiple users as superuser
  await pg.query(`
    INSERT INTO pets.pets (name, species, age, owner_id) VALUES
    ('Alice Dog', 'dog', 3, $1),
    ('Alice Cat', 'cat', 2, $1),
    ('Bob Bird', 'bird', 1, $2),
    ('Charlie Fish', 'fish', 1, $3)
  `, [alice, bob, charlie]);
});

afterAll(async () => await teardown?.());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db?.afterEach());

it('both users can read every public listing', async () => {
  // Alice can see all pets
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  const aliceView = await db.query('SELECT name FROM pets.pets ORDER BY name');
  expect(aliceView.rows.length).toBe(4);

  // Bob can also see all pets
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': bob
  });

  const bobView = await db.query('SELECT name FROM pets.pets ORDER BY name');
  expect(bobView.rows.length).toBe(4);
});

it('users cannot update pets they do not own', async () => {
  // Bob tries to update Alice's dog
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': bob
  });

  const updateAttempt = await db.query(`
    UPDATE pets.pets
    SET name = 'Stolen Dog'
    WHERE name = 'Alice Dog'
  `);

  // No rows should be updated due to RLS
  expect(updateAttempt.rowCount).toBe(0);

  // Verify Alice's pet is unchanged
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  const check = await db.query(`
    SELECT name FROM pets.pets WHERE owner_id = $1 AND species = 'dog'
  `, [alice]);

  expect(check.rows[0].name).toBe('Alice Dog');
});

it('users cannot delete pets they do not own', async () => {
  // Charlie tries to delete Bob's bird
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': charlie
  });

  const deleteAttempt = await db.query(`
    DELETE FROM pets.pets WHERE name = 'Bob Bird'
  `);

  expect(deleteAttempt.rowCount).toBe(0);

  // Verify Bob's pet still exists
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': bob
  });

  const check = await db.query(`
    SELECT name FROM pets.pets WHERE owner_id = $1
  `, [bob]);

  expect(check.rows.length).toBe(1);
  expect(check.rows[0].name).toBe('Bob Bird');
});

it('applies the active user claim after each switch', async () => {
  // Alice adds a pet
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  await db.query(`
    INSERT INTO pets.pets (name, species, owner_id)
    VALUES ('Alice Rabbit', 'rabbit', $1)
  `, [alice]);

  // Switch to Bob and query his listings
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': bob
  });

  const bobContext = await db.query(`SELECT current_setting('jwt.claims.user_id') AS user_id`);
  expect(bobContext.rows[0].user_id).toBe(bob);

  const bobPets = await db.query(`
    SELECT name FROM pets.pets WHERE owner_id = $1
  `, [bob]);

  expect(bobPets.rows.length).toBe(1);
  expect(bobPets.rows[0].name).toBe('Bob Bird');

  // Switch to Charlie and query his listings
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': charlie
  });

  const charlieContext = await db.query(`SELECT current_setting('jwt.claims.user_id') AS user_id`);
  expect(charlieContext.rows[0].user_id).toBe(charlie);

  const charliePets = await db.query(`
    SELECT name FROM pets.pets WHERE owner_id = $1
  `, [charlie]);

  expect(charliePets.rows.length).toBe(1);
  expect(charliePets.rows[0].name).toBe('Charlie Fish');

  // Switch back to Alice - should see her new rabbit
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  const aliceContext = await db.query(`SELECT current_setting('jwt.claims.user_id') AS user_id`);
  expect(aliceContext.rows[0].user_id).toBe(alice);

  const alicePets = await db.query(`
    SELECT name FROM pets.pets WHERE owner_id = $1 ORDER BY name
  `, [alice]);

  expect(alicePets.rows.length).toBe(3);
  expect(alicePets.rows.map(r => r.name)).toEqual(['Alice Cat', 'Alice Dog', 'Alice Rabbit']);
});

it('batch updates only affect owned pets', async () => {
  // Bob tries to batch update all pets
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': bob
  });

  const batchUpdate = await db.query(`
    UPDATE pets.pets
    SET age = age + 1
    RETURNING name
  `);

  // Only Bob's pet should be updated
  expect(batchUpdate.rowCount).toBe(1);
  expect(batchUpdate.rows[0].name).toBe('Bob Bird');

  // Verify Alice's pets weren't updated
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  const aliceDog = await db.query(`
    SELECT age FROM pets.pets WHERE name = 'Alice Dog'
  `);

  expect(aliceDog.rows[0].age).toBe(3); // Still original age
});

it('batch deletes only affect owned pets', async () => {
  // Make sure both owners have a fish before the DELETE runs
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  await db.query(`
    INSERT INTO pets.pets (name, species, owner_id)
    VALUES ('Alice Goldfish', 'fish', $1)
  `, [alice]);

  // Charlie tries to delete all fish
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': charlie
  });

  const batchDelete = await db.query(`
    DELETE FROM pets.pets WHERE species = 'fish'
    RETURNING name
  `);

  expect(batchDelete.rows.map(row => row.name)).toEqual(['Charlie Fish']);

  // Verify Alice's fish still exists
  const aliceFish = await db.query(`
    SELECT name FROM pets.pets WHERE species = 'fish' AND owner_id = $1
  `, [alice]);

  expect(aliceFish.rows.length).toBe(1);
  expect(aliceFish.rows[0].name).toBe('Alice Goldfish');
});

it('users cannot insert pets for other users', async () => {
  // Bob tries to insert a pet for Alice
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': bob
  });

  await db.expectError(
    () => db.query(`
      INSERT INTO pets.pets (name, species, owner_id)
      VALUES ('Fake Pet', 'snake', $1)
    `, [alice]),
    { code: '42501', message: /new row violates row-level security policy/ }
  );

  // Verify Alice's pet count hasn't changed
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  const count = await db.query(`
    SELECT COUNT(*) as total FROM pets.pets WHERE owner_id = $1
  `, [alice]);

  expect(parseInt(count.rows[0].total)).toBe(2); // Still just Dog and Cat
});

it('anonymous users cannot modify any data', async () => {
  db.setContext({ role: 'anonymous', 'jwt.claims.user_id': null });

  await db.expectError(
    () => db.query(`
      INSERT INTO pets.pets (name, species, owner_id)
      VALUES ('Anonymous Pet', 'hamster', $1)
    `, [alice]),
    { code: '42501', message: /permission denied/ }
  );

  await db.expectError(
    () => db.query(`
      UPDATE pets.pets SET name = 'Hacked'
    `),
    { code: '42501', message: /permission denied/ }
  );

  await db.expectError(
    () => db.query(`
      DELETE FROM pets.pets
    `),
    { code: '42501', message: /permission denied/ }
  );
});
