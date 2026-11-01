"""Baut eine Offline-Version von Family OS: eine einzige HTML-Datei, ohne Cloud, ohne Login, ohne unsere Daten.

Aufruf:  python3 tools/build_offline.py      ->  offline/Family OS.html

- Namen der Eltern und Kinder fragt die Datei beim ersten Öffnen ab (Einrichtung), nichts davon steht im Code.
- Alle Beispiel-Einträge sind leer, der Ideen-Katalog (Lernkatalog) ist eingebaut.
- Daten liegen im Browser (localStorage) auf diesem Rechner; Sichern/Laden als Datei ist eingebaut.
- Finanzen (Familienkasse) fehlen, die hängen an unserer eigenen Cloud.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = ROOT / "offline" / "Family OS.html"


def must(src: str, old: str, new: str, count: int = 1) -> str:
    n = src.count(old)
    if n < count:
        raise SystemExit(f"Nicht gefunden ({n}/{count}): {old[:80]!r}")
    return src.replace(old, new)


EMPTY = {
    "ADMIN": '({deadlines: [], contracts: [], docs: [], handled: {}})',
    "HOME": '({chores: [], shop: [], log: []})',
    "HEALTH": '({u: {}, appts: [], profiles: {}})',
    "GOALS": '({goals: [], bucket: [], memories: []})',
    "WEEK": '({gcal: [], logistics: {}})',
    "FIN": '({settings: {split: "income", daily: 0}, incomes: [], fixed: [], contractAcct: {}, savings: [], potentials: [], checks: []})',
    "KIDS": '({topics: [], moments: [], checks: [], languages: {}, kita: {contacts: [], talks: [], care: []}})',
}


def empty_examples(src: str) -> str:
    lines = src.split("\n")
    out, i = [], 0
    while i < len(lines):
        m = re.match(r"^const ([A-Z]+)_EXAMPLES = ", lines[i])
        if m and m.group(1) in EMPTY:
            j = i
            while not re.match(r"^}\);?\s*$", lines[j]):
                j += 1
            out.append(f"const {m.group(1)}_EXAMPLES = () => {EMPTY[m.group(1)]};")
            i = j + 1
            continue
        out.append(lines[i])
        i += 1
    return "\n".join(out)


def team_examples(src: str) -> str:
    """Team: die Check-in-Agenda ist allgemein und bleibt, Rituale, Werte und Protokolle starten leer."""
    start = src.index("const TEAM_EXAMPLES = () => ({")
    end = src.index("\n});", start) + 4
    block = src[start:end]
    agenda = block[block.index("agenda: ["): block.index("]}", block.index("agenda: [")) + 1]
    agenda = must(agenda, 'L("Abwechselnd Nara und Levi", "Alternating Nara and Levi")', 'L("Abwechselnd je ein Kind", "One child at a time")')
    new = ("const TEAM_EXAMPLES = () => ({\n  checkin: {day: 0, time: \"20:00\", dur: 30, " + agenda + "},\n"
           "  rituals: [], values: [], good: [], logs: []\n});")
    return src[:start] + new + src[end:]


def app_js() -> str:
    s = (SITE / "app.js").read_text("utf-8")
    s = team_examples(empty_examples(s))
    # Personen aus der Einrichtung statt fester Namen
    s = must(s, 'const KIDS = {  // topics, moments, checks etc. live in the editable KD store (see Kinder & Entwicklung)\n'
                '  nara: {name: "Nara", c: "var(--coral)", born: D(2022, 8, 16)},\n'
                '  levi: {name: "Levi", c: "var(--mustard)", born: D(2025, 4, 5)}\n};',
             'const KIDS = Object.fromEntries((FAM.kids || []).map((k, i) => ["k" + (i + 1), {name: k.name,\n'
             '  c: ["var(--coral)", "var(--mustard)", "var(--sage)", "var(--teal)"][i % 4], born: new Date(k.born + "T00:00:00")}]));\n'
             'const KIDN = () => Object.fromEntries(Object.entries(KIDS).map(([k, v]) => [k, v.name]));')
    s = must(s, 'nara: "Nara", levi: "Levi"', "...KIDN()", 6)
    s = must(s, 'const people = [["A", "var(--sky)", "André"], ["N", "var(--rose)", "Natalia"], ["Na", "var(--coral)", "Nara"], ["L", "var(--mustard)", "Levi"]];',
             'const people = [[FAM.p1.slice(0, 1), "var(--sky)", FAM.p1], [FAM.p2.slice(0, 1), "var(--rose)", FAM.p2], ...Object.values(KIDS).map(k => [k.name.slice(0, 2), k.c, k.name])];')
    s = must(s, 'const id = isoWeek(nextCheckin()) % 2 ? "levi" : "nara", k = KIDS[id];',
             'const ks = Object.keys(KIDS); if (!ks.length) return ""; const id = ks[isoWeek(nextCheckin()) % ks.length], k = KIDS[id];')
    s = must(s, '["A", "N", "nara", "levi"]', '["A", "N", ...Object.keys(KIDS)]')
    s = re.sub(r"// Saved data from before the languages were known:.*?\n(?=const saveKids)", "", s, flags=re.S)
    s = must(s, 'let catKid = "nara";', 'let catKid = Object.keys(KIDS)[0] || "";')
    s = must(s, '{kid: "nara"', "{kid: Object.keys(KIDS)[0]", 2)
    s = must(s, '"André + Natalia"', 'FAM.p1 + " + " + FAM.p2', 2)
    s = must(s, "André ${", "${FAM.p1} ${", 3)
    s = must(s, "Natalia ${", "${FAM.p2} ${", 3)
    s = s.replace('"André"', "FAM.p1").replace('"Natalia"', "FAM.p2")
    s = must(s, 'note: "Gemeinsam mit Natalia und André, gespeichert in eurer Supabase (Frankfurt)."',
             'note: "Gespeichert nur in diesem Browser auf diesem Rechner. Denkt ab und zu ans Sichern."')
    s = must(s, 'note: "Shared between Natalia and André, stored in your Supabase (Frankfurt)."',
             'note: "Stored only in this browser on this computer. Remember to back up now and then."')
    # Mehrsprachigkeit allgemein statt Portugiesisch
    for de, en in (("Lieder auf Portugiesisch", "Songs in Portuguese"), ("Bücher auf Portugiesisch", "Books in Portuguese")):
        s = must(s, f'"{de}", "{en}"', f'"{de.replace("auf Portugiesisch", "in der Familiensprache")}", "{en.replace("in Portuguese", "in the family language")}"')
    s = must(s, '"Videocall mit der portugiesischsprachigen Familie", "Video calls with the Portuguese-speaking family"',
             '"Videocall mit Verwandten in der Familiensprache", "Video calls with relatives in the family language"')
    # Finanzen gibt es offline nicht (hängen an der Familienkasse)
    s = must(s, 'const ORBIT = ["kids", "home", "team", "admin", "money", "health", "goals"];', 'const ORBIT = ["kids", "home", "team", "admin", "health", "goals"];')
    s = must(s, 'if (route()[0] === "money") { location.href = "/kasse/"; return; }', 'if (route()[0] === "money") { location.hash = ""; return; }')
    s = must(s, 'L("Die Zeitachse über alle Bereiche – plus euer Google Kalender", "The timeline across all areas – plus your Google Calendar")',
             'L("Die Zeitachse über alle Bereiche", "The timeline across all areas")')
    s = re.sub(r"\n *// Finanzen = die Familienkasse[^\n]*", "", s)
    # Mockup-Hinweise passend für die Offline-Version
    for old, new in (
        ('reset: "Beispiele zurücksetzen", resetQ: "Alle eigenen Einträge löschen und Beispiele wiederherstellen?"', 'reset: "Bereich leeren", resetQ: "Alle Einträge in diesem Bereich löschen?"'),
        ('reset: "Reset examples", resetQ: "Delete all your own entries and restore the examples?"', 'reset: "Clear this area", resetQ: "Delete all entries in this area?"'),
        ('hint: "Neue Einträge werden nur in diesem Browser gespeichert (Mockup)."', 'hint: ""'),
        ('hint: "New entries are only saved in this browser (mockup)."', 'hint: ""'),
        ('newEvent: "Neuer Termin (wird in Google Kalender angelegt – simuliert)"', 'newEvent: "Neuer Termin"'),
        ('newEvent: "New event (created in Google Calendar – simulated)"', 'newEvent: "New event"'),
        ('gHint: "Termine mit Uhrzeit kommen aus eurem Google Kalender (im Mockup simuliert). Fristen, Aufgaben und Routinen kommen aus den Bereichen."', 'gHint: "Termine mit Uhrzeit tragt ihr hier ein. Fristen, Aufgaben und Routinen kommen automatisch aus den Bereichen."'),
        ('gHint: "Timed events come from your Google Calendar (simulated in the mockup). Deadlines, tasks and routines come from the areas."', 'gHint: "Add timed events here. Deadlines, tasks and routines come from the areas automatically."'),
        ('google: "Google", fromGoogle: "Google Kalender"', 'google: "Termine", fromGoogle: "Termin"'),
        ('google: "Google", fromGoogle: "Google Calendar"', 'google: "Events", fromGoogle: "Event"'),
    ):
        s = s.replace(old, new) if old.startswith('hint') else must(s, old, new)
        if old.startswith('hint'):
            pass
    if "(Mockup)" in s or "simuliert" in s:
        raise SystemExit("Mockup-Hinweis übrig")
    # Katalog ist eingebaut (file:// darf nichts nachladen)
    s = must(s, 'fetch("catalog/ideen-katalog.json").then(r => r.ok ? r.json() : null).then(d => { if (d) { CATALOG = d; render(); } }).catch(() => {});',
             "CATALOG = window.FOS_CATALOG || null;")
    left = re.findall(r".{0,40}(?:André|Natalia|\bnara\b|\blevi\b|Nara|Levi|ortug|Supabase|/kasse/).{0,40}", s)
    left = [x for x in left if '"/kasse/"' not in x]  # tote Links des entfernten Finanz-Bereichs
    if left:
        raise SystemExit("Noch persönliche Stellen übrig:\n" + "\n".join(left))
    return s


def catalog() -> dict:
    c = json.loads((SITE / "catalog" / "ideen-katalog.json").read_text("utf-8"))
    swaps = [
        ("Portugiesische Wiegenlieder", "Wiegenlieder in der Familiensprache"), ("Portuguese lullabies", "Lullabies in the family language"),
        ("der portugiesischsprachigen Familie", "Verwandten in der Familiensprache"), ("the Portuguese-speaking family", "relatives in the family language"),
        ("Portugiesischsprachige Spielgruppe suchen", "Spielgruppe in der Familiensprache suchen"), ("a Portuguese-speaking playgroup", "a playgroup in the family language"),
        ("Portugiesische Buchstaben entdecken", "Besondere Buchstaben der Familiensprache entdecken"), ("Discover Portuguese letters", "Discover the special letters of the family language"),
        ("ç, ã, õ – ", "Akzente und Sonderzeichen – "), ("ç, ã, õ – ", "Accents and special characters – "),
        ("Portugiesisch-Unterricht für Kinder", "Sprachunterricht für Kinder"), ("Portuguese classes for kids", "Language classes for kids"),
        ("auf Portugiesisch", "in der Familiensprache"), ("in Portuguese", "in the family language"),
    ]
    for idea in c["ideas"]:
        for k, v in list(idea.items()):
            if isinstance(v, str):
                for a, b in swaps:
                    if a == "ç, ã, õ – ":
                        v = v.replace(a, b if k.endswith("_de") or k == "de" else "Accents and special characters – ") if a in v else v
                    else:
                        v = v.replace(a, b)
                idea[k] = v
    rest = [i for i in c["ideas"] if re.search("ortug|ç, ã", json.dumps(i, ensure_ascii=False))]
    if rest:
        raise SystemExit(f"Katalog noch mit Portugiesisch: {rest}")
    return c


BOOT = r"""
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'fos.family.v1';
  const mem = {};
  const LS = (() => { try { localStorage.setItem('fos.t', '1'); localStorage.removeItem('fos.t'); return localStorage; } catch (e) { return null; } })();
  window.FOMStore = { getItem: (k) => (LS ? LS.getItem(k) : (k in mem ? mem[k] : null)), setItem: (k, v) => { if (LS) LS.setItem(k, v); else mem[k] = v; } };
  let fam = null; try { fam = JSON.parse(FOMStore.getItem(KEY)); } catch (e) {}
  const de = () => (FOMStore.getItem('fom.pref.lang') || 'de') !== 'en';
  const T = (d, e) => (de() ? d : e);

  // ---------- Einrichtung: wer gehört zur Familie?
  function setup(edit) {
    $('wrap').hidden = true; const box = $('login'); box.hidden = false;
    box.innerHTML = `<div class="setup">
      <h2>${edit ? T('Familie bearbeiten', 'Edit family') : T('Willkommen bei Family OS', 'Welcome to Family OS')}</h2>
      <p>${T('Wer gehört zu euch? Die Namen bleiben nur auf diesem Rechner, nichts geht ins Internet.', 'Who is in your family? Names stay on this computer only, nothing goes online.')}</p>
      <form id="sform">
        <label>${T('Du', 'You')}<input id="sp1" required maxlength="24" placeholder="${T('Vorname', 'First name')}"></label>
        <label>${T('Partner:in', 'Partner')}<input id="sp2" required maxlength="24" placeholder="${T('Vorname', 'First name')}"></label>
        <div class="slabel">${T('Kinder (optional)', 'Children (optional)')}</div>
        <div id="skids"></div>
        <button type="button" class="ghost" id="saddkid">+ ${T('Kind', 'Child')}</button>
        <div class="sact"><button type="submit">${edit ? T('Speichern', 'Save') : T('Los geht\'s', 'Get started')}</button>${edit ? `<button type="button" class="ghost" id="scancel">${T('Abbrechen', 'Cancel')}</button>` : ''}</div>
      </form>
      ${edit ? '' : `<p class="small">${T('Ihr habt schon eine Sicherung?', 'Already have a backup?')} <a href="#" id="sload">${T('Sicherung laden', 'Load backup')}</a></p>`}
    </div>`;
    const addKid = (k = {}) => {
      if ($('skids').children.length >= 6) return;
      const r = document.createElement('div'); r.className = 'skid';
      r.innerHTML = `<input class="kn" maxlength="24" placeholder="${T('Name', 'Name')}"><input class="kb" type="date" aria-label="${T('Geburtstag', 'Birthday')}"><button type="button" class="x" aria-label="${T('Entfernen', 'Remove')}">×</button>`;
      r.querySelector('.kn').value = k.name || ''; r.querySelector('.kb').value = k.born || '';
      r.querySelector('.x').onclick = () => r.remove(); $('skids').appendChild(r);
    };
    if (fam) { $('sp1').value = fam.p1; $('sp2').value = fam.p2; (fam.kids || []).forEach(addKid); } else addKid();
    $('saddkid').onclick = () => addKid();
    if ($('scancel')) $('scancel').onclick = () => location.reload();
    if ($('sload')) $('sload').onclick = (e) => { e.preventDefault(); restore(); };
    $('sform').onsubmit = (e) => {
      e.preventDefault();
      const p1 = $('sp1').value.trim(), p2 = $('sp2').value.trim();
      if (p1.toLowerCase() === p2.toLowerCase()) { alert(T('Bitte zwei verschiedene Namen eintragen.', 'Please enter two different names.')); return; }
      const kids = [...document.querySelectorAll('.skid')].map((r) => ({ name: r.querySelector('.kn').value.trim(), born: r.querySelector('.kb').value }))
        .filter((k) => k.name);
      if (kids.some((k) => !k.born)) { alert(T('Bitte bei jedem Kind den Geburtstag eintragen, daraus kommen die Ideen fürs Alter.', 'Please add a birthday for each child; age-based ideas depend on it.')); return; }
      FOMStore.setItem(KEY, JSON.stringify({ p1, p2, kids }));
      if (fam && FOMStore.getItem('fom.pref.user') === fam.p1) FOMStore.setItem('fom.pref.user', p1);
      if (fam && FOMStore.getItem('fom.pref.user') === fam.p2) FOMStore.setItem('fom.pref.user', p2);
      location.hash = ''; location.reload();
    };
  }

  // ---------- Sichern und Laden
  const keys = () => { const out = {}; if (LS) for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (/^fo[ms]\./.test(k)) out[k] = LS.getItem(k); } else Object.assign(out, mem); return out; };
  function backup() {
    const data = { app: 'family-os-offline', version: 1, saved: new Date().toISOString(), keys: keys() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = `family-os-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    FOMStore.setItem('fos.lastBackup', new Date().toISOString());
  }
  function restore() {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = async () => {
      try {
        const d = JSON.parse(await i.files[0].text());
        if (d.app !== 'family-os-offline' || !d.keys) throw new Error(T('Das ist keine Family-OS-Sicherung.', 'This is not a Family OS backup.'));
        if (!confirm(T('Sicherung laden? Alles, was gerade hier steht, wird ersetzt.', 'Load backup? Everything currently here will be replaced.'))) return;
        Object.keys(keys()).forEach((k) => { if (LS) LS.removeItem(k); else delete mem[k]; });
        Object.entries(d.keys).forEach(([k, v]) => FOMStore.setItem(k, v));
        location.hash = ''; location.reload();
      } catch (e) { alert(T('Laden hat nicht geklappt: ', 'Loading failed: ') + e.message); }
    };
    i.click();
  }

  // ---------- Start
  if (!fam || !fam.p1 || !fam.p2) { setup(false); return; }
  window.FAM = fam;
  const pu = FOMStore.getItem('fom.pref.user');
  window.FOM_USER = pu === fam.p1 || pu === fam.p2 ? pu : fam.p1;
  window.FOM_LANG = FOMStore.getItem('fom.pref.lang') || 'de';
  $('login').hidden = true; $('wrap').hidden = false;
  const s = document.createElement('script'); s.textContent = $('fos-app').textContent; document.body.appendChild(s);
  const tail = document.createElement('div'); tail.className = 'footnote offbar';
  const link = (t, fn) => { const a = document.createElement('a'); a.href = '#'; a.textContent = t; a.onclick = (e) => { e.preventDefault(); fn(); }; return a; };
  tail.append(link(T('Sichern', 'Back up'), backup), ' · ', link(T('Sicherung laden', 'Load backup'), restore), ' · ', link(T('Familie bearbeiten', 'Edit family'), () => setup(true)));
  const last = FOMStore.getItem('fos.lastBackup');
  if (!last || Date.now() - Date.parse(last) > 30 * 864e5) tail.append(document.createElement('br'), T('Letzte Sicherung: ', 'Last backup: ') + (last ? new Date(last).toLocaleDateString() : T('noch nie', 'never')));
  $('note').after(tail);
  if (!LS) { const w = document.createElement('div'); w.className = 'footnote'; w.textContent = T('Achtung: Dieser Browser erlaubt hier kein Speichern. Bitte mit Chrome, Edge, Firefox oder Safari öffnen.', 'Note: this browser does not allow saving here. Please open with Chrome, Edge, Firefox or Safari.'); tail.after(w); }
})();
"""

SETUP_CSS = """
.setup { display: flex; flex-direction: column; gap: 14px; }
.setup form { display: flex; flex-direction: column; gap: 12px; }
.setup label { display: flex; flex-direction: column; gap: 4px; font-weight: 600; font-size: .9rem; }
.login .setup input { flex: none; width: 100%; border-radius: 12px; padding: 10px 12px; font: inherit; padding: 10px 12px; border-radius: 12px; border: 1.5px solid var(--line, #dcd8db); background: var(--bg, #fff); color: inherit; }
.setup .slabel { font-weight: 600; font-size: .9rem; margin-top: 4px; }
.login .setup .skid { display: grid; grid-template-columns: minmax(0, 1fr) 10.5rem 2.2rem; gap: 8px; margin-bottom: 8px; }
.setup .x { border: 0; background: none; font-size: 1.3rem; cursor: pointer; color: inherit; opacity: .6; }
.setup .ghost { align-self: flex-start; }
.setup .sact { display: flex; gap: 10px; margin-top: 6px; }
.setup .small { font-size: .85rem; opacity: .8; }
.offbar a { text-decoration: underline; }
"""


def build() -> Path:
    html = (SITE / "index.html").read_text("utf-8")
    css = (SITE / "app.css").read_text("utf-8")
    app = app_js().replace("</script", "<\\/script")
    cat = json.dumps(catalog(), ensure_ascii=False).replace("</", "<\\/")
    html = re.sub(r'<link rel="stylesheet" href="app\.css[^"]*">', lambda _: f"<style>\n{css}\n{SETUP_CSS}</style>", html)
    html = must(html, '<script src="config.js"></script>\n<script src="boot.js"></script>',
                f'<script>window.FOS_CATALOG = {cat};</script>\n<script type="text/plain" id="fos-app">\n{app}\n</script>\n<script>{BOOT}</script>')
    html = re.sub(r'<div class="login" id="login" hidden>.*?\n</div>\n(?=<div class="wrap")', '<div class="login" id="login" hidden></div>\n', html, flags=re.S)
    for bad in ("André", "Natalia", "Nara", "Levi", "supabase", "Supabase"):
        if bad in html:
            raise SystemExit(f"{bad!r} steckt noch in der Datei")
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, "utf-8")
    return OUT


if __name__ == "__main__":
    p = build()
    print(f"Fertig: {p.relative_to(ROOT)} ({p.stat().st_size // 1024} KB)")
