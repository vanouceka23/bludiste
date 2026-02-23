# Nasazení na Supabase

## Nejrychlejší způsob (přes web UI)

1. Jdi na https://app.supabase.com/project/[tvoj-project-id]/sql/new
2. Vlož obsah z `schema.sql` (celý obsah níže)
3. Klikni **Run** 
4. ✅ Tabulka je vytvořená!

### SQL pro vytvoření tabulky:
```sql
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

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

## Pokud chceš spustit setup script

1. Zkopíruj **Connection String** z Settings > Database > Connection String
2. Spusť:
   ```bash
   node setup-supabase.js "postgresql://postgres:HESLO@db.xxx.supabase.co:5432/postgres?sslmode=require"
   ```

## Konfigurace aplikace

1. Vytvoř `.env` soubor v kořenu projektu:
   ```
   DATABASE_URL=postgresql://postgres:HESLO@db.xxx.supabase.co:5432/postgres?sslmode=require
   PORT=3000
   NODE_ENV=production
   ```

2. (Volitelně) Migruj stará data z JSON:
   ```bash
   node migrate.js
   ```

3. Spusť aplikaci:
   ```bash
   npm install
   npm start
   ```

## Struktura

- **schema.sql** - PostgreSQL schéma tabulky
- **db.js** - Stará JSON-based databáze (pro offline development)
- **db-postgres.js** - PostgreSQL modul (automaticky vybrán když je DATABASE_URL nastavena)
- **migrate.js** - Script pro migraci dat z JSON na PostgreSQL
- **.env.example** - Template pro environment proměnné

## Poznámky

- Bez `DATABASE_URL` aplikace používá JSON soubor (database.json)
- S `DATABASE_URL` aplikace automaticky přepne na PostgreSQL
- Migrační script přeskočí uživatele, co už existují (ON CONFLICT)
