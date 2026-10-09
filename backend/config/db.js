const { Pool } = require('pg');

// Support both connection string (Neon, Supabase, etc.) and individual credentials
const connectionString = process.env.DATABASE_URL;
const requiresSsl = process.env.DB_SSL === 'true' ||
  (connectionString && new URL(connectionString).searchParams.get('sslmode') === 'require');

const poolConfig = connectionString
  ? {
      connectionString,
      ...(requiresSsl && { ssl: { rejectUnauthorized: false } })
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'crprs_db',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT || 5432),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected database client error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  getClient: () => pool.connect(),
  end: () => pool.end(),
  pool,
};
