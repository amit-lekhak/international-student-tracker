import { DataSource } from 'typeorm';
import { getDataSourceOptions } from './database.config';

export const AppDataSource = new DataSource(getDataSourceOptions(false));
export const TestDataSource = new DataSource(getDataSourceOptions(true));
