const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Inicializuj connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Otestuj připojení
async function initDB() {
  try {
    const client = await pool.connect();
    console.log('✅ Připojení k PostgreSQL databázi úspěšné');
    client.release();
  } catch (error) {
    console.error('❌ Chyba při připojení k databázi:', error.message);
    process.exit(1);
  }
}

// Registrace uživatele
async function registerUser(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Username a password jsou povinné' };
  }

  try {
    // Zkontroluj, zda uživatel již existuje
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    
    if (existingUser.rows.length > 0) {
      return { success: false, error: 'Uživatel již existuje' };
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    console.log(`[DB] Registrace: ${username}`);

    const result = await pool.query(
      'INSERT INTO users (username, password, completedMazes, deaths, steps) VALUES ($1, $2, $3, $4, $5) RETURNING id, username',
      [username, hashedPassword, 0, 0, 0]
    );

    return { success: true, message: 'Registrace úspěšná', userId: result.rows[0].username };
  } catch (error) {
    console.error('Chyba při registraci:', error);
    return { success: false, error: 'Chyba při registraci' };
  }
}

// Přihlášení uživatele
async function loginUser(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Username a password jsou povinné' };
  }

  try {
    const result = await pool.query('SELECT id, username, password FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0 || !bcrypt.compareSync(password, result.rows[0].password)) {
      return { success: false, error: 'Nesprávné přihlašovací údaje' };
    }

    return { success: true, message: 'Přihlášení úspěšné', userId: result.rows[0].username };
  } catch (error) {
    console.error('Chyba při přihlášení:', error);
    return { success: false, error: 'Chyba při přihlášení' };
  }
}

// Získej uživatele
async function getUser(username) {
  try {
    const result = await pool.query(
      'SELECT id, username, completedMazes, deaths, steps, created_at FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Chyba při získávání uživatele:', error);
    return null;
  }
}

// Aktualizuj uživatele (jen statistiky)
async function updateUser(username, updates) {
  try {
    // Zkontroluj, zda uživatel existuje
    const userCheck = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    
    if (userCheck.rows.length === 0) {
      return { success: false, error: 'Uživatel nenalezen' };
    }

    // Povolená pole k aktualizaci
    const allowedFields = ['completedMazes', 'deaths', 'steps'];
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = $${paramCount}`);
        updateValues.push(updates[field]);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      return { success: true, data: await getUser(username) };
    }

    updateValues.push(username);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE username = $${paramCount} 
      RETURNING id, username, completedMazes, deaths, steps, created_at
    `;

    const result = await pool.query(query, updateValues);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error('Chyba při aktualizaci uživatele:', error);
    return { success: false, error: 'Chyba při aktualizaci' };
  }
}

// Všichni uživatelé (jen pro debug)
async function getAllUsers() {
  try {
    const result = await pool.query('SELECT username, created_at FROM users ORDER BY created_at DESC');
    return result.rows;
  } catch (error) {
    console.error('Chyba při získávání všech uživatelů:', error);
    return [];
  }
}

module.exports = {
  initDB,
  registerUser,
  loginUser,
  getUser,
  updateUser,
  getAllUsers,
  pool, // Exportuj pool pro migrations a další operace
};
