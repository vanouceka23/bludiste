// Generátor bludišť - vytváří náhodné 2D bludiště
function generateMaze(width = 15, height = 15) {
  let maze;
  let isValid = false;
  
  // Generuj bludiště, dokud není řešitelné
  while (!isValid) {
    // Struktura buňky: 
    // { type: 0=cesta, 1=zeď, 2=spiky zeď, 3=jednosměrná propust, 4=portál A, 5=portál B, direction: 'up'|'down'|'left'|'right' }
    maze = Array(height)
      .fill(null)
      .map(() => Array(width).fill(null).map(() => ({ type: 1 }))); // Všechny jsou stěny

    // Recursive backtracking - lepší algoritmus s větvením
    function carvePassages(x, y, visited) {
      maze[y][x] = { type: 0 }; // Cesta
      visited[y][x] = true;

      // Všechny 4 směry: nahoru, doprava, dolů, doleva
      const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
      
      // Náhodně zamíchej směry
      for (let i = directions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [directions[i], directions[j]] = [directions[j], directions[i]];
      }

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && !visited[ny][nx]) {
          // Vyřež cestu ke sousední buňce
          maze[y + dy / 2][x + dx / 2] = { type: 0 };
          carvePassages(nx, ny, visited);
        }
      }
    }

    // Inicializuj visited mapu
    const visited = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));

    carvePassages(1, 1, visited);

    // Náhodný výběr pozic pro start a cíl - rohy nebo střed
    function getRandomPosition() {
      const locations = [
        // Rohy
        { x: 1, y: 1 },                          // Levý horní
        { x: width - 2, y: 1 },                  // Pravý horní
        { x: 1, y: height - 2 },                 // Levý dolní
        { x: width - 2, y: height - 2 },         // Pravý dolní
        // Střed
        { x: Math.floor(width / 2), y: Math.floor(height / 2) }
      ];
      return locations[Math.floor(Math.random() * locations.length)];
    }

    const startPos = getRandomPosition();
    let goalPos = getRandomPosition();
    
    // Zajisti, aby start a cíl nebyly na stejné pozici
    while (goalPos.x === startPos.x && goalPos.y === startPos.y) {
      goalPos = getRandomPosition();
    }

    // Zajisti, že start i cíl jsou cesty (typ 0)
    maze[startPos.y][startPos.x] = { type: 0 };
    maze[goalPos.y][goalPos.x] = { type: 0 };

    // Kontrola dosažitelnosti cíle z startu
    function isGoalReachable(tempMaze, start, goal) {
      const queue = [start];
      const visited = Array(height).fill(null).map(() => Array(width).fill(false));
      visited[start.y][start.x] = true;

      while (queue.length > 0) {
        const { x, y } = queue.shift();

        if (x === goal.x && y === goal.y) {
          return true;
        }

        // Zkontroluj sousední buňky
        const neighbors = [
          { nx: x + 1, ny: y, dx: 1, dy: 0, dir: 'right' },
          { nx: x - 1, ny: y, dx: -1, dy: 0, dir: 'left' },
          { nx: x, ny: y + 1, dx: 0, dy: 1, dir: 'down' },
          { nx: x, ny: y - 1, dx: 0, dy: -1, dir: 'up' }
        ];

        for (const { nx, ny, dx, dy, dir } of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny][nx]) {
            const cell = tempMaze[ny][nx];
            let canPass = false;

            if (cell.type === 0) {
              // Normální cesta - vždy lze projít
              canPass = true;
            } else if (cell.type === 3) {
              // Jednosměrný blok - lze VSTOUPIT z libovolné strany
              // Výstup se kontroluje až když hráč je VE bloku a chce ho opustit
              canPass = true;
            }

            if (canPass) {
              visited[ny][nx] = true;
              queue.push({ x: nx, y: ny });
            }
          }
        }
      }

      return false;
    }

    // Zkontroluj, zda je cíl dosažitelný
    if (isGoalReachable(maze, startPos, goalPos)) {
      isValid = true;

      // Přidej speciální zdi - kontroluj aby neblokovaly cestu
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (maze[y][x].type === 1 && Math.random() < 0.3) {
            // Zkus přidat speciální zeď a kontroluj, zda je stále dosažitelný cíl
            const originalCell = maze[y][x];
            maze[y][x] = { type: 2 }; // Speciální zeď
            
            if (!isGoalReachable(maze, startPos, goalPos)) {
              // Cíl by se stal nedosažitelným - vrať zpět
              maze[y][x] = originalCell;
            }
          }
        }
      }

      // Přidej jednosměrné propusti - VYPNUTO
      /*
      const directions = ['up', 'down', 'left', 'right'];
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (maze[y][x].type === 0 && Math.random() < 0.40) {
            const randomDir = directions[Math.floor(Math.random() * directions.length)];
            const originalCell = maze[y][x];
            maze[y][x] = { type: 3, direction: randomDir };
            
            if (!isGoalReachable(maze, startPos, goalPos)) {
              maze[y][x] = originalCell;
            }
          }
        }
      }
      */

      // Přidej portály - najdi 2 náhodná volná místa
      let portalA = null;
      let portalB = null;
      const maxAttempts = 100;
      let attempts = 0;

      while ((portalA === null || portalB === null) && attempts < maxAttempts) {
        const x = Math.floor(Math.random() * (width - 2)) + 1;
        const y = Math.floor(Math.random() * (height - 2)) + 1;

        if (maze[y][x].type === 0) {
          if (portalA === null) {
            portalA = { x, y };
            const originalCell = maze[y][x];
            maze[y][x] = { type: 4, portalId: 'A' };
            
            // Kontrola, že cíl je stále dosažitelný
            if (!isGoalReachable(maze, startPos, goalPos)) {
              maze[y][x] = originalCell;
              portalA = null;
            }
          } else if (portalB === null && (x !== portalA.x || y !== portalA.y)) {
            portalB = { x, y };
            const originalCell = maze[y][x];
            maze[y][x] = { type: 5, portalId: 'B' };
            
            // Kontrola, že cíl je stále dosažitelný
            if (!isGoalReachable(maze, startPos, goalPos)) {
              maze[y][x] = originalCell;
              portalB = null;
            }
          }
        }
        attempts++;
      }

      return { maze, startPos, goalPos, portalA, portalB };
    }
  }
}

module.exports = { generateMaze };
