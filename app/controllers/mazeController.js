// Správa bludišť s podporou JSON a PostgreSQL
const { generateMaze } = require('../mazeGenerator');
const { getUser } = require('./authController');

const db = process.env.DATABASE_URL 
  ? require('../db-postgres-new') 
  : require('../db');

// In-memory storage pro bludiště během hry (není v databázi!)
const mazeStorage = new Map(); // userId -> { maze, startPos, goalPos, playerPos, portalA, portalB }

// Inicializace nového bludiště pro uživatele
async function initMaze(userId, width = 15, height = 15) {
  const user = await getUser(userId);
  
  if (!user) {
    return { success: false, error: 'Uživatel nenalezen' };
  }

  // Ověř velikost - mezi 7 a 51 (lichá čísla)
  width = Math.max(7, Math.min(51, width));
  if (width % 2 === 0) width += 1;
  
  height = Math.max(7, Math.min(51, height));
  if (height % 2 === 0) height += 1;

  const { maze, startPos, goalPos, portalA, portalB } = generateMaze(width, height);

  // Ulož bludiště v paměti (nikoli v databázi!)
  mazeStorage.set(userId, {
    maze,
    startPos,
    playerPos: startPos,
    goalPos,
    portalA,
    portalB,
  });

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
  const mazeData = mazeStorage.get(userId);

  if (!mazeData) {
    return { success: false, error: 'Bludiště nenalezeno' };
  }

  return {
    success: true,
    maze: mazeData.maze,
    playerPos: mazeData.playerPos,
    goalPos: mazeData.goalPos,
    portalA: mazeData.portalA,
    portalB: mazeData.portalB,
    width: mazeData.maze[0].length,
    height: mazeData.maze.length,
  };
}

// Pohyb hráče
async function movePlayer(userId, x, y) {
  const mazeData = mazeStorage.get(userId);

  if (!mazeData) {
    return { success: false, error: 'Bludiště nenalezeno' };
  }

  const { maze, playerPos, goalPos, startPos } = mazeData;

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
    const newPlayerPos = startPos;
    const dbUser = await getUser(userId); // Přečti staré hodnoty z databáze
    mazeData.playerPos = newPlayerPos;
    const updatedUserResult = await db.updateUser(userId, { 
      deaths: (dbUser.deaths || 0) + 1,
      steps: (dbUser.steps || 0) + 1,
    });
    const updatedUser = updatedUserResult.data;
    return { 
      success: true, 
      playerPos: newPlayerPos,
      died: true,
      message: '💀 Narazil jsi na trny! Začínáš znovu...',
      stats: {
        completedMazes: updatedUser.completedMazes || 0,
        deaths: updatedUser.deaths || 0,
        steps: updatedUser.steps || 0,
      }
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
    mazeData.playerPos = { x: finalX, y: finalY };
    
    // Kontrola cíle
    const reachedGoal = finalX === goalPos.x && finalY === goalPos.y;

    const dbUser = await getUser(userId);
    const updatedUserResult = await db.updateUser(userId, { 
      steps: (dbUser.steps || 0) + 1,
      ...(reachedGoal && { completedMazes: (dbUser.completedMazes || 0) + 1 })
    });
    const updatedUser = updatedUserResult.data;

    return {
      success: true,
      playerPos: { x: finalX, y: finalY },
      reachedGoal,
      message: reachedGoal ? '🎉 Dosáhl jsi cíle! Gratuluji!' : 'Prošel jsi propustí',
      stats: {
        completedMazes: updatedUser.completedMazes || 0,
        deaths: updatedUser.deaths || 0,
        steps: updatedUser.steps || 0,
      }
    };
  }

  // Portál A - přesun na portál B
  if (cell.type === 4) {
    if (!mazeData.portalB) {
      return { success: false, error: 'Portál B nenalezen' };
    }

    mazeData.playerPos = { x: mazeData.portalB.x, y: mazeData.portalB.y };
    const reachedGoal = mazeData.portalB.x === goalPos.x && mazeData.portalB.y === goalPos.y;

    const dbUser = await getUser(userId);
    const updatedUserResult = await db.updateUser(userId, { 
      steps: (dbUser.steps || 0) + 1,
      ...(reachedGoal && { completedMazes: (dbUser.completedMazes || 0) + 1 })
    });
    const updatedUser = updatedUserResult.data;

    return {
      success: true,
      playerPos: { x: mazeData.portalB.x, y: mazeData.portalB.y },
      reachedGoal,
      message: reachedGoal ? '🎉 Dosáhl jsi cíle! Gratuluji!' : '🌀 Teleportován na portál B',
      stats: {
        completedMazes: updatedUser.completedMazes || 0,
        deaths: updatedUser.deaths || 0,
        steps: updatedUser.steps || 0,
      }
    };
  }

  // Portál B - přesun na portál A
  if (cell.type === 5) {
    if (!mazeData.portalA) {
      return { success: false, error: 'Portál A nenalezen' };
    }

    mazeData.playerPos = { x: mazeData.portalA.x, y: mazeData.portalA.y };
    const reachedGoal = mazeData.portalA.x === goalPos.x && mazeData.portalA.y === goalPos.y;

    const dbUser = await getUser(userId);
    const updatedUserResult = await db.updateUser(userId, { 
      steps: (dbUser.steps || 0) + 1,
      ...(reachedGoal && { completedMazes: (dbUser.completedMazes || 0) + 1 })
    });
    const updatedUser = updatedUserResult.data;

    return {
      success: true,
      playerPos: { x: mazeData.portalA.x, y: mazeData.portalA.y },
      reachedGoal,
      message: reachedGoal ? '🎉 Dosáhl jsi cíle! Gratuluji!' : '🌀 Teleportován na portál A',
      stats: {
        completedMazes: updatedUser.completedMazes || 0,
        deaths: updatedUser.deaths || 0,
        steps: updatedUser.steps || 0,
      }
    };
  }

  // Normální pohyb na volné pole
  mazeData.playerPos = { x, y };
  const reachedGoal = x === goalPos.x && y === goalPos.y;

  const dbUser = await getUser(userId);
  const updatedUserResult = await db.updateUser(userId, { 
    steps: (dbUser.steps || 0) + 1,
    ...(reachedGoal && { completedMazes: (dbUser.completedMazes || 0) + 1 })
  });
  const updatedUser = updatedUserResult.data;

  return {
    success: true,
    playerPos: { x, y },
    reachedGoal,
    message: reachedGoal ? '🎉 Dosáhl jsi cíle! Gratuluji!' : 'Pohyb proveden',
    stats: {
      completedMazes: updatedUser.completedMazes || 0,
      deaths: updatedUser.deaths || 0,
      steps: updatedUser.steps || 0,
    }
  };
}

module.exports = { initMaze, getMaze, movePlayer };
