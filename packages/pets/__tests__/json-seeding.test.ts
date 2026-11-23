import { getConnections, PgTestClient } from 'pgsql-test';

const alice = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const bob = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // Seed test data using loadJson
  await pg.loadJson({
    'pets.pets': [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Buddy',
        species: 'dog',
        age: 3,
        owner_id: alice
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Whiskers',
        species: 'cat',
        age: 2,
        owner_id: alice
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Tweety',
        species: 'bird',
        age: 1,
        owner_id: bob
      }
    ]
  });
});

afterAll(async () => await teardown?.());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db?.afterEach());

it('has loaded all pets', async () => {
  db.setContext({ role: 'anonymous', 'jwt.claims.user_id': null });

  const result = await db.query('SELECT * FROM pets.pets ORDER BY name');
  expect(result.rows).toHaveLength(3);
  expect(result.rows[0].name).toBe('Buddy');
});

it('filters the public fixture by Alice’s owner ID', async () => {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': alice
  });

  const result = await db.query(`
    SELECT name FROM pets.pets
    WHERE owner_id = $1
    ORDER BY name
  `, [alice]);

  expect(result.rows).toHaveLength(2);
  expect(result.rows.map(r => r.name)).toEqual(['Buddy', 'Whiskers']);
});
