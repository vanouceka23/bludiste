// Správa bludišť - in-memory storage
const { generateMaze } = require('../mazeGenerator');
const { getUser } = require('./authController');

// Inicializace nového bludiště pro uživatele
function initMaze(userId, width = 15, height = 15) {
  const user = getUser(userId);
  
  if (!user) {
    return { success: false, error: 'Uživatel nenalezen' };
  }

  // Ověř velikost - mezi 7 a 51 (lichá čísla)
  width = Math.max(7, Math.min(51, width));
  if (width % 2 === 0) width += 1;
  
  height = Math.max(7, Math.min(51, height));
  if (height % 2 === 0) height += 1;

  const { maze, startPos, goalPos, portalA, portalB } = generateMaze(width, height);

  user.maze = maze;
  user.startPos = startPos;
  user.playerPos = startPos;
  user.goalPos = goalPos;
  user.portalA = portalA;
  user.portalB = portalB;

  return {
    success: true,
    message: 'Bludiště inicializováno',
    playerPos: startPos,
    goalPos,
    portalA,
    portalB,
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
    portalA: user.portalA,
    portalB: user.portalB,
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

  const cell = maze[y][x];

  // Validace pohybu - nelze projít normálními zdí
  if (cell.type === 1) {
    return { success: false, error: 'Nemůžeš projít zdí!' };
  }

  // Speciální zdi - hráč umírá
  if (cell.type === 2) {
    user.playerPos = user.startPos;
    return { 
      success: true, 
      playerPos: user.startPos,
      died: true,
      message: '💀 Narazil jsi na trny! Začínáš znovu...',
    };
  }

  // Jednosměrné propusti - kontrola VSTUPU a automatický přesun
  if (cell.type === 3) {
    const dx = x - playerPos.x;
    const dy = y - playerPos.y;
    const direction = cell.direction;

    // Zkontroluj, zda se hráč pohybuje v povoleném směru (vstup do propusti)
    const canEnter = 
      (direction === 'right' && dx < 0) ||   // Vstupuješ zleva do propusti směřující doprava
      (direction === 'left' && dx > 0) ||    // Vstupuješ zprava do propusti směřující doleva
      (direction === 'down' && dy < 0) ||    // Vstupuješ shora do propusti směřující dolů
      (direction === 'up' && dy > 0);        // Vstupuješ zdola do propusti směřující nahoru

    if (!canEnter) {
      return { success: false, error: '🚫 Do jednosměrné propusti se můžeš vstoupit pouze z určité strany!' };
    }

    // Automatický přesun na druhou stranu propusti
    let finalX = x;
    let finalY = y;

    if (direction === 'right') finalX = x + 1;
    else if (direction === 'left') finalX = x - 1;
    else if (direction === 'down') finalY = y + 1;
    else if (direction === 'up') finalY = y - 1;

    // Kontrola, zda výstupní pozice není mimo mapu nebo zeď
    if (finalX < 0 || finalX >= maze[0].length || finalY < 0 || finalY >= maze.length) {
      return { success: false, error: 'Propust vede mimo bludiště' };
    }
    
    const exitCell = maze[finalY][finalX];
    if (exitCell.type === 1) {
      return { success: false, error: 'Propust vede do zdi' };
    }

    // Přesuň hráče na výstupní pozici
    user.playerPos = { x: finalX, y: finalY };

    // Kontrola cíle
    const reachedGoal = finalX === goalPos.x && finalY === goalPos.y;

    return {
      success: true,
      playerPos: { x: finalX, y: finalY },
      reachedGoal,
      message: reachedGoal ? '🎉 Dosáhl jsi cíle! Gratuluji!' : 'Prošel jsi propustí',
    };
  }

  // Portál A - přesun na portál B
  if (cell.type === 4) {
    if (!user.portalB) {
      return { success: false, error: 'Portál B nenalezen' };
    }

    user.playerPos = { x: user.portalB.x, y: user.portalB.y };

    const reachedGoal = user.portalB.x === goalPos.x && user.portalB.y === goalPos.y;

    return {
      success: true,
      playerPos: { x: user.portalB.x, y: user.portalB.y },
      reachedGoal,
      message: reachedGoal ? '🎉 Dosáhl jsi cíle! Gratuluji!' : '🌀 Teleportován na portál B',
    };
  }

  // Portál B - přesun na portál A
  if (cell.type === 5) {
    if (!user.portalA) {
      return { success: false, error: 'Portál A nenalezen' };
    }

    user.playerPos = { x: user.portalA.x, y: user.portalA.y };

    const reachedGoal = user.portalA.x === goalPos.x && user.portalA.y === goalPos.y;

    return {
      success: true,
      playerPos: { x: user.portalA.x, y: user.portalA.y },
      reachedGoal,
      message: reachedGoal ? '🎉 Dosáhl jsi cíle! Gratuluji!' : '🌀 Teleportován na portál A',
    };
  }

  // Normální pohyb na volné pole
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
