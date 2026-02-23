const postgres = require('postgres');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
let sql = null;

// Inicializuj připojení
async function initDB() {
  if (connectionString) {
    try {
      sql = postgres(connectionString);
      const result = await sql`SELECT NOW()`;
      console.log('✅ Připojení k PostgreSQL databázi úspěšné');
    } catch (error) {
      console.error('❌ Chyba při připojení k databázi:', error.message);
      sql = null; // Fallback na JSON
    }
  }
}

// Registrace uživatele
async function registerUser(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Username a password jsou povinné' };
  }

  try {
    if (!sql) {
      return { success: false, error: 'Databáze není dostupná' };
    }

    // Zkontroluj, zda uživatel již existuje
    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    
    if (existing.length > 0) {
      return { success: false, error: 'Uživatel již existuje' };
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    console.log(`[DB] Registrace: ${username}`);

    const result = await sql`
      INSERT INTO users (username, password, completedMazes, deaths, steps) 
      VALUES (${username}, ${hashedPassword}, 0, 0, 0) 
      RETURNING id, username
    `;

    return { success: true, message: 'Registrace úspěšná', userId: result[0].username };
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
    if (!sql) {
      return { success: false, error: 'Databáze není dostupná' };
    }

    const result = await sql`SELECT id, username, password FROM users WHERE username = ${username}`;
    
    if (result.length === 0 || !bcrypt.compareSync(password, result[0].password)) {
      return { success: false, error: 'Nesprávné přihlašovací údaje' };
    }

    return { success: true, message: 'Přihlášení úspěšné', userId: result[0].username };
  } catch (error) {
    console.error('Chyba při přihlášení:', error);
    return { success: false, error: 'Chyba při přihlášení' };
  }
}

// Získej uživatele
async function getUser(username) {
  try {
    if (!sql) {
      return null;
    }

    const result = await sql`
      SELECT id, username, completedMazes, deaths, steps, created_at 
      FROM users 
      WHERE username = ${username}
    `;
    
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Chyba při získávání uživatele:', error);
    return null;
  }
}

// Aktualizuj uživatele (jen statistiky)
async function updateUser(username, updates) {
  try {
    if (!sql) {
      return { success: false, error: 'Databáze není dostupná' };
    }

    // Zkontroluj, zda uživatel existuje
    const userCheck = await sql`SELECT id FROM users WHERE username = ${username}`;
    
    if (userCheck.length === 0) {
      return { success: false, error: 'Uživatel nenalezen' };
    }

    // Povolená pole k aktualizaci
    const allowedFields = ['completedMazes', 'deaths', 'steps'];
    const updateData = {};

    for (const field of allowedFields) {
      if (field in updates) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true, data: await getUser(username) };
    }

    // Dynamické vytvoření SQL dotazu
    const setClauses = Object.keys(updateData)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');
    
    const values = Object.values(updateData);

    const result = await sql`
      UPDATE users 
      SET ${sql(setClauses, ...values)}, updated_at = CURRENT_TIMESTAMP 
      WHERE username = ${username} 
      RETURNING id, username, completedMazes, deaths, steps, created_at
    `;

    return { success: true, data: result[0] };
  } catch (error) {
    console.error('Chyba při aktualizaci uživatele:', error);
    return { success: false, error: 'Chyba při aktualizaci' };
  }
}

// Všichni uživatelé (jen pro debug)
async function getAllUsers() {
  try {
    if (!sql) {
      return [];
    }

    const result = await sql`SELECT username, created_at FROM users ORDER BY created_at DESC`;
    return result;
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
  sql, // Exportuj sql client pro migrations
};
