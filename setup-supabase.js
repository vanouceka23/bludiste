#!/usr/bin/env node
/**
 * Supabase Setup Script
 * 
 * Spuštění:
 *   node setup-supabase.js "postgresql://postgres:HESLO@db.XXXX.supabase.co:5432/postgres?sslmode=require"
 * 
 * Nebo postup bez scriptu:
 * 1. Jdi na https://app.supabase.com/project/[tvoj-project-id]/sql/new
 * 2. Vlož obsah souboru schema.sql
 * 3. Klikni "Run"
 */

const { Pool } = require('pg');
const fs = require('fs');

const connectionString = process.argv[2];

if (!connectionString) {
  console.log(`
❌ Connection string chybí!

Použití:
  node setup-supabase.js "postgresql://postgres:HESLO@db.xxx.supabase.co:5432/postgres?sslmode=require"

Kde Connection String najdeš:
  1. Jdi na https://app.supabase.com
  2. Vyber svůj projekt
  3. Settings > Database > Connection String > Copy
  4. Vlož zde (mezi uvozovky)
  `);
  process.exit(1);
}

async function setupDatabase() {
  const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();

  try {
    console.log('📡 Připojuji se k Supabase...');
    
    // Otestuj připojení
    const testResult = await client.query('SELECT NOW()');
    console.log('✅ Připojení úspěšné!');
    
    // Načti SQL schema
    const schema = fs.readFileSync(__dirname + '/schema.sql', 'utf8');
    
    // Spusť schéma
    console.log('🔨 Vytvářím tabulku users...');
    await client.query(schema);
    
    console.log('✅ Databáze úspěšně nastavena!');
    
    // Zkontroluj tabulky
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Vytvořené tabulky:');
    result.rows.forEach(r => {
      console.log(`   - ${r.table_name}`);
    });
    
    console.log('\n✨ Hotovo! Teď si můžeš nastavit .env v projektu:');
    console.log('   DATABASE_URL=' + connectionString);
    
  } catch (error) {
    console.error('❌ Chyba:', error.message);
    console.error('\nNapověda:');
    console.error('  - Zkontroluj, že Connection String je správný');
    console.error('  - Zkontroluj heslo (schema.sql by měl existovat v adresáři)');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
