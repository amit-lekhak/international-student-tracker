import { DataSourceOptions } from 'typeorm';
import { loadEnv } from './env.loader';
import { Agent, School, Program, User, Application } from '../entities';

loadEnv();

export function getDataSourceOptions(isTest = false): DataSourceOptions {
  const currentEnv = isTest || process.env.NODE_ENV === 'test';

  const databaseUrl = currentEnv
    ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    : process.env.DATABASE_URL;

  const defaultDbName = currentEnv
    ? process.env.POSTGRES_DB_TEST || 'student_tracker_test'
    : process.env.POSTGRES_DB || 'student_tracker';

  const baseConfig: Partial<DataSourceOptions> = {
    type: 'postgres',
    entities: [Agent, School, Program, User, Application],
    synchronize: process.env.NODE_ENV !== 'production', // auto-sync schema only in non-production
    logging: process.env.TYPEORM_LOGGING === 'true',
    extra: {
      max: parseInt(process.env.POSTGRES_POOL_SIZE || '10', 10),
      idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT_MS || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECT_TIMEOUT_MS || '5000', 10),
    },
  };

  if (databaseUrl && !databaseUrl.includes('undefined')) {
    return {
      ...baseConfig,
      type: 'postgres',
      url: databaseUrl,
      database: defaultDbName,
    } as DataSourceOptions;
  }

  return {
    ...baseConfig,
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: defaultDbName,
  } as DataSourceOptions;
}
