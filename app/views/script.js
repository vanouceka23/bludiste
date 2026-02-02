const API_URL = 'http://localhost:3000/api';

let currentUserId = null;
let mazeState = null;
let cellSize = 30;
let animationFrameId = null;
let playerAnimationProgress = 0; // 0 až 1
let isAnimating = false;
let animationDuration = 150; // ms - rychlejší pohyb

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

// Vykreslení bludiště na canvas - statické
function renderMaze() {
  const canvas = document.getElementById('mazeCanvas');
  const ctx = canvas.getContext('2d');
  
  const maze = mazeState.maze;
  const playerPos = mazeState.playerPos;
  const goalPos = mazeState.goalPos;
  
  const width = maze[0].length;
  const height = maze.length;
  
  const maxCanvasSize = 600;
  cellSize = Math.floor(maxCanvasSize / Math.max(width, height));
  cellSize = Math.max(10, cellSize);
  
  canvas.width = width * cellSize;
  canvas.height = height * cellSize;
  
  // Vykreslení sítě
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cellX = x * cellSize;
      const cellY = y * cellSize;
      const cell = maze[y][x];
      
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
  }
  
  // Cíl
  if (goalPos) {
    const goalX = goalPos.x * cellSize;
    const goalY = goalPos.y * cellSize;
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(goalX, goalY, cellSize, cellSize);
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
  
  // Click handler
  canvas.onclick = (e) => handleCanvasClick(e, canvas);
}

// Handler pro kliknutí na canvas
function handleCanvasClick(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);
  
  if (x >= 0 && x < mazeState.maze[0].length && y >= 0 && y < mazeState.maze.length) {
    movePlayer(x, y);
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
  
  canvas.width = width * cellSize;
  canvas.height = height * cellSize;
  
  // Vykreslení sítě
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cellX = x * cellSize;
      const cellY = y * cellSize;
      const cell = maze[y][x];
      
      if (cell.type === 1) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4);
      } else if (cell.type === 2) {
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
  }
  
  // Cíl
  if (goalPos) {
    const goalX = goalPos.x * cellSize;
    const goalY = goalPos.y * cellSize;
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(goalX, goalY, cellSize, cellSize);
  }
  
  // Hráč s animací - interpoluj pozici
  const easeProgress = easeInOutQuad(progress); // Smooth easing
  const interpolatedX = fromPos.x + (toPos.x - fromPos.x) * easeProgress;
  const interpolatedY = fromPos.y + (toPos.y - fromPos.y) * easeProgress;
  
  const playerX = interpolatedX * cellSize;
  const playerY = interpolatedY * cellSize;
  ctx.fillStyle = '#3498db';
  ctx.fillRect(playerX, playerY, cellSize, cellSize);
  
  // Gloss efekt
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(playerX + 2, playerY + 2, cellSize - 4, 4);
}

// Easing funkce - smooth movement
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
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
