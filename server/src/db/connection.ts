import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';
import * as schema from './schema.js';

mkdirSync(dirname(config.DATABASE_PATH), { recursive: true });

const client = createClient({
  url: `file:${config.DATABASE_PATH}`,
});

export const db = drizzle(client, { schema });
export { client };
