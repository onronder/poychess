import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('rooms', {
  code: text('code').primaryKey(), whiteToken: text('white_token').notNull(), blackToken: text('black_token'),
  whiteName: text('white_name').notNull(), blackName: text('black_name'),
  moves: text('moves').notNull().default('[]'), status: text('status').notNull().default('waiting'), result: text('result'),
  whiteMs: integer('white_ms').notNull(), blackMs: integer('black_ms').notNull(), increment: integer('increment').notNull().default(0),
  updatedAt: integer('updated_at').notNull(), expiresAt: integer('expires_at').notNull(), version: integer('version').notNull().default(0), drawOffer: text('draw_offer'),
  whiteHintCount: integer('white_hint_count').notNull().default(0), blackHintCount: integer('black_hint_count').notNull().default(0),
  whiteHintAt: integer('white_hint_at').notNull().default(0), blackHintAt: integer('black_hint_at').notNull().default(0),
});
