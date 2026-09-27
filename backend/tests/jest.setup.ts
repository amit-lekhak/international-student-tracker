import * as dotenv from 'dotenv';
import * as path from 'path';

process.env.NODE_ENV = 'test';
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
