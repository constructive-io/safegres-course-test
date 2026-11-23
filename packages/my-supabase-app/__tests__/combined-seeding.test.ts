import path from 'path';
import {
  getConnections,
  PgTestClient
} from 'supabase-test';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

const user1Id = '550e8400-e29b-41d4-a716-446655440001';
const user2Id = '550e8400-e29b-41d4-a716-446655440002';

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // 1. Load users from CSV
  await pg.loadCsv({
    'auth.users': path.join(__dirname, 'fixtures/users.csv')
  });

  // 2. Load base data from SQL fixture
  await pg.loadSql([
    path.join(__dirname, 'fixtures/pets-fixture.sql')
  ]);

  // 3. Add test-specific data with JSON
  await pg.loadJson({
    'pets.pets': [
      {
        name: 'Test Pet',
        breed: 'Hamster',
        owner_id: user1Id
      }
    ]
  });
});

afterAll(async () => await teardown());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db.afterEach());

it('combines multiple seeding strategies', async () => {
  db.setContext({
    role: 'authenticated',
    'request.jwt.claim.sub': user1Id
  });

  const result = await db.query(`
    SELECT * FROM pets.pets
    WHERE name = 'Test Pet' AND owner_id = $1
  `, [user1Id]);

  expect(result.rows).toHaveLength(1);
  expect(result.rows[0].breed).toBe('Hamster');
});
