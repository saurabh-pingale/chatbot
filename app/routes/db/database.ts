import { DataSource } from 'typeorm';
import { Store } from './entity/Store';
import pkg from "pg-connection-string";
const { parse } = pkg;

export const createDatabaseConnection = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined in the environment variables.");
  }

  const parsedUrl = parse(databaseUrl);

  const host = parsedUrl.host || '';
  const port = parsedUrl.port ? parseInt(parsedUrl.port) : 5432;
  const username = parsedUrl.user || '';
  const password = parsedUrl.password || ''; 
  const database = parsedUrl.database || ''; 

  if (!host || !database) {
    throw new Error("Missing essential database connection properties (host or database).");
  }

  const dataSource = new DataSource({
    type: 'postgres',
    host: host,
    port: port,
    username: username,
    password: password,
    database: database,
    synchronize: false, 
    entities: [Store],
    ssl: { rejectUnauthorized: false }, 
    logging: true,
  });

  await dataSource.initialize();

  return dataSource;
};
