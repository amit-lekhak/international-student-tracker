import { Client } from 'pg';
import { loadEnv } from '../config/env.loader';

loadEnv();

export async function ensureDatabases(): Promise<void> {
  const isTest = process.env.NODE_ENV === 'test';
  const connectionUrl = isTest
    ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

  let client: Client;

  if (connectionUrl && !connectionUrl.includes('undefined')) {
    try {
      const parsed = new URL(connectionUrl);
      client = new Client({
        host: parsed.hostname,
        port: parseInt(parsed.port || '5432', 10),
        user: parsed.username,
        password: parsed.password,
        database: 'postgres',
        ssl:
          parsed.searchParams.get('sslmode') === 'require'
            ? { rejectUnauthorized: false }
            : undefined,
      });
    } catch {
      client = new Client({
        connectionString: connectionUrl,
      });
    }
  } else {
    const host = process.env.POSTGRES_HOST || 'localhost';
    const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
    const user = process.env.POSTGRES_USER || 'postgres';
    const password = process.env.POSTGRES_PASSWORD || 'postgres';

    client = new Client({
      host,
      port,
      user,
      password,
      database: 'postgres', // Connect to default maintenance database
    });
  }

  try {
    await client.connect();

    const databasesToEnsure = [
      process.env.POSTGRES_DB || 'student_tracker',
      process.env.POSTGRES_DB_TEST || 'student_tracker_test',
    ];

    for (const dbName of databasesToEnsure) {
      const checkRes = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);

      if (checkRes.rowCount === 0) {
        console.log(`[DB Bootstrap] Database "${dbName}" not found. Creating...`);
        try {
          await client.query(`CREATE DATABASE "${dbName}"`);
          console.log(`[DB Bootstrap] Database "${dbName}" created successfully.`);
        } catch (createErr: any) {
          console.warn(
            `[DB Bootstrap] Warning: Could not create "${dbName}" (${createErr.message}). Assuming managed database.`,
          );
        }
      } else {
        console.log(`[DB Bootstrap] Database "${dbName}" already exists.`);
      }
    }
  } catch (error: any) {
    console.warn(
      '[DB Bootstrap] Notice: Skipping auto-create check (maintenance DB inaccessible or managed host):',
      error.message || error,
    );
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore disconnect errors
    }
  }
}

// Allow direct CLI invocation
if (require.main === module) {
  ensureDatabases()
    .then(() => {
      console.log('[DB Bootstrap] Database initialization complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[DB Bootstrap] Failed:', err);
      process.exit(1);
    });
}
