import { drizzle } from 'drizzle-orm/node-postgres';
import { getConnections, PgTestClient } from 'drizzle-orm-test';
import { pets } from '../src/schema';
import { eq } from 'drizzle-orm';

const user1 = '11111111-1111-1111-1111-111111111111';
const user2 = '22222222-2222-2222-2222-222222222222';

let pg: PgTestClient;
let db: PgTestClient;
let teardown: () => Promise<void>;

beforeAll(async () => {
  ({ pg, db, teardown } = await getConnections());

  // Seed test data as superuser (bypasses RLS)
  await pg.query(`
    INSERT INTO pets (name, species, age, user_id)
    VALUES ('User 1 Pet', 'dog', 3, '${user1}'),
           ('User 2 Pet', 'cat', 2, '${user2}');
  `);
});

afterAll(async () => await teardown());
beforeEach(async () => await db.beforeEach());
afterEach(async () => await db.afterEach());

it('anonymous users can view all pets', async () => {
  // Set context on db client
  db.setContext({ role: 'anonymous' });

  // Use standard Drizzle pattern
  const drizzleDb = drizzle(db.client);

  const result = await drizzleDb.select().from(pets);
  expect(result).toHaveLength(2);
});

it('anonymous users cannot insert pets', async () => {
  db.setContext({ role: 'anonymous' });
  const drizzleDb = drizzle(db.client);

  await expect(
    drizzleDb.insert(pets).values({
      name: 'Hacker Pet',
      species: 'cat',
      userId: user1
    })
  ).rejects.toThrow();
});

it('authenticated users can insert pets they own', async () => {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': user1
  });

  const drizzleDb = drizzle(db.client);

  await drizzleDb.insert(pets).values({
    name: 'My New Pet',
    species: 'bird',
    age: 1,
    userId: user1
  });

  const result = await drizzleDb
    .select()
    .from(pets)
    .where(eq(pets.name, 'My New Pet'));

  expect(result).toHaveLength(1);
  expect(result[0].userId).toBe(user1);
});

it('users cannot insert pets for other users', async () => {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': user1
  });

  const drizzleDb = drizzle(db.client);

  await expect(
    drizzleDb.insert(pets).values({
      name: 'Not My Pet',
      species: 'fish',
      userId: user2  // Trying to insert for user2
    })
  ).rejects.toThrow();
});

it('users can update their own pets', async () => {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': user1
  });

  const drizzleDb = drizzle(db.client);

  // Update user1's pet
  await drizzleDb
    .update(pets)
    .set({ adopted: true })
    .where(eq(pets.userId, user1));

  const result = await drizzleDb
    .select()
    .from(pets)
    .where(eq(pets.userId, user1));

  expect(result[0].adopted).toBe(true);
});

it('users cannot update other users pets', async () => {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': user1
  });

  const drizzleDb = drizzle(db.client);

  // Try to update user2's pet - should affect 0 rows
  const changed = await drizzleDb
    .update(pets)
    .set({ adopted: true })
    .where(eq(pets.userId, user2))
    .returning();

  expect(changed).toHaveLength(0);
  // Query user2's pet to verify it wasn't changed
  const user2Pets = await drizzleDb
    .select()
    .from(pets)
    .where(eq(pets.userId, user2));

  expect(user2Pets[0].adopted).toBe(false);
});

it('users can delete their own pets', async () => {
  db.setContext({
    role: 'authenticated',
    'jwt.claims.user_id': user1
  });

  const drizzleDb = drizzle(db.client);

  await drizzleDb
    .delete(pets)
    .where(eq(pets.userId, user1));

  const result = await drizzleDb
    .select()
    .from(pets)
    .where(eq(pets.userId, user1));

  expect(result).toHaveLength(0);
});

describe('as user 1', () => {
  beforeEach(() => {
    db.setContext({
      role: 'authenticated',
      'jwt.claims.user_id': user1
    });
  });

  it('can update only user 1 pets', async () => {
    const drizzleDb = drizzle(db.client);

    const result = await drizzleDb
      .update(pets)
      .set({ adopted: true })
      .returning({ userId: pets.userId });

    expect(result).toEqual([{ userId: user1 }]);
  });
});

describe('as user 2', () => {
  beforeEach(() => {
    db.setContext({
      role: 'authenticated',
      'jwt.claims.user_id': user2
    });
  });

  it('can update only user 2 pets', async () => {
    const drizzleDb = drizzle(db.client);

    const result = await drizzleDb
      .update(pets)
      .set({ adopted: true })
      .returning({ userId: pets.userId });

    expect(result).toEqual([{ userId: user2 }]);
  });
});
