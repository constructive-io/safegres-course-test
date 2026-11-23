import { getConnections, PgTestClient, seed } from 'supabase-test';

let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, teardown } = await getConnections({}, [seed.sqlfile(['deploy/pets_app.sql'])]));
});

afterAll(async () => { await teardown(); });
beforeEach(async () => { await db.beforeEach(); });
afterEach(async () => { await db.afterEach(); });

it('should insert a pet into the pets table', async () => {
  const pet = await db.one(
    `INSERT INTO pets.pets (name, breed) 
      VALUES ($1, $2) 
      RETURNING id, name, breed`,
    ['Fido', 'Labrador']
  );

  expect(pet.name).toBe('Fido');
  expect(pet.breed).toBe('Labrador');
});

it('starts with clean state', async () => {
  const result = await db.query('SELECT * FROM pets.pets');
  expect(result.rows).toHaveLength(0);
});
