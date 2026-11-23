import { PgTestClient } from 'pglite-test';

import { connect } from './connect';

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await connect());
});

afterAll(async () => {
  await teardown();
});

beforeEach(async () => {
  await pg.beforeEach();
});

afterEach(async () => {
  await pg.afterEach();
});

it('deployed the pgpm module into PGlite', async () => {
  const { rows } = await pg.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'pets'"
  );
  expect(rows[0].n).toBe(1);
});

it('can insert and query pets', async () => {
  await pg.query(
    `INSERT INTO app.pets (name, species, age, user_id) VALUES ($1, $2, $3, $4)`,
    ['Buddy', 'dog', 3, '11111111-1111-1111-1111-111111111111']
  );

  const pet = await pg.one<{ name: string; species: string; age: number }>(
    'SELECT name, species, age FROM app.pets'
  );

  expect(pet.name).toBe('Buddy');
  expect(pet.species).toBe('dog');
  expect(pet.age).toBe(3);
});

it('starts with clean state', async () => {
  const { rows } = await pg.query<{ n: number }>(
    'SELECT count(*)::int AS n FROM app.pets'
  );
  expect(rows[0].n).toBe(0);
});
