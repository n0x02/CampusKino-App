# CampusKino Buchhaltung

Web-App zur Ablösung der Excel-Buchhaltung. Stack: React + TypeScript (Frontend), Node.js + Express + TypeScript (Backend), PostgreSQL (DB).

---

## Voraussetzungen

- [Node.js](https://nodejs.org/) >= 18
- [PostgreSQL](https://www.postgresql.org/) >= 14
- npm >= 9

---

## 1. PostgreSQL einrichten

```bash
# PostgreSQL starten (falls nicht läuft)
# macOS mit Homebrew:
brew services start postgresql

# Linux:
sudo systemctl start postgresql

# Datenbank anlegen
psql -U postgres -c "CREATE DATABASE campuskino;"

# Schema + Seed-Daten einspielen
psql -U postgres -d campuskino -f backend/src/db/schema.sql
```

---

## 2. Backend starten

```bash
cd backend
npm install

# .env anlegen (oder Variablen direkt setzen)
cp .env.example .env
# → DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD anpassen

npm run dev
# Läuft auf http://localhost:3001
```

### Verfügbare API-Endpunkte

| Methode | Pfad                        | Beschreibung                          |
|---------|-----------------------------|---------------------------------------|
| GET     | /api/produkte               | Alle Produkte + aktueller Bestand     |
| PATCH   | /api/produkte/:id           | Produkt bearbeiten (EKP, VKP, Name)   |
| GET     | /api/veranstaltungen        | Alle Abende                           |
| POST    | /api/veranstaltungen        | Neuen Abend anlegen                   |
| GET     | /api/einkauf                | Einkaufspositionen (optional ?veranstaltung_id=) |
| POST    | /api/einkauf                | Einkauf buchen → Bestand wird erhöht  |
| DELETE  | /api/einkauf/:id            | Einkauf löschen → Bestand korrigiert  |
| GET     | /api/verkauf                | Verkaufspositionen                    |
| POST    | /api/verkauf                | Verkauf buchen → Bestand wird gesenkt |
| DELETE  | /api/verkauf/:id            | Verkauf löschen → Bestand korrigiert  |
| GET     | /api/kasse                  | Kassenbuchungen                       |
| POST    | /api/kasse                  | Kassenbuchung anlegen                 |
| GET     | /api/bilanz                 | Vollständige Bilanz (optional ?veranstaltung_id=) |
| GET     | /health                     | Health-Check                          |

---

## 3. Frontend starten

```bash
cd frontend
npm install
npm run dev
# Läuft auf http://localhost:5173
```

---

## 4. Produktions-Deployment (einfachstes Setup)

```bash
# Frontend bauen
cd frontend
npm run build
# → Ausgabe in frontend/dist/

# Backend bauen
cd backend
npm run build
# → Ausgabe in backend/dist/

# Backend starten (statisches Frontend mitserven)
node backend/dist/index.js
```

Oder mit **PM2** (empfohlen für dauerhaften Betrieb):

```bash
npm install -g pm2
pm2 start backend/dist/index.js --name campuskino
pm2 save
pm2 startup
```

---

## 5. Umgebungsvariablen

**backend/.env.example:**
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campuskino
DB_USER=postgres
DB_PASSWORD=dein_passwort
PORT=3001
FRONTEND_URL=http://localhost:5173
```

---

## Projektstruktur

```
campuskino/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── pool.ts          ← PostgreSQL Verbindung
│   │   │   └── schema.sql       ← Tabellen + Seed-Daten
│   │   ├── routes/
│   │   │   └── api.ts           ← Alle REST-Endpunkte
│   │   ├── services/
│   │   │   └── campuskino.service.ts  ← Business Logic
│   │   ├── types/
│   │   │   └── index.ts         ← Geteilte TypeScript-Typen
│   │   └── index.ts             ← Express Server
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.ts        ← API-Client (fetch)
    │   ├── pages/
    │   │   ├── Verkauf.tsx      ← Ticketverkauf + Kassenstand
    │   │   ├── Einkauf.tsx      ← Wareneinkauf + Bestand
    │   │   └── Bilanz.tsx       ← Abrechnung + Aufteilung
    │   ├── App.tsx              ← Navigation + Veranstaltungs-Switcher
    │   ├── app.css              ← Globales Styling
    │   └── main.tsx
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

---

## Business Logic (Übersicht)

### Transaktionen (mit DB-Transaktion / Rollback)
- **Einkauf buchen** → `einkauf_positionen` Eintrag + `produkte.bestand += menge`
- **Einkauf löschen** → Eintrag entfernen + `produkte.bestand -= menge`
- **Verkauf buchen** → Bestandsprüfung + `verkauf_positionen` Eintrag + `produkte.bestand -= menge`
- **Verkauf löschen** → Eintrag entfernen + `produkte.bestand += menge`
- Tickets (T_001–T_003) haben **keinen physischen Bestand** → kein Bestandsabzug

### Bilanz-Berechnung
```
Einnahmen gesamt    = Ticket-Einnahmen + Snack/Getränke-Einnahmen
Überschuss          = Einnahmen gesamt − Einkaufskosten

Ticket-Aufteilung:
  → UniFilm e.V.    = Ticket-Einnahmen × 75%
  → CampusKino      = Ticket-Einnahmen × 25%

Snack-Überschuss-Aufteilung:
  → KinoTeam        = Snack-Überschuss × 80%
  → WingLA e.V.     = Snack-Überschuss × 20%

Kassenende (Soll)   = Kassenanfang + Bar-Einnahmen − (Sum-Up × 1%)
Kassendifferenz     = Kassenende (Ist) − Kassenende (Soll)
```

---

## Häufige Fehler

**"Backend nicht erreichbar"**
→ Läuft `npm run dev` im `backend/` Ordner? Ist Port 3001 frei?

**"relation does not exist"**
→ Schema noch nicht eingespielt: `psql -U postgres -d campuskino -f backend/src/db/schema.sql`

**"password authentication failed"**
→ `.env` Datei prüfen, DB-Passwort korrekt?

**Bestand wird negativ**
→ Der Service prüft vor jedem Verkauf den Bestand und wirft einen Fehler wenn nicht genug da ist.
