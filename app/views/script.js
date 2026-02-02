const API_URL = 'http://localhost:3000/api';

let currentUserId = null;
let mazeState = null;
let cellSize = 30;
let animationFrameId = null;
let playerAnimationProgress = 0; // 0 až 1
let isAnimating = false;
let animationDuration = 150; // ms - rychlejší pohyb
let isDarkMode = false; // Tma zapnutá/vypnutá
let isZoomed = false; // Zoom zapnutý/vypnutý
let zoomLevel = 10; // Počet políček viditelných (default 10x10)
let cameraX = 0; // Pozice kamery X
let cameraY = 0; // Pozice kamery Y

// Přepínání mezi přihlášením a registrací
function toggleForms() {
  document.getElementById('loginForm').style.display =
    document.getElementById('loginForm').style.display === 'none' ? 'block' : 'none';
  document.getElementById('registerForm').style.display =
    document.getElementById('registerForm').style.display === 'none' ? 'block' : 'none';
  clearError();
}

// Čistění chybové zprávy
function clearError() {
  document.getElementById('errorMessage').textContent = '';
}

// Registrace
async function register() {
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value.trim();

  if (!username || !password) {
    showError('Vyplň všechna pole');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!data.success) {
      showError(data.error || 'Registrace selhala');
      return;
    }

    // Automaticky přihláš po registraci
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';
    toggleForms();
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
    login();
  } catch (error) {
    showError('Chyba připojení k serveru: ' + error.message);
  }
}

// Přihlášení
async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!username || !password) {
    showError('Vyplň všechna pole');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!data.success) {
      showError(data.error || 'Přihlášení selhalo');
      return;
    }

    // Úspěšné přihlášení
    currentUserId = username;
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    clearError();

    // Inicializuj bludiště
    await initMaze();
    
    // Zaregistruj ovládání klávesnicí
    registerKeyboardControls();
  } catch (error) {
    showError('Chyba připojení k serveru: ' + error.message);
  }
}

// Odhlášení
function logout() {
  currentUserId = null;
  mazeState = null;
  document.removeEventListener('keydown', handleKeyDown);
  document.getElementById('authContainer').style.display = 'block';
  document.getElementById('gameContainer').style.display = 'none';
  const canvas = document.getElementById('mazeCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('messageBox').innerHTML = '';
}

// Zobrazení chyby
function showError(message) {
  document.getElementById('errorMessage').textContent = message;
}

// Inicializace bludiště
async function initMaze() {
  try {
    const width = parseInt(document.getElementById('mazeWidth').value);
    const height = parseInt(document.getElementById('mazeHeight').value);
    
    const response = await fetch(`${API_URL}/maze/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, width, height }),
    });

    const data = await response.json();

    if (!data.success) {
      alert('Chyba: ' + (data.error || 'Nepodařilo se inicializovat bludiště'));
      return;
    }

    // Zavři victory modál
    document.getElementById('victoryModal').style.display = 'none';
    
    // Načti bludiště
    await loadMaze();
  } catch (error) {
    alert('Chyba připojení: ' + error.message);
  }
}

// Načtení bludiště
async function loadMaze() {
  try {
    const response = await fetch(`${API_URL}/maze/${currentUserId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!data.success) {
      alert('Chyba: ' + (data.error || 'Nepodařilo se načíst bludiště'));
      return;
    }

    mazeState = data;
    renderMaze();
  } catch (error) {
    alert('Chyba připojení: ' + error.message);
  }
}

// Změna úrovně zoomu
function changeZoomLevel(newLevel) {
  zoomLevel = parseInt(newLevel);
  document.getElementById('zoomLevelValue').textContent = zoomLevel;
  renderMaze();
}

// Vykreslení bludiště na canvas - statické
function renderMaze() {
  const canvas = document.getElementById('mazeCanvas');
  const ctx = canvas.getContext('2d');
  
  const maze = mazeState.maze;
  const playerPos = mazeState.playerPos;
  const goalPos = mazeState.goalPos;
  
  const width = maze[0].length;
  const height = maze.length;
  
  // Vypočítej velikost políčka
  const maxCanvasSize = 600;
  cellSize = Math.floor(maxCanvasSize / Math.max(width, height));
  cellSize = Math.max(10, cellSize);
  
  // Při zoomu - pevná velikost canvasu, ale zoom obě osy
  if (isZoomed) {
    const viewportWidth = zoomLevel;
    const viewportHeight = zoomLevel;
    
    // Canvas zůstane vždy stejně velký (600x600)
    canvas.width = maxCanvasSize;
    canvas.height = maxCanvasSize;
    
    // Velikost políčka se změní podle zoomLevel
    const zoomedCellSize = maxCanvasSize / zoomLevel;
    
    // Cílová pozice kamery - hráč uprostřed
    const targetCameraX = playerPos.x - viewportWidth / 2;
    const targetCameraY = playerPos.y - viewportHeight / 2;
    
    // Smooth camera movement
    const cameraSmoothing = 0.3;
    cameraX += (targetCameraX - cameraX) * cameraSmoothing;
    cameraY += (targetCameraY - cameraY) * cameraSmoothing;
    
    // Clamp kameru na okraje mapy
    cameraX = Math.max(0, Math.min(cameraX, width - viewportWidth));
    cameraY = Math.max(0, Math.min(cameraY, height - viewportHeight));
    
    const startX = Math.floor(cameraX);
    const startY = Math.floor(cameraY);
    const endX = Math.min(width, startX + Math.ceil(viewportWidth) + 1);
    const endY = Math.min(height, startY + Math.ceil(viewportHeight) + 1);
    
    // Urči viditelná políčka v tmě
    const visibleCells = isDarkMode ? getVisibleCells(playerPos, maze) : null;
    
    // Vykreslení viditelné části bludiště
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        // V tmě - preskočit neviditelná políčka
        if (isDarkMode && !visibleCells.has(`${x},${y}`)) {
          ctx.fillStyle = '#000000';
          ctx.fillRect((x - cameraX) * zoomedCellSize, (y - cameraY) * zoomedCellSize, zoomedCellSize, zoomedCellSize);
          continue;
        }
        
        const cellX = (x - cameraX) * zoomedCellSize;
        const cellY = (y - cameraY) * zoomedCellSize;
        const cell = maze[y][x];
        
        drawCell(ctx, cell, cellX, cellY, zoomedCellSize);
      }
    }
    
    // Cíl
    if (goalPos && goalPos.x >= startX && goalPos.x < endX && goalPos.y >= startY && goalPos.y < endY) {
      if (!isDarkMode || visibleCells.has(`${goalPos.x},${goalPos.y}`)) {
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect((goalPos.x - cameraX) * zoomedCellSize, (goalPos.y - cameraY) * zoomedCellSize, zoomedCellSize, zoomedCellSize);
      }
    }
    
    // Hráč
    if (playerPos) {
      const playerScreenX = (playerPos.x - cameraX) * zoomedCellSize;
      const playerScreenY = (playerPos.y - cameraY) * zoomedCellSize;
      ctx.fillStyle = '#3498db';
      ctx.fillRect(playerScreenX, playerScreenY, zoomedCellSize, zoomedCellSize);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(playerScreenX + 2, playerScreenY + 2, zoomedCellSize - 4, 4);
    }
  } else {
    // Normální pohled - celé bludiště
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;
    
    // Urči viditelná políčka v tmě
    const visibleCells = isDarkMode ? getVisibleCells(playerPos, maze) : null;
    
    // Vykreslení sítě
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // V tmě - preskočit neviditelná políčka
        if (isDarkMode && !visibleCells.has(`${x},${y}`)) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          continue;
        }
        
        const cellX = x * cellSize;
        const cellY = y * cellSize;
        const cell = maze[y][x];
        
        drawCell(ctx, cell, cellX, cellY, cellSize);
      }
    }
    
    // Cíl - vidím jen v tmě pokud je viditelný
    if (goalPos) {
      if (!isDarkMode || visibleCells.has(`${goalPos.x},${goalPos.y}`)) {
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(goalPos.x * cellSize, goalPos.y * cellSize, cellSize, cellSize);
      }
    }
    
    // Hráč
    if (playerPos) {
      const playerX = playerPos.x * cellSize;
      const playerY = playerPos.y * cellSize;
      ctx.fillStyle = '#3498db';
      ctx.fillRect(playerX, playerY, cellSize, cellSize);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(playerX + 2, playerY + 2, cellSize - 4, 4);
    }
  }
  
  // Click handler
  canvas.onclick = (e) => handleCanvasClick(e, canvas);
}

// Pomocná funkce na vykreslení políčka
function drawCell(ctx, cell, cellX, cellY, cellSize) {
  if (cell.type === 1) {
    // Normální zeď
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(cellX, cellY, cellSize, cellSize);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4);
  } else if (cell.type === 2) {
    // Speciální zeď s trny
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(cellX, cellY, cellSize, cellSize);
    ctx.fillStyle = '#e74c3c';
    const spikes = 3;
    for (let i = 0; i < spikes; i++) {
      for (let j = 0; j < spikes; j++) {
        const sx = cellX + (i + 0.5) * (cellSize / spikes);
        const sy = cellY + (j + 0.5) * (cellSize / spikes);
        ctx.beginPath();
        ctx.arc(sx, sy, cellSize / 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (cell.type === 3) {
    // Jednosměrná propust - oranžová s šipkou
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(cellX, cellY, cellSize, cellSize);
    
    // Nakresli šipku podle směru
    ctx.fillStyle = '#fff9e6';
    const arrowSize = cellSize / 4;
    const cx = cellX + cellSize / 2;
    const cy = cellY + cellSize / 2;
    
    ctx.beginPath();
    if (cell.direction === 'right') {
      ctx.moveTo(cx - arrowSize, cy - arrowSize / 2);
      ctx.lineTo(cx + arrowSize, cy);
      ctx.lineTo(cx - arrowSize, cy + arrowSize / 2);
    } else if (cell.direction === 'left') {
      ctx.moveTo(cx + arrowSize, cy - arrowSize / 2);
      ctx.lineTo(cx - arrowSize, cy);
      ctx.lineTo(cx + arrowSize, cy + arrowSize / 2);
    } else if (cell.direction === 'down') {
      ctx.moveTo(cx - arrowSize / 2, cy - arrowSize);
      ctx.lineTo(cx, cy + arrowSize);
      ctx.lineTo(cx + arrowSize / 2, cy - arrowSize);
    } else if (cell.direction === 'up') {
      ctx.moveTo(cx - arrowSize / 2, cy + arrowSize);
      ctx.lineTo(cx, cy - arrowSize);
      ctx.lineTo(cx + arrowSize / 2, cy + arrowSize);
    }
    ctx.closePath();
    ctx.fill();
  } else if (cell.type === 4) {
    // Portál A - modrý se spirálou
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(cellX, cellY, cellSize, cellSize);
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(cellX + cellSize / 2, cellY + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Nakresli spirálu
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = cellSize / 12;
    const cx = cellX + cellSize / 2;
    const cy = cellY + cellSize / 2;
    const spiralRadius = cellSize / 6;
    ctx.beginPath();
    for (let angle = 0; angle < Math.PI * 4; angle += 0.1) {
      const r = spiralRadius * (angle / (Math.PI * 4));
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (angle === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else if (cell.type === 5) {
    // Portál B - purpurový se spirálou
    ctx.fillStyle = '#8e44ad';
    ctx.fillRect(cellX, cellY, cellSize, cellSize);
    ctx.fillStyle = '#af7ac5';
    ctx.beginPath();
    ctx.arc(cellX + cellSize / 2, cellY + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Nakresli spirálu
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = cellSize / 12;
    const cx2 = cellX + cellSize / 2;
    const cy2 = cellY + cellSize / 2;
    const spiralRadius2 = cellSize / 6;
    ctx.beginPath();
    for (let angle = 0; angle < Math.PI * 4; angle += 0.1) {
      const r = spiralRadius2 * (angle / (Math.PI * 4));
      const x = cx2 + r * Math.cos(angle);
      const y = cy2 + r * Math.sin(angle);
      if (angle === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// Handler pro kliknutí na canvas
function handleCanvasClick(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const maxCanvasSize = 600;
  
  if (isZoomed) {
    // V zoomovaném režimu - počítej s kamerou
    const zoomedCellSize = maxCanvasSize / zoomLevel;
    const screenX = (e.clientX - rect.left) / zoomedCellSize;
    const screenY = (e.clientY - rect.top) / zoomedCellSize;
    
    const x = Math.floor(cameraX + screenX);
    const y = Math.floor(cameraY + screenY);
    
    if (x >= 0 && x < mazeState.maze[0].length && y >= 0 && y < mazeState.maze.length) {
      movePlayer(x, y);
    }
  } else {
    // Normální pohled
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    
    if (x >= 0 && x < mazeState.maze[0].length && y >= 0 && y < mazeState.maze.length) {
      movePlayer(x, y);
    }
  }
}

// Pohyb hráče
async function movePlayer(x, y) {
  // Pokud se právě animuje, ignoruj vstup
  if (isAnimating) return;
  
  try {
    const response = await fetch(`${API_URL}/maze/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, x, y }),
    });

    const data = await response.json();

    if (!data.success) {
      showGameMessage(data.error || 'Chyba pohybu', 'error');
      return;
    }

    // Ulož starou pozici a spusť animaci
    const oldPos = { ...mazeState.playerPos };
    
    // Aktualizuj novou pozici v mazeState
    mazeState.playerPos = data.playerPos;
    
    // Spusť animaci
    isAnimating = true;
    playerAnimationProgress = 0;
    const startTime = Date.now();
    
    // Animační smyčka
    function animateMovement() {
      const elapsed = Date.now() - startTime;
      playerAnimationProgress = Math.min(elapsed / animationDuration, 1);
      
      // Vykresluj se interpolací
      renderMazeWithInterpolation(oldPos, data.playerPos, playerAnimationProgress);
      
      if (playerAnimationProgress < 1) {
        requestAnimationFrame(animateMovement);
      } else {
        isAnimating = false;
        // Finální vykreslení
        renderMaze();
      }
    }
    
    animateMovement();

    // Hráč zemřel - reset animace
    if (data.died) {
      triggerJumpscare();
      showGameMessage(data.message, 'death');
      return;
    }

    // Zkontroluj, zda je hra vyhrána
    if (data.reachedGoal) {
      isAnimating = false;
      celebrateVictory();
    }
  } catch (error) {
    showGameMessage('Chyba připojení: ' + error.message, 'error');
  }
}

// Vykreslení s interpolací pozice hráče
function renderMazeWithInterpolation(fromPos, toPos, progress) {
  const canvas = document.getElementById('mazeCanvas');
  const ctx = canvas.getContext('2d');
  
  const maze = mazeState.maze;
  const goalPos = mazeState.goalPos;
  
  const width = maze[0].length;
  const height = maze.length;
  
  const maxCanvasSize = 600;
  cellSize = Math.floor(maxCanvasSize / Math.max(width, height));
  cellSize = Math.max(10, cellSize);
  
  const easeProgress = easeInOutQuad(progress);
  const interpolatedX = fromPos.x + (toPos.x - fromPos.x) * easeProgress;
  const interpolatedY = fromPos.y + (toPos.y - fromPos.y) * easeProgress;
  
  // Při zoomu - plynulé sledování hráče
  if (isZoomed) {
    const viewportWidth = zoomLevel;
    const viewportHeight = zoomLevel;
    
    // Canvas zůstane vždy stejně velký (600x600)
    canvas.width = maxCanvasSize;
    canvas.height = maxCanvasSize;
    
    // Velikost políčka se změní podle zoomLevel
    const zoomedCellSize = maxCanvasSize / zoomLevel;
    
    // Cílová pozice kamery - hráč uprostřed
    const targetCameraX = interpolatedX - viewportWidth / 2;
    const targetCameraY = interpolatedY - viewportHeight / 2;
    
    // Smooth camera movement - lerp ke cílové pozici
    const cameraSmoothing = 0.3;
    cameraX += (targetCameraX - cameraX) * cameraSmoothing;
    cameraY += (targetCameraY - cameraY) * cameraSmoothing;
    
    // Clamp kameru na okraje mapy
    cameraX = Math.max(0, Math.min(cameraX, width - viewportWidth));
    cameraY = Math.max(0, Math.min(cameraY, height - viewportHeight));
    
    const startX = Math.floor(cameraX);
    const startY = Math.floor(cameraY);
    const endX = Math.min(width, startX + Math.ceil(viewportWidth) + 1);
    const endY = Math.min(height, startY + Math.ceil(viewportHeight) + 1);
    
    // Urči viditelná políčka v tmě
    const visibleCells = isDarkMode ? getVisibleCells(toPos, maze) : null;
    
    // Vykreslení viditelné části bludiště
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        // V tmě - preskočit neviditelná políčka
        if (isDarkMode && !visibleCells.has(`${x},${y}`)) {
          ctx.fillStyle = '#000000';
          ctx.fillRect((x - cameraX) * zoomedCellSize, (y - cameraY) * zoomedCellSize, zoomedCellSize, zoomedCellSize);
          continue;
        }
        
        const cellX = (x - cameraX) * zoomedCellSize;
        const cellY = (y - cameraY) * zoomedCellSize;
        const cell = maze[y][x];
        
        drawCell(ctx, cell, cellX, cellY, zoomedCellSize);
      }
    }
    
    // Cíl
    if (goalPos && goalPos.x >= startX && goalPos.x < endX && goalPos.y >= startY && goalPos.y < endY) {
      if (!isDarkMode || visibleCells.has(`${goalPos.x},${goalPos.y}`)) {
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect((goalPos.x - cameraX) * zoomedCellSize, (goalPos.y - cameraY) * zoomedCellSize, zoomedCellSize, zoomedCellSize);
      }
    }
    
    // Hráč s animací
    const playerScreenX = (interpolatedX - cameraX) * zoomedCellSize;
    const playerScreenY = (interpolatedY - cameraY) * zoomedCellSize;
    ctx.fillStyle = '#3498db';
    ctx.fillRect(playerScreenX, playerScreenY, zoomedCellSize, zoomedCellSize);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(playerScreenX + 2, playerScreenY + 2, zoomedCellSize - 4, 4);
  } else {
    // Normální pohled - celé bludiště
    canvas.width = width * cellSize;
    canvas.height = height * cellSize;
    
    // Urči viditelná políčka v tmě
    const visibleCells = isDarkMode ? getVisibleCells(toPos, maze) : null;
    
    // Vykreslení sítě
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // V tmě - preskočit neviditelná políčka
        if (isDarkMode && !visibleCells.has(`${x},${y}`)) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          continue;
        }
        
        const cellX = x * cellSize;
        const cellY = y * cellSize;
        const cell = maze[y][x];
        
        drawCell(ctx, cell, cellX, cellY, cellSize);
      }
    }
    
    // Cíl - vidím jen v tmě pokud je viditelný
    if (goalPos) {
      if (!isDarkMode || visibleCells.has(`${goalPos.x},${goalPos.y}`)) {
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(goalPos.x * cellSize, goalPos.y * cellSize, cellSize, cellSize);
      }
    }
    
    // Hráč s animací - interpoluj pozici
    const playerX = interpolatedX * cellSize;
    const playerY = interpolatedY * cellSize;
    ctx.fillStyle = '#3498db';
    ctx.fillRect(playerX, playerY, cellSize, cellSize);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(playerX + 2, playerY + 2, cellSize - 4, 4);
  }
}

// Easing funkce - smooth movement
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Určí viditelná políčka v tmě
function getVisibleCells(playerPos, maze) {
  const visible = new Set();
  const width = maze[0].length;
  const height = maze.length;
  
  // Vidí 3x3 grid kolem sebe (včetně diagonál)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = playerPos.x + dx;
      const y = playerPos.y + dy;
      if (x >= 0 && x < width && y >= 0 && y < height) {
        visible.add(`${x},${y}`);
      }
    }
  }
  
  // Rozšíření viditelnosti v 4 hlavních směrech (dokud jsou cesty)
  const directions = [
    { dx: 0, dy: -1, name: 'up' },
    { dx: 0, dy: 1, name: 'down' },
    { dx: -1, dy: 0, name: 'left' },
    { dx: 1, dy: 0, name: 'right' }
  ];
  
  for (const dir of directions) {
    let x = playerPos.x + dir.dx;
    let y = playerPos.y + dir.dy;
    
    // Kontroluj cesty v daném směru, dokud nejde do zdi
    while (x >= 0 && x < width && y >= 0 && y < height) {
      const cell = maze[y][x];
      
      // Červené bloky (type 2) zablokují viditelnost
      if (cell.type === 1 || cell.type === 2) {
        break;
      }
      
      visible.add(`${x},${y}`);
      
      x += dir.dx;
      y += dir.dy;
    }
  }
  
  return visible;
}

// Přepínač tmy
function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.getElementById('darkModeToggle').textContent = isDarkMode ? '💡 Svítilna zapnutá' : '🌙 Tma vypnutá';
  renderMaze();
}

// Přepínač zoomu
function toggleZoom() {
  isZoomed = !isZoomed;
  document.getElementById('zoomToggle').textContent = isZoomed ? '🔍 Zoom zapnutý' : '👁️ Zoom vypnutý';
  document.getElementById('zoomLevelControl').style.display = isZoomed ? 'block' : 'none';
  // Reset kamery
  cameraX = 0;
  cameraY = 0;
  renderMaze();
}

// Jumpscare efekt
function triggerJumpscare() {
  // Malá šance na jumpscare - 30%
  if (Math.random() > 0.3) return;
  
  const jumpscare = document.getElementById('jumpscare');
  jumpscare.style.display = 'flex';
  
  // Zvuk - pokud máme audio context
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Náhodný vysoký zvuk
  oscillator.frequency.value = Math.random() * 1000 + 500;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
  
  // Zmizet po 400ms
  setTimeout(() => {
    jumpscare.style.display = 'none';
  }, 400);
}

// Zobrazení zprávy v hře
function showGameMessage(message, type) {
  const messageBox = document.getElementById('messageBox');
  messageBox.textContent = message;
  messageBox.className = 'message-box ' + type;

  if (type === 'error') {
    setTimeout(() => {
      messageBox.textContent = '';
      messageBox.className = 'message-box';
    }, 3000);
  }
}

// Registrace ovládání klávesnicí
function registerKeyboardControls() {
  document.addEventListener('keydown', handleKeyDown);
}

// Handler pro klávesy
function handleKeyDown(event) {
  if (!mazeState || !currentUserId) return;

  const playerPos = mazeState.playerPos;
  let newX = playerPos.x;
  let newY = playerPos.y;

  const key = event.key.toUpperCase();

  switch (key) {
    case 'W': // Nahoru
      newY = Math.max(0, playerPos.y - 1);
      break;
    case 'S': // Dolů
      newY = Math.min(mazeState.height - 1, playerPos.y + 1);
      break;
    case 'A': // Doleva
      newX = Math.max(0, playerPos.x - 1);
      break;
    case 'D': // Doprava
      newX = Math.min(mazeState.width - 1, playerPos.x + 1);
      break;
    default:
      return;
  }

  // Pokud se pozice změnila, proveď pohyb
  if (newX !== playerPos.x || newY !== playerPos.y) {
    event.preventDefault();
    movePlayer(newX, newY);
  }
}

// Změna velikosti bludiště
function changeMazeSize() {
  const width = parseInt(document.getElementById('mazeWidth').value);
  const height = parseInt(document.getElementById('mazeHeight').value);
  document.getElementById('widthValue').textContent = width;
  document.getElementById('heightValue').textContent = height;
  initMaze();
}

// Celebrace vítězství s konfetami
function celebrateVictory() {
  const canvas = document.getElementById('mazeCanvas');
  
  // Pokaž victory modál
  const modal = document.getElementById('victoryModal');
  modal.style.display = 'flex';
  
  // Vytvoř konfety
  createConfetti();
}

// Vytvoř animaci konfet - po celé obrazovce
function createConfetti() {
  const confettiCount = 100;
  const colors = ['#2ecc71', '#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c'];
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    // Náhodná pozice po celé obrazovce
    confetti.style.left = Math.random() * window.innerWidth + 'px';
    confetti.style.top = (Math.random() * window.innerHeight - 50) + 'px';
    
    // Náhodná barva
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    // Náhodná velikost
    const size = Math.random() * 8 + 4;
    confetti.style.width = size + 'px';
    confetti.style.height = size + 'px';
    
    // Náhodné zpoždění
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    
    // Náhodná animační doba
    confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
    
    document.body.appendChild(confetti);
    
    // Odstraň konfeti po skončení animace
    setTimeout(() => confetti.remove(), 4000);
  }
}

// Slider event listeners
document.addEventListener('DOMContentLoaded', () => {
  const mazeWidth = document.getElementById('mazeWidth');
  const mazeHeight = document.getElementById('mazeHeight');
  
  if (mazeWidth) {
    mazeWidth.addEventListener('input', (e) => {
      document.getElementById('widthValue').textContent = e.target.value;
    });
  }
  
  if (mazeHeight) {
    mazeHeight.addEventListener('input', (e) => {
      document.getElementById('heightValue').textContent = e.target.value;
    });
  }
});
