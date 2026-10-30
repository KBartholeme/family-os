# Family Operating Model

Familien-App für André, Natalia, Nara (*16.08.2022) und Levi (*05.04.2025).
Erst als Testfamilie im eigenen Alltag, kein Produkt.

## Leitplanken

- **Nutzer:** André und Natalia, beide aktiv, von den eigenen Handys aus → geteilte Daten (Supabase).
- **Sprachen:** Deutsch und Englisch. Die Oberfläche ist komplett übersetzt, jede Person wählt ihre Sprache.
  Eigene Einträge bleiben so stehen, wie sie geschrieben wurden (später optional AI-Übersetzung).
- **Stack:** React + Vite + Tailwind + Supabase (wie achievement-tracker), i18next für die Übersetzungen.
- **Ein gemeinsames Datenmodell**, auf dem alle Module aufbauen.

## Phasen

1. **Entwicklung der Kinder** + Fristen-Radar (+ Dokumente)
2. **Familie als Team:** Wochen-Check-in, Rituale, Aufgabenverteilung, "Was war gut"
3. **AI-Schicht:** Briefe/Mails → Termine/Aufgaben/Fristen, Wochen-Briefing, proaktive Hinweise, Vorschläge passend zum Alter

## Modul: Entwicklung der Kinder

Pro Kind eine Übersicht über die Entwicklungsbereiche:
Motorik & Sport · Sprache & Lesen · Sozial-emotional · Denken & Neugier · Kreativität & Musik · Selbstständigkeit · Natur & Welt

Jedes Thema hat einen Status: **Wird gefördert · Geplant · Idee · Pausiert/beendet** (beim Beenden mit Grund).
Zu jedem Thema gehören: Verantwortliche/r, Rhythmus, Kosten, Zeit pro Woche, Beobachtungen, Meilensteine, Fotos und Zitate.
Ritual: ein Entwicklungs-Check pro Kind und Quartal.
Gesundheit (U-Untersuchungen, Größe/Gewicht) wird in der Kinder-Ansicht angezeigt.

## Datenmodell (Entwurf)

```
family        id, name
member        id, family_id, user_id?, name, role (parent|child|caregiver), birth_date?, locale (de|en)
dev_area      id, family_id?, key, name_de, name_en, sort          -- Standardbereiche + eigene
dev_topic     id, child_id, area_id, title, status (active|planned|idea|paused|done),
              owner_id?, start_date?, planned_for?, schedule?, cost_month?, minutes_week?,
              reason?, notes?, created_by, updated_at
observation   id, child_id, topic_id?, area_id?, date, kind (milestone|note|quote),
              text, photo_url?, author_id
deadline      id, family_id, title, due_date, owner_id?, topic_id?, done_at?   -- Fristen-Radar
health_check  id, child_id, kind (U7, U8, …), window_from, window_to, done_on?, notes
```

RLS (Row Level Security): Jede Zeile gehört über `family_id` (direkt oder über das Kind) zu genau einer Familie,
und nur deren Mitglieder dürfen sie lesen und schreiben.

## U-Untersuchungen (aus den Geburtsdaten berechnet)

- Nara: U8 (46.–48. Monat) → 16.06.–16.08.2026 · U9 (60.–64. Monat) → 16.08.–16.12.2027
- Levi: U7 (21.–24. Monat) → 05.01.–05.04.2027 · U7a (34.–36. Monat) → 05.02.–05.04.2028

## Navigation: das Center

Startseite ist das **Center**: In der Mitte die Familie (alle vier Personen, „Was gerade wichtig ist“,
Mental-Load-Balken André ↔ Natalia), drumherum sieben Bereiche des Operating Models (per Ziehen umsortierbar):
Kinder & Entwicklung · Haushalt · Team & Rituale · Papierkram · Finanzen · Gesundheit · Ziele & Erinnerungen.
Darunter die **Woche** als Zeitachse (kein eigener Planet, sondern die Antwort auf „Wann?“ quer durch alle Bereiche).

Jede Kachel zeigt ein Signal (Zahl, nächste Frist, Warnung). Von dort wird reingezoomt, z. B.
Center → Kinder → Nara → Motorik & Sport → Thema. Brotkrumen oben führen zurück.
Mockup: `mockup/index.html`

## Bereich: Papierkram (Mockup steht)

Umbenannt von „Fristen & Admin“, weil mehr dahintersteckt als Fristen (EN: „Paperwork“).

Drei Reiter:
- **Fristen-Radar:** Gruppen Überfällig · Nächste 30 Tage · Bis Jahresende · Später · Erledigt.
  Eine Frist hat: Was, Bis wann, Art, Wer, Vorwarnung, Wiederholung, Notiz, Status.
  „Erledigt“ bei wiederkehrenden Fristen legt automatisch die nächste an.
- **Verträge:** Kosten, Laufzeit und Kündigungsfrist ergeben automatisch eine Frist („kündigen oder behalten?“).
  Wird das Fenster verpasst, verlängert sich der Vertrag um 12 Monate.
- **Dokumente:** nur Metadaten (wo liegt es, gültig bis), keine Uploads. Ein Ablaufdatum wird automatisch zur Frist (8 Wochen Vorwarnung).

Mockup-Code: `mockup/app.js` (gemeinsam), `mockup/app.css` (gemeinsame Bausteine), Themes in `index.html` und `skandi.html`.
Eigene Einträge landen im Mockup im localStorage des Browsers. Starten: Server „family-mockup“ (Port 7781).

## Bereich: Team & Rituale (Mockup steht, alles editierbar)

Vier Reiter:
- **Check-in:** oben der nächste Termin mit „Check-in starten“, darunter die **Chronik** aller vergangenen Check-ins
  (Datum, wer protokolliert hat, Vorschau der ersten Notizen; antippen öffnet das ganze Protokoll).
  „Check-in starten“ führt Punkt für Punkt durch den Ablauf mit Notizfeld; „Abschließen“ legt einen neuen Chronik-Eintrag an.
  „Ablauf bearbeiten“ ist eine eigene Seite: Wochentag/Uhrzeit/Dauer und die Punkte (anlegen, bearbeiten, löschen, umsortieren).
  Pro Punkt kann automatisch etwas eingeblendet werden: „Was gerade wichtig ist“, „Wer trägt was“ oder „Kinder-Thema der Woche“.
- **Rituale:** Titel, wann, für wen (Familie / wir zwei / mit Kindern), Beschreibung.
- **Werte:** nummerierte Familienwerte mit kurzer Erklärung.
- **Was war gut:** Schnelleingabe, nach Kalenderwoche gruppiert, mit Name und Datum.

## Bereich: Haushalt (Mockup steht, alles editierbar)

Drei Reiter:
- **To-dos:** Überfällig · Heute · Nächste 7 Tage · Später · Erledigt. Abhaken per Kreis.
  Wiederkehrende Aufgaben springen beim Abhaken auf den nächsten Termin; bei „Im Wechsel“ wechselt die zuständige Person (↻ A / ↻ N).
  Oben: „Diese Woche erledigt (Punkte)“ – zählt, wer abgehakt hat, gewichtet nach Aufwand und Filter Alle / Meine.
- **Wer macht was:** jede Routine hat einen Aufwand (klein 1 · mittel 2 · groß 3); Punkte = Häufigkeit pro Woche × Aufwand. Haushaltsplan nach Person (André · Natalia · Im Wechsel · Beide) mit Summe „ca. x× pro Woche“; oben die Gesamtverteilung (Wechsel/Beide zählen je zur Hälfte). Häufigkeiten: täglich, alle 2/3 Tage, wöchentlich, alle 2 Wochen, monatlich.
- **Einkauf:** gemeinsame Liste mit Schnelleingabe, abhaken („Im Wagen“), Erledigte entfernen.
Haushaltsaufgaben erscheinen im Center-Briefing nur, wenn sie überfällig sind; sie zählen aber zur berechneten Last.

## Bereich: Gesundheit (Mockup steht, alles editierbar)

Drei Reiter:
- **Termine:** Zu klären · Termin steht · Termin machen (nächste 90 Tage) · Später.
  U-Untersuchungen entstehen automatisch aus den Geburtsdaten (U6–U9, J1; Zeitfenster nach G-BA), vergangene gelten als erledigt, außer sie sind als „unklar“ markiert.
  Eigene Termine mit Person, Art, „fällig ab“, vereinbartem Termin, Wiederholung (z. B. Zahnarzt alle 6 Monate) und Zuständigkeit.
  Abhaken: Wiederholungen springen ab dem tatsächlichen Termin weiter.
- **Steckbriefe:** pro Person Blutgruppe, Allergien, Medikamente, Krankenkasse, Hinweise; bei Kindern zusätzlich Größe/Gewicht mit Messdatum.
- **Ärzte:** Praxen mit Fachrichtung, für wen, Adresse und Anruf-Knopf; oben Notfall (112, 116 117).
Die U-Untersuchungen erscheinen auch auf den Kinderseiten. Gesundheitsdaten sind sensibel → echte App braucht Login und Verschlüsselung.

## Bereich: Ziele & Erinnerungen (Mockup steht, alles editierbar)

Drei Reiter:
- **Ziele:** Karten mit Warum, Horizont („2027“, „Sommer 2027“), wer es vorantreibt, Fortschrittsbalken. Antippen öffnet das Ziel mit
  Schritte-Checkliste (abhaken, hinzufügen, löschen) und „Ziel erreicht 🎉“ → wandert nach „Erreicht“.
- **Bucket List:** Träume nach Geplant · Idee · Erlebt, mit Kategorie (Reise, Erlebnis, Projekt, Abenteuer, Lernen) und für wen.
  Wird ein Traum auf „Erlebt“ gesetzt, entsteht automatisch eine Erinnerung.
- **Erinnerungen:** Familien-Journal als Zeitleiste nach Monat, mit Text, Person und Foto-Link (z. B. Google Fotos).
  Oben „Heute vor einem Jahr“ für Erinnerungen aus früheren Jahren rund um das heutige Datum.

## Woche (Zeitachse unter dem Orbit)

- **Im Center:** Streifen „Die nächsten 7 Tage“ mit den Einträgen pro Tag; antippen öffnet die volle Woche.
- **Quellen:** Papierkram (Fristen), Haushalt (fällige Aufgaben, ohne tägliche), Gesundheit (vereinbarte Termine),
  Team (Check-in, Rituale mit festem Wochentag) und **Google Kalender** (im Mockup simuliert, mit „G“ markiert).
- **Doppelte Einträge:** Ein Google-Termin mit gleichem Titel wie ein Gesundheitstermin wird zusammengeführt und gilt dort als „Termin steht“.
- **Bringen & Abholen:** feste Wochenvorlage Mo–Fr (wer, wann). Hat die Person an dem Tag einen ganztägigen Google-Termin, wird ein Konflikt angezeigt.
- **Ansicht:** 7 Tage ab heute, blättern, Filter Alle / Meine / Google, „+ Termin“ (würde in Google angelegt).
- **Später in der echten App:** Google Kalender lesend anbinden; optional App-Termine (z. B. U7) in den Kalender schreiben.

## Bereich: Finanzen (Mockup steht, alles editierbar)

Leitlinien: Überblick statt Buchhaltung · Werte von Hand, keine Bankanbindung · Gemeinschaftskonto + eigene Konten.
- **Überblick:** „Euer Monat“ als Balken: Fixkosten · Sparen · Alltagsbudget · bleibt persönlich.
  „Gemeinsames Konto“: Bedarf pro Monat (gemeinsame Fixkosten + Sparraten + Alltagsbudget), Kindergeld fließt direkt drauf,
  den Rest zahlen André und Natalia **nach Einkommen** oder **50/50** (Einstellung); darunter, was jedem persönlich bleibt.
  **Monats-Check** (Kontostand + Notiz): wird zu Monatsbeginn fällig und erscheint dann im Center-Briefing; Verlauf darunter.
- **Fixkosten:** eigene Posten (monatlich/vierteljährlich/jährlich → auf Monat umgerechnet) plus automatisch die Verträge aus dem Papierkram;
  pro Posten das Konto (gemeinsam / André / Natalia).
- **Sparen:** Sparziele mit Stand, Ziel, Rate und „erreicht in ca. x Monaten“; verknüpfbar mit Zielen (Betrag erscheint auf der Ziel-Karte).
- **Potenziale:** die bisherige Family-Income-App: Erstattungen, Zuschüsse, Verkäufe, Steuer, Einsparungen … mit geschätzt/tatsächlich, Status, Priorität.

## Bereich: Kinder & Entwicklung (Mockup steht, alles editierbar)

Grundsätze: **Festhalten in 5 Sekunden** · **strukturiert sich selbst** (Woche, Fixkosten, Check-in, U-Untersuchungen) · **regelmäßiger Blick ohne Aufwand**.
Acht Entwicklungsbereiche: Motorik & Sport · Sprache & Lesen · Sozial-emotional · Denken & Neugier · Kreativität & Musik · Selbstständigkeit · Natur & Welt · **Sprachen** (mehrsprachig).

- **Übersicht beider Kinder:** Schnelleingabe „Moment festhalten“ (Kind · Beobachtung/Zitat/Meilenstein · Bereich optional · Text),
  Kinder-Karten mit Bereichs-Matrix, letztem Moment und nächstem Entwicklungs-Check. Zweiter Reiter **Kita & Betreuung**:
  Elterngespräche (Notizen + Vereinbarungen), Kita-Kontakte, Betreuungsnetz (Großeltern, Babysitter) mit Anruf-Knopf.
- **Pro Kind:** Überblick (U-Untersuchungen, fälliger Check, Schnelleingabe, Bereichs-Karten mit letzter Einschätzung, Diese Woche,
  letzte Momente, Sprachen, letztes Elterngespräch) · **Themen** als Board (Gefördert · Geplant · Ideen · Pausiert) mit Warum, Zuständigkeit,
  Wochentag/Uhrzeit (→ Woche) und Kosten (→ Fixkosten) plus „Ideen fürs Alter“ zum Übernehmen · **Momente** als Tagebuch nach Monaten ·
  **Check** (alle 3 Monate): pro Bereich Blüht auf / Läuft / Braucht Aufmerksamkeit + Notiz, dazu Vorhaben; Verlauf; fällige Checks erscheinen im Center.
- **Bereichsseite:** Themen, Ideen und Momente des Bereichs; bei „Sprachen“ zusätzlich pro Sprache: wer sie spricht, Stand.
- Sprachen: Deutsch (André, Kita, Großeltern), Portugiesisch (Natalia), Englisch (Elternsprache untereinander, die Kinder hören sie passiv mit).

## Ideen-Katalog (Kinder)

- Datei: `mockup/catalog/ideen-katalog.json` (lesbar, erweiterbar), erzeugt aus `tools/build_catalog.py` (`python3 tools/build_catalog.py`).
- 175 Ideen für 0–6 Jahre in allen 8 Bereichen, jeweils mit Titel und kurzem Tipp auf Deutsch und Englisch und einem Altersfenster in Monaten.
  Das Skript prüft, dass jeder Monat in jedem Bereich mindestens 3 Ideen hat.
- In der App: Reiter **Ideen-Katalog** (blättern nach Lebensjahr und Monat, Sprung zu Naras/Levis aktuellem Alter, „neu“ = ab diesem Monat passend,
  „+“ übernimmt die Idee als Thema für das gewählte Kind, ✓ = schon übernommen). Auf den Kinderseiten erscheinen automatisch die passenden Ideen fürs aktuelle Alter.
- Erweiterung: Schulalter (6–10 Jahre) und eine KI-Schicht (lokal über Ollama oder günstig per Claude-API, anonymisiert), die auf Momente und Themen eingeht.
