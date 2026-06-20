import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(process.cwd(), '.env') });

import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
