
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('.env.local not found, using default environment variables');
}

async function fixRLS() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to Supabase Postgres');

    const sqlFile = path.resolve(__dirname, 'fix-rls-update.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Applying RLS fix...');
    await client.query(sql);
    console.log('RLS fix applied successfully!');

  } catch (err) {
    console.error('Error applying RLS fix:', err);
  } finally {
    await client.end();
  }
}

fixRLS();
