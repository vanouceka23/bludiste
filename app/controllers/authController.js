// Autentizace s podporou JSON a PostgreSQL
const db = process.env.DATABASE_URL 
  ? require('../db-postgres-new') 
  : require('../db');

// Registrace
async function register(username, password) {
  return await db.registerUser(username, password);
}

// Přihlášení
async function login(username, password) {
  return await db.loginUser(username, password);
}

// Získej uživatele
async function getUser(userId) {
  return await db.getUser(userId);
}

module.exports = { register, login, getUser };
