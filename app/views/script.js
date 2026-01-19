const API_URL = 'http://localhost:3000/api';

let currentUserId = null;
let mazeState = null;

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
  document.getElementById('mazeContainer').innerHTML = '';
  document.getElementById('messageBox').innerHTML = '';
}

// Zobrazení chyby
function showError(message) {
  document.getElementById('errorMessage').textContent = message;
}

// Inicializace bludiště
async function initMaze() {
  try {
    const response = await fetch(`${API_URL}/maze/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId }),
    });

    const data = await response.json();

    if (!data.success) {
      alert('Chyba: ' + (data.error || 'Nepodařilo se inicializovat bludiště'));
      return;
    }

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

// Vykreslení bludiště
function renderMaze() {
  const mazeContainer = document.getElementById('mazeContainer');
  mazeContainer.innerHTML = '';

  const maze = mazeState.maze;
  const playerPos = mazeState.playerPos;
  const goalPos = mazeState.goalPos;

  for (let y = 0; y < maze.length; y++) {
    const row = document.createElement('div');
    row.className = 'maze-row';

    for (let x = 0; x < maze[y].length; x++) {
      const cell = document.createElement('div');
      cell.className = 'maze-cell';
      cell.dataset.x = x;
      cell.dataset.y = y;

      // Určení typu políčka
      if (playerPos && x === playerPos.x && y === playerPos.y) {
        cell.classList.add('player');
        cell.textContent = '🟦';
      } else if (goalPos && x === goalPos.x && y === goalPos.y) {
        cell.classList.add('goal');
        cell.textContent = '🟩';
      } else if (maze[y][x] === 1) {
        cell.classList.add('wall');
      } else {
        cell.classList.add('path');
      }

      // Click handler pro pohyb
      cell.onclick = () => movePlayer(x, y);
      row.appendChild(cell);
    }

    mazeContainer.appendChild(row);
  }
}

// Pohyb hráče
async function movePlayer(x, y) {
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

    // Aktualizuj lokální stav
    mazeState.playerPos = data.playerPos;

    // Vykresli znovu
    renderMaze();

    // Zkontroluj, zda je hra vyhrána
    if (data.reachedGoal) {
      showGameMessage(data.message, 'success');
      // Umožni novou hru
      setTimeout(() => {
        if (confirm('Skvělé! Chceš hrát znovu?')) {
          initMaze();
        }
      }, 1000);
    }
  } catch (error) {
    showGameMessage('Chyba připojení: ' + error.message, 'error');
  }
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
