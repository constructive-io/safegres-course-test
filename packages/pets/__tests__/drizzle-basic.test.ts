import { eq, and, gte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { getConnections, PgTestClient } from 'drizzle-orm-test';
import { pets } from '../src/schema';

let db: PgTestClient;
let pg: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ db, pg, teardown } = await getConnections());
});

afterAll(async () => { await teardown(); });

beforeEach(async () => { await pg.beforeEach(); });
afterEach(async () => { await pg.afterEach(); });

it('can insert and query pets with Drizzle', async () => {
  const drizzleDb = drizzle(pg.client);

  // Insert with type-safe values
  await drizzleDb.insert(pets).values({
    name: 'Buddy',
    species: 'dog',
    age: 3, userId: 'test-owner'
  });

  // Query with type-safe results
  const result = await drizzleDb.select().from(pets);
  expect(result).toHaveLength(1);
  expect(result[0].name).toBe('Buddy');
  expect(result[0].species).toBe('dog');
  expect(result[0].age).toBe(3);
  expect(result[0].adopted).toBe(false);
});

it('starts with clean state', async () => {
  const drizzleDb = drizzle(pg.client);

  const result = await drizzleDb.select().from(pets);
  expect(result).toHaveLength(0);
});

it('can filter pets with conditions', async () => {
  const drizzleDb = drizzle(pg.client);

  // Insert test data
  await drizzleDb.insert(pets).values([
    { name: 'Max', species: 'dog', age: 5, userId: 'test-owner' },
    { name: 'Luna', species: 'cat', age: 2, userId: 'test-owner' },
    { name: 'Charlie', species: 'dog', age: 7, userId: 'test-owner' }
  ]);

  // Query with filters
  const dogs = await drizzleDb
    .select()
    .from(pets)
    .where(eq(pets.species, 'dog'));

  expect(dogs).toHaveLength(2);

  // Query with multiple conditions
  const oldDogs = await drizzleDb
    .select()
    .from(pets)
    .where(and(
      eq(pets.species, 'dog'),
      gte(pets.age, 6)
    ));

  expect(oldDogs).toHaveLength(1);
  expect(oldDogs[0].name).toBe('Charlie');
});
