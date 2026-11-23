import { getConnections, PgTestClient } from 'pgsql-test';

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
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

it('can insert and query pets', async () => {
  await pg.query(`
    INSERT INTO pets.pets (name, species, age)
    VALUES ('Buddy', 'dog', 3)
  `);

  const result = await pg.query('SELECT * FROM pets.pets WHERE name = $1', ['Buddy']);
  expect(result.rows[0].species).toBe('dog');
  expect(result.rows[0].age).toBe(3);
  expect(result.rows[0].adopted).toBe(false);
});

it('starts with clean state', async () => {
  const result = await pg.query('SELECT * FROM pets.pets');
  expect(result.rows).toHaveLength(0);
});
