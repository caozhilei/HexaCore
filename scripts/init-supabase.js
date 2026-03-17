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

async function initSupabase() {
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

    const migrationFile = path.resolve(__dirname, '../supabase/migrations/20260228000000_init_schema.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('Applying migration...');
    await client.query(sql);
    console.log('Migration applied successfully!');

  } catch (err) {
    console.error('Error initializing Supabase:', err);
  } finally {
    await client.end();
  }
}

initSupabase();
