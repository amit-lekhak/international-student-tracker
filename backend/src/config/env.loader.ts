import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

let envLoaded = false;

export function loadEnv(forceReload = false): void {
  if (envLoaded && !forceReload) return;

  const nodeEnv = process.env.NODE_ENV || 'development';
  const targetEnvFile = nodeEnv === 'test' ? '.env.test' : '.env';

  const potentialPaths = [
    path.resolve(process.cwd(), targetEnvFile),
    path.resolve(__dirname, `../../${targetEnvFile}`),
    path.resolve(__dirname, `../../../${targetEnvFile}`),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
  ];

  for (const envPath of potentialPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }

  envLoaded = true;
}

// Auto-load on import
loadEnv();
