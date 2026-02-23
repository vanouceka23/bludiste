const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Vytvoř connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrateData() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Spuštění migrace dat...');

    // Načti JSON databázi
    const dbPath = path.join(__dirname, '../database.json');
    if (!fs.existsSync(dbPath)) {
      console.log('⚠️  database.json neexistuje, migrace přeskočena');
      return;
    }

    const jsonData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    if (!jsonData.users || Object.keys(jsonData.users).length === 0) {
      console.log('⚠️  Žádní uživatelé k migraci');
      return;
    }

    // Migruj každého uživatele
    let migratedCount = 0;
    for (const [username, userData] of Object.entries(jsonData.users)) {
      try {
        const result = await client.query(
          `INSERT INTO users (username, password, completedMazes, deaths, steps) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (username) DO UPDATE SET 
           completedMazes = $3, deaths = $4, steps = $5
           RETURNING username`,
          [
            username,
            userData.password,
            userData.completedMazes || 0,
            userData.deaths || 0,
            userData.steps || 0,
          ]
        );
        migratedCount++;
        console.log(`✅ Migrován uživatel: ${username}`);
      } catch (err) {
        console.error(`❌ Chyba při migraci uživatele ${username}:`, err.message);
      }
    }

    console.log(`\n✅ Migrace dokončena! Migrováno ${migratedCount} uživatelů`);
  } catch (error) {
    console.error('❌ Chyba při migraci:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Spusť migraci
migrateData().catch(err => {
  console.error('Migrace selhala:', err);
  process.exit(1);
});
