# 🎮 Hra Bludiště

Webová hra, kde se hráč musí dostat z určeného startu na cíl v náhodně generovaném bludišti. Každý uživatel má své vlastní, nezávislé bludiště.

## ✨ Funkčnost

### Backend (Node.js + Express)
- ✅ Registrace a přihlášení uživatele
- ✅ Generování náhodného bludiště pro každého uživatele (2D pole)
- ✅ Uchovávání stavu uživatele (pozice hráče, bludiště)
- ✅ REST API pro získání bludiště
- ✅ API endpoint pro pohyb hráče
- ✅ Validace pohybu (nelze projít zdí)
- ✅ Detekce dosažení cíle

### Frontend (HTML, CSS, vanilla JavaScript)
- ✅ Přihlašovací a registrační formulář
- ✅ Zobrazení bludiště jako klikací mřížka
- ✅ Pohyb hráče:
  - Kliknutím na políčko
  - Klávesami **W**, **A**, **S**, **D**
- ✅ Vizualizace:
  - 🟦 Modrá - pozice hráče
  - ⬛ Tmavě šedá - zdi
  - 🟩 Zelená - cíl
  - 🟧 Oranžová se šipkou - jednosměrná propust
  - 🟦 Modrá s "A" - portál A
  - 🟪 Purpurová s "B" - portál B
  - Světlá - volné cesty
- ✅ Zobrazení zprávy při dosažení cíle
- ✅ Možnost hrát znovu

## 🛠️ Technologie

- **Backend:** Node.js, Express.js
- **Frontend:** HTML5, CSS3, vanilla JavaScript
- **Komunikace:** REST API (JSON)
- **Autentizace:** In-memory session (bez externího DB)
- **Úložiště dat:** Paměť (in-memory)

## 📁 Struktura projektu

```
projekt/
├── node_modules/              # Závislosti
├── app/
│   ├── index.js               # Hlavní server
│   ├── mazeGenerator.js       # Generátor bludišť
│   ├── controllers/
│   │   ├── authController.js  # Logika autentizace
│   │   └── mazeController.js  # Logika bludiště
│   ├── routers/
│   │   ├── authRoutes.js      # API endpointy auth
│   │   └── mazeRoutes.js      # API endpointy bludiště
│   ├── middleware/
│   │   └── logger.js          # Logování
│   └── views/
│       ├── index.html         # HTML
│       ├── styles.css         # Styly
│       └── script.js          # JavaScript logika
├── package.json               # Závislosti
├── README.md                  # Dokumentace
└── zadání.txt                 # Původní zadání
```

## 🚀 Jak spustit

### Příprava

1. **Nainstaluj Node.js** (pokud již není instalován)
   - Stáhni z https://nodejs.org/

2. **Naviguj do složky projektu:**
   ```bash
   cd C:\Users\vanouceka23\Desktop\projekt
   ```

### Instalace a spuštění

1. **Instalace závislostí:**
   ```bash
   npm install
   ```

2. **Spuštění serveru:**
   ```bash
   npm start
   ```

3. **Otevři v prohlížeči:**
   ```
   http://localhost:3000
   ```

Server běží na portu 3000 a slouží jak frontend, tak backend.

## 📝 Použití

1. **Zaregistruj se** nebo **přihláš se** s existujícím účtem
2. **Hraj** - Bludiště se zobrazí po přihlášení
3. **Pohybuj se:**
   - Klikaj na sousední políčka
   - Nebo použij klávesy **W** (nahoru), **A** (doleva), **S** (dolů), **D** (doprava)
4. **Dosáhni** zelené políčka (cíl)
5. **Hrál znovu** - Po zvítězení se ti nabídne nová hra

## 🎯 Pravidla hry

- Můžeš se pohybovat pouze na **sousední políčko** (vodorovně, svisle)
- Nemůžeš projít **zdmi** (tmavá políčka)
- Cíl dosáhneš, když se dostaneš na **zelenou políčko**
- Bludiště se generuje **náhodně** pokaždé
- **Jednosměrné propusti** (oranžová se šipkou):
  - Můžeš vstoupit **pouze z jedné strany** (opačně než směr šipky)
  - Když vstoupíš, okamžitě tě propust **vyhodí na druhou stranu**
- **Portály** (modrý A a purpurový B):
  - Vstoupíš-li na portál A → teleportuješ se na portál B
  - Vstoupíš-li na portál B → teleportuješ se na portál A
  - Z portálu B můžeš odejít **kamkoliv** (není povinný)
  - Portály nejsou **povinné** pro dosažení cíle
- **Start a cíl** - mohou být umístěny v **rozích** nebo **ve středu** bludiště

## ⚙️ API Endpointy

### Autentizace
- `POST /api/auth/register` - Registrace uživatele
- `POST /api/auth/login` - Přihlášení uživatele

### Bludiště
- `POST /api/maze/init` - Inicializace nového bludiště
- `GET /api/maze/:userId` - Získání bludiště a pozice hráče
- `POST /api/maze/move` - Pohyb hráče

## 🔧 Vývoj a rozšíření

Projekt lze rozšířit o:
- Database (MongoDB, PostgreSQL)
- Skóre a ranking hráčů
- Různé obtížnosti bludiště
- Časový limit
- Multiplayer mód
- Animace a zvuky
- Dark mode

## 📋 Poznámky

- Projekt používá **in-memory storage** - data se smažou po restartování serveru
- Hesla nejsou hashována (je to demo aplikace)
- CORS je povoleno pro všechny domény
- Bludiště je generováno pomocí algoritmu **Depth-First Search**
- Frontend a backend běží na jednom serveru (port 3000)

## 👨‍💻 Autor

Vytvořeno pro demonstraci webové hry.

---

**Pěknou hru! 🎮**
