const fs = require('fs');
require('dotenv').config();
const { Pool } = require('pg');

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log('📡 Připojuji se k Supabase...');
    
    // Načti SQL schema
    const schema = fs.readFileSync('./schema.sql', 'utf8');
    
    // Spusť schéma
    console.log('🔨 Vytvářím tabulku users...');
    await client.query(schema);
    
    console.log('✅ Databáze úspěšně nastavena!');
    console.log('\nDatabáze informace:');
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Tabulky:', result.rows.map(r => r.table_name).join(', '));
    
  } catch (error) {
    console.error('❌ Chyba:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
