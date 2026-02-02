// Simulace jednoduché autentizace - in-memory storage
const users = new Map(); // username -> { password, maze, playerPos, goalPos }

// Registrace
function register(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Username a password jsou povinné' };
  }

  if (users.has(username)) {
    return { success: false, error: 'Uživatel již existuje' };
  }

  users.set(username, {
    password,
    maze: null,
    startPos: null,
    playerPos: null,
    goalPos: null,
    portalA: null,
    portalB: null,
  });

  return { success: true, message: 'Registrace úspěšná', userId: username };
}

// Přihlášení
function login(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Username a password jsou povinné' };
  }

  const user = users.get(username);
  if (!user || user.password !== password) {
    return { success: false, error: 'Nesprávné přihlašovací údaje' };
  }

  return { success: true, message: 'Přihlášení úspěšné', userId: username };
}

// Získej uživatele
function getUser(userId) {
  return users.get(userId);
}

module.exports = { register, login, getUser };
