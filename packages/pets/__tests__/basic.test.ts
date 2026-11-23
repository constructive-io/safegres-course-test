import { getConnections, PgTestClient } from 'pgsql-test';

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  // Automatically discovers and deploys your module
  ({ pg, teardown } = await getConnections());
});

afterAll(() => teardown());
beforeEach(() => pg.beforeEach());
afterEach(() => pg.afterEach());

it('can insert and query pets', async () => {
  await pg.query(`
    INSERT INTO pets.pets (name, species, age)
    VALUES ('Buddy', 'dog', 3)
  `);

  const result = await pg.query(
    'SELECT * FROM pets.pets WHERE name = $1',
    ['Buddy']
  );

  console.log('Query result:', result.rows[0]);

  expect(result.rows[0].species).toBe('dog');
  expect(result.rows[0].age).toBe(3);
  expect(result.rows[0].adopted).toBe(false);
});
