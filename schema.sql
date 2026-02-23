-- Vytvoření tabulky users pro Supabase
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  completedMazes INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  steps INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vytvoř index na username pro rychlejší vyhledávání
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
