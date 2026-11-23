import { getConnections, PgTestClient } from 'supabase-test';

let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections());
});

afterAll(async () => { await teardown(); });
beforeEach(async () => { await pg.beforeEach(); });
afterEach(async () => { await pg.afterEach(); });

it('should insert a pet into the pets table', async () => {
  const pet = await pg.one(
    `INSERT INTO pets.pets (name, breed) 
      VALUES ($1, $2) 
      RETURNING id, name, breed`,
    ['Fido', 'Labrador']
  );

  expect(pet.name).toBe('Fido');
  expect(pet.breed).toBe('Labrador');
});

it('starts with clean state', async () => {
  const result = await pg.query('SELECT * FROM pets.pets');
  expect(result.rows).toHaveLength(0);
});
