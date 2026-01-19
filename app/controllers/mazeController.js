// Správa bludišť - in-memory storage
const { generateMaze } = require('../mazeGenerator');
const { getUser } = require('./authController');

// Inicializace nového bludiště pro uživatele
function initMaze(userId) {
  const user = getUser(userId);
  
  if (!user) {
    return { success: false, error: 'Uživatel nenalezen' };
  }

  const { maze, startPos, goalPos } = generateMaze(15, 15);

  user.maze = maze;
  user.playerPos = startPos;
  user.goalPos = goalPos;

  return {
    success: true,
    message: 'Bludiště inicializováno',
    playerPos: startPos,
    goalPos,
    width: maze[0].length,
    height: maze.length,
  };
}

// Získej bludiště a pozici hráče
function getMaze(userId) {
  const user = getUser(userId);

  if (!user || !user.maze) {
    return { success: false, error: 'Bludiště nenalezeno' };
  }

  return {
    success: true,
    maze: user.maze,
    playerPos: user.playerPos,
    goalPos: user.goalPos,
    width: user.maze[0].length,
    height: user.maze.length,
  };
}

// Pohyb hráče
function movePlayer(userId, x, y) {
  const user = getUser(userId);

  if (!user || !user.maze) {
    return { success: false, error: 'Bludiště nenalezeno' };
  }

  const { maze, playerPos, goalPos } = user;

  // Kontrola, zda je cílová pozice v poli
  if (x < 0 || x >= maze[0].length || y < 0 || y >= maze.length) {
    return { success: false, error: 'Pozice mimo bludiště' };
  }

  // Kontrola, zda se hráč pohybuje pouze na sousední políčko
  const distance = Math.max(Math.abs(x - playerPos.x), Math.abs(y - playerPos.y));
  if (distance > 1) {
    return { success: false, error: 'Lze se pohybovat pouze na sousední políčko' };
  }

  // Validace pohybu - nelze projít zdí
  if (maze[y][x] === 1) {
    return { success: false, error: 'Nemůžeš projít zdí!' };
  }

  // Aktualizuj pozici hráče
  user.playerPos = { x, y };

  // Kontrola, zda hráč dosáhl cíle
  const reachedGoal = x === goalPos.x && y === goalPos.y;

  return {
    success: true,
    playerPos: { x, y },
    reachedGoal,
    message: reachedGoal ? '🎉 Dosáhl jsi cíle! Gratuluji!' : 'Pohyb proveden',
  };
}

module.exports = { initMaze, getMaze, movePlayer };
