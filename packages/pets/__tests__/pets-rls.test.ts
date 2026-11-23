import { PgTestClient } from 'pglite-test';

import { connect } from './connect';

const user1 = '11111111-1111-1111-1111-111111111111';
const user2 = '22222222-2222-2222-2222-222222222222';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, teardown } = await connect());

  // Seed as superuser (bypasses RLS by not switching role)
  await pg.query(
    `INSERT INTO app.pets (name, species, user_id)
     VALUES ('User 1 Pet', 'dog', $1), ('User 2 Pet', 'cat', $2)`,
    [user1, user2]
  );
});

afterAll(async () => await teardown());
beforeEach(async () => await pg.beforeEach());
afterEach(async () => await pg.afterEach());

it('an authenticated user sees only their own pets', async () => {
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': user1 });

  const mine = await db.many<{ name: string }>('SELECT name FROM app.pets');
  expect(mine).toHaveLength(1);
  expect(mine[0].name).toBe('User 1 Pet');
});

it('a user cannot insert a row they do not own (WITH CHECK)', async () => {
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': user1 });

  await db.expectError(
    () => db.one(
      `INSERT INTO app.pets (name, species, user_id) VALUES ($1, $2, $3) RETURNING id`,
      ['Not Mine', 'fish', user2]
    ),
    /violates row-level security policy/
  );
});

it('users cannot update each other’s pets', async () => {
  // user1 tries to change user2's pet
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': user1 });
  await db.query(`UPDATE app.pets SET species = 'hacked' WHERE user_id = $1`, [user2]);

  // verify user2's row is untouched
  db.setContext({ role: 'authenticated', 'jwt.claims.user_id': user2 });
  const theirs = await db.one<{ species: string }>('SELECT species FROM app.pets');
  expect(theirs.species).not.toBe('hacked');
});
