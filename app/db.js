const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, '../database.json');

// Inicializuj databázi, pokud neexistuje
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDB = {
      users: {},
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
  }
}

// Přečti celou databázi
function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Chyba při čtení databáze:', error);
    return { users: {} };
  }
}

// Zapiš do databáze
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Chyba při zápisu do databáze:', error);
    return false;
  }
}

// Registrace uživatele
function registerUser(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Username a password jsou povinné' };
  }

  const db = readDB();

  if (db.users[username]) {
    return { success: false, error: 'Uživatel již existuje' };
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  console.log(`[DB] Registrace: ${username}, Plain: ${password}, Hash: ${hashedPassword}`);

  db.users[username] = {
    username,
    password: hashedPassword, // Ulož hash místo plain textu
    completedMazes: 0, // Počet dokončených bludišť
    deaths: 0, // Počet smrtí
    steps: 0, // Celkový počet kroků
  };

  writeDB(db);
  return { success: true, message: 'Registrace úspěšná', userId: username };
}

// Přihlášení uživatele
function loginUser(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Username a password jsou povinné' };
  }

  const db = readDB();
  const user = db.users[username];

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return { success: false, error: 'Nesprávné přihlašovací údaje' };
  }

  return { success: true, message: 'Přihlášení úspěšné', userId: username };
}

// Získej uživatele
function getUser(username) {
  const db = readDB();
  return db.users[username] || null;
}

// Aktualizuj uživatele - jen statistiky!
function updateUser(username, updates) {
  const db = readDB();

  if (!db.users[username]) {
    return { success: false, error: 'Uživatel nenalezen' };
  }

  // Povolená pole k aktualizaci
  const allowedFields = ['completedMazes', 'deaths', 'steps'];
  const filteredUpdates = {};
  
  for (const field of allowedFields) {
    if (field in updates) {
      filteredUpdates[field] = updates[field];
    }
  }

  db.users[username] = {
    ...db.users[username],
    ...filteredUpdates,
    username, // Vrátí původní username
  };

  writeDB(db);
  return { success: true, data: db.users[username] };
}

// Všichni uživatelé (jen pro debug)
function getAllUsers() {
  const db = readDB();
  return Object.keys(db.users).map(username => ({
    username,
    createdAt: db.users[username].createdAt,
  }));
}

module.exports = {
  initDB,
  registerUser,
  loginUser,
  getUser,
  updateUser,
  getAllUsers,
};
