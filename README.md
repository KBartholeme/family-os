# Family OS

Das Family Operating Model als Web-App für Natalia und André. Konzept: [CONCEPT.md](CONCEPT.md).

- **Center** mit Kinder & Entwicklung, Woche, Haushalt, Team & Rituale, Papierkram, Finanzen, Gesundheit, Ziele & Erinnerungen
- Design wie Familienkasse, Grevo und die Tool-Übersicht
- **Login per E-Mail-Link**, gleicher Zugang wie die Familienkasse (Supabase-Projekt „Familienkasse“, Freigabe über `fk_members`)
- **Gemeinsame Daten:** jeder Bereich ist ein Datenpaket in der Tabelle `fos_state` (Row Level Security).
  Versionsnummern verhindern, dass sich Natalia und André gegenseitig überschreiben.
- Deutsch und Englisch, Person und Sprache merkt sich jedes Gerät.

## Aufbau

| Datei | Zweck |
|---|---|
| `site/index.html` | Theme und Anmeldung |
| `site/boot.js` | Login, Daten aus Supabase laden und speichern |
| `site/app.js`, `site/app.css` | die App (aus dem Mockup) |
| `site/catalog/ideen-katalog.json` | 175 Ideen für 0–6 Jahre, erzeugt mit `python3 tools/build_catalog.py` |
| `site/config.js` | Supabase-Adresse und öffentlicher Publishable Key |

Vercel veröffentlicht jede Änderung auf `main` automatisch (`vercel.json` kopiert `site/` nach `public/`).

**Lokal ansehen:** `python3 -m http.server 7781 --directory site`
