// Generátor bludišť - vytváří náhodné 2D bludiště
function generateMaze(width = 15, height = 15) {
  // 0 = cesta, 1 = zeď
  const maze = Array(height)
    .fill(null)
    .map(() => Array(width).fill(1));

  // Depth-first search pro generování bludišť
  function carvePassages(x, y) {
    maze[y][x] = 0;

    // Směry: nahoru, doprava, dolů, doleva
    const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
    const shuffled = directions.sort(() => Math.random() - 0.5);

    for (const [dx, dy] of shuffled) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && maze[ny][nx] === 1) {
        maze[y + dy / 2][x + dx / 2] = 0;
        carvePassages(nx, ny);
      }
    }
  }

  carvePassages(1, 1);

  // Start a cíl
  const startPos = { x: 1, y: 1 };
  const goalPos = { x: width - 2, y: height - 2 };

  return { maze, startPos, goalPos };
}

module.exports = { generateMaze };
