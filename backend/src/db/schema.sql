-- CampusKino Schema

CREATE TABLE IF NOT EXISTS produkte (
  id        SERIAL PRIMARY KEY,
  sku       VARCHAR(10) UNIQUE NOT NULL,
  name      VARCHAR(100) NOT NULL,
  kategorie VARCHAR(20) NOT NULL CHECK (kategorie IN ('Snack','Getraenk','Ticket','Sonstiges')),
  ekp       NUMERIC(8,2) NOT NULL DEFAULT 0,
  vkp       NUMERIC(8,2) NOT NULL DEFAULT 0,
  bestand   INTEGER NOT NULL DEFAULT 0,
  aktiv     BOOLEAN NOT NULL DEFAULT true,
  erstellt  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS veranstaltungen (
  id          SERIAL PRIMARY KEY,
  datum       DATE NOT NULL,
  bezeichnung VARCHAR(200) NOT NULL,
  film1       VARCHAR(200),
  film2       VARCHAR(200),
  hoersaal    VARCHAR(50),
  abgeschlossen BOOLEAN NOT NULL DEFAULT false,
  erstellt    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS einkauf_positionen (
  id                SERIAL PRIMARY KEY,
  veranstaltung_id  INTEGER REFERENCES veranstaltungen(id) ON DELETE CASCADE,
  produkt_id        INTEGER NOT NULL REFERENCES produkte(id),
  menge             INTEGER NOT NULL CHECK (menge > 0),
  ekp_zum_zeitpunkt NUMERIC(8,2) NOT NULL,
  gesamtkosten      NUMERIC(10,2) GENERATED ALWAYS AS (menge * ekp_zum_zeitpunkt) STORED,
  notiz             TEXT,
  erstellt          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verkauf_positionen (
  id                SERIAL PRIMARY KEY,
  veranstaltung_id  INTEGER REFERENCES veranstaltungen(id) ON DELETE CASCADE,
  produkt_id        INTEGER NOT NULL REFERENCES produkte(id),
  menge             INTEGER NOT NULL CHECK (menge > 0),
  vkp_zum_zeitpunkt NUMERIC(8,2) NOT NULL,
  gesamteinnahme    NUMERIC(10,2) GENERATED ALWAYS AS (menge * vkp_zum_zeitpunkt) STORED,
  zahlungsart       VARCHAR(20) NOT NULL DEFAULT 'bar' CHECK (zahlungsart IN ('bar','sumup','freiticket')),
  notiz             TEXT,
  erstellt          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kassenstand (
  id                SERIAL PRIMARY KEY,
  veranstaltung_id  INTEGER REFERENCES veranstaltungen(id) ON DELETE CASCADE,
  zeitpunkt         TIMESTAMPTZ NOT NULL DEFAULT now(),
  typ               VARCHAR(20) NOT NULL CHECK (typ IN ('anfang','ende','einzahlung','entnahme')),
  betrag            NUMERIC(10,2) NOT NULL,
  muenzen_detail    JSONB,   -- { "0.01": 5, "0.02": 3, ... }
  notiz             TEXT
);

-- Seed-Produkte aus der Excel
INSERT INTO produkte (sku, name, kategorie, ekp, vkp, bestand) VALUES
  ('S_001', 'Popcorn',               'Snack',    0.00, 2.00,  0),
  ('S_002', 'Chips',                 'Snack',    0.00, 1.50,  0),
  ('S_003', 'M&M''s',               'Snack',    0.00, 3.00,  0),
  ('S_004', 'Nic Nacs',              'Snack',    0.00, 3.00,  0),
  ('S_005', 'Haribo',                'Snack',    0.00, 3.00,  0),
  ('S_006', 'Nachos',                'Snack',    0.00, 4.00,  0),
  ('S_099', 'Snack Sonstiges',       'Snack',    0.00, 0.00,  0),
  ('G_001', 'Spezi',                 'Getraenk', 0.78, 1.50, 15),
  ('G_002', 'Libella Zitrone/Orange','Getraenk', 0.00, 1.50,  0),
  ('G_003', 'Weinschorle',           'Getraenk', 1.05, 2.00,  0),
  ('G_004', 'Bier',                  'Getraenk', 1.00, 2.00, 17),
  ('G_005', 'Redbull',               'Getraenk', 0.00, 1.50,  0),
  ('G_006', 'Giveaways',             'Getraenk', 0.00, 0.00,  0),
  ('G_900', 'Getränke Sonstiges',    'Getraenk', 0.00, 1.50,  0),
  ('T_001', 'Ticket (Standard)',     'Ticket',   0.00, 0.50,  0),
  ('T_002', 'Ticket (Clubkarte)',    'Ticket',   0.00, 0.50,  0),
  ('T_003', 'Freiticket',            'Ticket',   0.00, 0.00,  0),
  ('X_900', 'Sonstiges',             'Sonstiges',0.00, 0.00,  0)
ON CONFLICT (sku) DO NOTHING;
