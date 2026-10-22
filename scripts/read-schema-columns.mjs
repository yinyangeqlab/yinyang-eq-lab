// Read-only helper for the migration checker. No database, credentials or network.
import * as schema from '../db/schema.ts';
import {isTable} from 'drizzle-orm';
import {getTableConfig} from 'drizzle-orm/sqlite-core';
console.log(JSON.stringify(Object.values(schema).filter(isTable).map(table => {
  const config = getTableConfig(table);
  return {name: config.name, columns: config.columns.map(column => ({name: column.name, type: column.getSQLType().toUpperCase()}))};
})));
