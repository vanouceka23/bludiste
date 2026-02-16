// Autentizace s JSON databází
const db = require('../db');

// Registrace
function register(username, password) {
  return db.registerUser(username, password);
}

// Přihlášení
function login(username, password) {
  return db.loginUser(username, password);
}

// Získej uživatele
function getUser(userId) {
  return db.getUser(userId);
}

module.exports = { register, login, getUser };
