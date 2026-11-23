import { pgTable, serial, text, integer, boolean } from 'drizzle-orm/pg-core';

export const pets = pgTable('pets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  species: text('species').notNull(),
  age: integer('age'),
  userId: text('user_id').notNull(),
  adopted: boolean('adopted').default(false)
});
