// Middleware pro logování
function logger(req, res, next) {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
}

module.exports = { logger };
