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

afterAll(async () => await teardown());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db.afterEach());

it('users only see all pets (not just their own)', async () => {
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

it('users cannot update other users pets', async () => {
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

it('users cannot delete other users pets', async () => {
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

it('handles rapid user switching correctly', async () => {
  // Alice adds a pet
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  await db.query(`
    INSERT INTO pets.pets (name, species, owner_id)
    VALUES ('Alice Rabbit', 'rabbit', $1)
  `, [alice]);

  // Switch to Bob - should not see Alice's new pet in his owned pets
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': bob
  });

  const bobPets = await db.query(`
    SELECT name FROM pets.pets WHERE owner_id = $1
  `, [bob]);

  expect(bobPets.rows.length).toBe(1);
  expect(bobPets.rows[0].name).toBe('Bob Bird');

  // Switch to Charlie - should not see Alice's or Bob's pets in owned
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': charlie
  });

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
  // Charlie tries to delete all fish
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': charlie
  });

  const batchDelete = await db.query(`
    DELETE FROM pets.pets WHERE species = 'fish'
  `);

  // Only Charlie's fish should be deleted
  expect(batchDelete.rowCount).toBe(1);

  // Insert another fish owned by Alice
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  await db.query(`
    INSERT INTO pets.pets (name, species, owner_id)
    VALUES ('Alice Goldfish', 'fish', $1)
  `, [alice]);

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

  const failurePoint = 'insert_other_user';
  await db.savepoint(failurePoint);

  await expect(
    db.query(`
      INSERT INTO pets.pets (name, species, owner_id)
      VALUES ('Fake Pet', 'snake', $1)
    `, [alice])
  ).rejects.toThrow(/new row violates row-level security policy/);

  await db.rollback(failurePoint);

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
  db.setContext({ role: 'anonymous' });

  const insertPoint = 'anonymous_insert';
  await db.savepoint(insertPoint);

  await expect(
    db.query(`
      INSERT INTO pets.pets (name, species, owner_id)
      VALUES ('Anonymous Pet', 'hamster', $1)
    `, [alice])
  ).rejects.toThrow(/permission denied/);

  await db.rollback(insertPoint);

  const updatePoint = 'anonymous_update';
  await db.savepoint(updatePoint);
  await expect(
    db.query(`
      UPDATE pets.pets SET name = 'Hacked'
    `)
  ).rejects.toThrow(/permission denied/);
  await db.rollback(updatePoint);

  const deletePoint = 'anonymous_delete';
  await db.savepoint(deletePoint);
  await expect(
    db.query(`
      DELETE FROM pets.pets
    `)
  ).rejects.toThrow(/permission denied/);
  await db.rollback(deletePoint);
});
