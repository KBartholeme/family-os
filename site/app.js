const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })(); // Web-App: echtes Heute
const L = (de, en) => ({de, en});
const D = (y, m, d) => new Date(y, m - 1, d);
let lang = window.FOM_LANG || "de", user = window.FOM_USER || "André", kidFilter = null, prevDepth = 0, zoomFrom = null;
const tx = x => x == null ? "" : typeof x === "string" ? x : x[lang];
const dayDiff = d => Math.round((d - TODAY) / 864e5);
const fmt = d => d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {day: "numeric", month: "short"});
const me = () => user === "André" ? "A" : "N";

const T = {
  de: {center: "Center", family: "Unsere Familie", brief: "Was gerade wichtig ist", load: "Wer trägt gerade was",
    hello: h => h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend", today: TODAY.toLocaleDateString("de-DE", {weekday: "long", day: "numeric", month: "long"}),
    youCarry: p => `Du trägst gerade ${p} %`, forYou: "für dich", you: "Du",
    years: "J.", months: "Mon.",
    inDays: n => n === 0 ? "heute" : n === 1 ? "morgen" : `in ${n} Tagen`, overdue: n => `${-n} T. drüber`, check: "prüfen",
    status: {active: "Wird gefördert", planned: "Geplant", idea: "Idee", paused: "Pausiert", none: "Noch nichts"},
    empty: "Noch nichts eingetragen", gap: "Länger nichts passiert – bewusst?",
    ideasH: "Ideen fürs Alter", ideasP: "Typisch in diesem Alter. Antippen → landet als Idee im Bereich.", added: "Idee von",
    done: "erledigt?", topics: "Themen", history: "Verlauf & Beobachtungen", noHistory: "Noch keine Beobachtungen",
    tapKid: "Kind antippen zum Reinzoomen", arrange: "Tipp: Bereiche lassen sich per Ziehen umsortieren.",
    note: "Gemeinsam mit Natalia und André, gespeichert in eurer Supabase (Frankfurt)."},
  en: {center: "Center", family: "Our family", brief: "What matters right now", load: "Who's carrying what",
    hello: h => h < 11 ? "Good morning" : h < 18 ? "Hi" : "Good evening", today: TODAY.toLocaleDateString("en-GB", {weekday: "long", day: "numeric", month: "long"}),
    youCarry: p => `You're carrying ${p}%`, forYou: "for you", you: "You",
    years: "y", months: "m",
    inDays: n => n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`, overdue: n => `${-n}d over`, check: "check",
    status: {active: "Active", planned: "Planned", idea: "Idea", paused: "Paused", none: "Nothing yet"},
    empty: "Nothing here yet", gap: "Nothing for a while – on purpose?",
    ideasH: "Ideas for this age", ideasP: "Typical at this age. Tap → added as an idea in that area.", added: "Idea by",
    done: "done?", topics: "Topics", history: "History & observations", noHistory: "No observations yet",
    tapKid: "Tap a child to zoom in", arrange: "Tip: drag areas to rearrange them.",
    note: "Shared between Natalia and André, stored in your Supabase (Frankfurt)."}
};

const PEOPLE = {A: {name: "André"}, N: {name: "Natalia"}};
const STATUS_C = {active: "var(--active)", planned: "var(--planned)", idea: "var(--idea)", paused: "var(--paused)", none: "var(--none)"};
const AREAS = {
  motor: L("Motorik & Sport", "Motor skills & sport"), lang: L("Sprache & Lesen", "Language & reading"),
  social: L("Sozial-emotional", "Social-emotional"), mind: L("Denken & Neugier", "Thinking & curiosity"),
  creative: L("Kreativität & Musik", "Creativity & music"), indep: L("Selbstständigkeit", "Independence"),
  nature: L("Natur & Welt", "Nature & world"), langs: L("Sprachen", "Languages")
};
const RANK = {active: 4, planned: 3, idea: 2, paused: 1};

const KIDS = {  // topics, moments, checks etc. live in the editable KD store (see Kinder & Entwicklung)
  nara: {name: "Nara", c: "var(--coral)", born: D(2022, 8, 16)},
  levi: {name: "Levi", c: "var(--mustard)", born: D(2025, 4, 5)}
};

const DOM = {
  kids: {icon: "🌱", c: "var(--sage)", short: L("Kinder", "Kids"), name: L("Kinder & Entwicklung", "Kids & development"), desc: L("Was wir fördern, was wir erleben, wohin es geht", "What we foster, what we experience, where it's going"),
    get sections() { return [{h: L("Kinder", "Kids"), items: Object.keys(KIDS).filter(kidCheckDue).map(k => ({t: L(`Entwicklungs-Check ${KIDS[k].name}`, `Development check ${KIDS[k].name}`), o: "AN", due: nextKidCheck(k)}))}]; }},
  week: {icon: "📅", c: "var(--sky)", short: L("Woche", "Week"), name: L("Woche", "Week"), desc: L("Die Zeitachse über alle Bereiche – plus euer Google Kalender", "The timeline across all areas – plus your Google Calendar"),
    get sections() { return [{h: L("Woche", "Week"), items: []}]; }, sig: () => ""},
  home: {icon: "🏡", c: "var(--mustard)", short: L("Haushalt", "Home"), name: L("Haushalt", "Home"), desc: L("Aufgaben, Routinen und Einkauf – fair verteilt", "Tasks, routines and groceries – shared fairly"),
    // Chores only reach the Center briefing when overdue; otherwise they would flood it every day.
    get sections() { return [{h: L("Aufgaben", "Tasks"), items: openChores().map(c => ({t: c.t, o: whoNow(c), due: dayDiff(parse(c.next)) < 0 ? parse(c.next) : undefined}))}]; },
    sig: () => TH[lang].dueToday(openChores().filter(c => dayDiff(parse(c.next)) <= 0).length)},
  team: {icon: "🤝", c: "var(--coral)", short: L("Team", "Team"), name: L("Team & Rituale", "Team & rituals"), desc: L("Wie wir als Familie und als Paar funktionieren wollen", "How we want to work as a family and as a couple"),
    get sections() { return [{h: L("Check-in", "Check-in"), items: []}]; },
    sig: () => `${TT[lang].daysShort[TEAM.checkin.day]} ${TEAM.checkin.time}`},
  admin: {icon: "🗂️", c: "var(--plum)", short: L("Papierkram", "Paperwork"), name: L("Papierkram", "Paperwork"), desc: L("Fristen, Verträge und Dokumente an einem Ort", "Deadlines, contracts and documents in one place"),
    get sections() { return [{h: L("Fristen", "Deadlines"), items: openRadar().map(i => ({t: i.t, o: i.o, due: i.due}))}]; },
    sig: s => { const n = s[0].items.filter(i => dayDiff(i.due) <= 60).length; return lang === "de" ? `${n} bald fällig` : `${n} due soon`; }},
  // Finanzen = die Familienkasse (läuft unter /kasse/ auf derselben Adresse, gleicher Login). Zahlen kommen aus ihrer Auswertung.
  money: {icon: "💰", c: "var(--teal)", short: L("Finanzen", "Money"), name: L("Familienkasse", "Family finances"), desc: L("Rückblick, Planung, Fixkosten, Potenziale und Vermögen", "Review, planning, fixed costs, potentials and wealth"),
    get sections() { const k = window.FK_SUM, items = [];
      if (k && k.needsEntry) items.push({t: L(`Vermögensstand für ${k.dueName.de} eintragen`, `Enter ${k.dueName.en} balance`), o: "AN", due: TODAY});
      if (k && k.planSave < 0) items.push({t: L(`Plan ${k.planName.de} geht noch nicht auf`, `${k.planName.en} plan doesn't add up yet`), o: "AN", warn: true});
      (k ? k.doing : []).forEach(i => items.push({t: i.title, o: i.owner === "Natalia" ? "N" : i.owner === "André" ? "A" : "AN"}));
      return [{h: L("Familienkasse", "Family finances"), items}]; },
    sig: () => { const k = window.FK_SUM; if (!k) return lang === "de" ? "Familienkasse" : "Family finances";
      const v = (k.planSave > 0 ? "+" : "") + eur(k.planSave); return lang === "de" ? `Plan ${k.planName.de}: ${v}` : `${k.planName.en} plan: ${v}`; }},
  health: {icon: "❤️", c: "var(--rose)", short: L("Gesundheit", "Health"), name: L("Gesundheit", "Health"), desc: L("Vorsorge, Arzttermine, Steckbriefe und Ärzte", "Check-ups, appointments, profiles and doctors"),
    get sections() { return [{h: L("Termine", "Appointments"), items: healthItems().map(i => ({o: i.o, warn: hGroup(i) === "check",
      t: i.state === "unknown" ? L(`${tx(i.t)} – erledigt?`, `${tx(i.t)} – done?`) : i.t, due: i.booked ? new Date(i.booked) : i.due}))}]; },
    sig: s => { const n = s[0].items.filter(i => i.warn).length; return n ? (lang === "de" ? `${n} zu klären` : `${n} to clarify`) : (lang === "de" ? "alles gut" : "all good"); }},
  goals: {icon: "✨", c: "var(--peach)", short: L("Ziele", "Goals"), name: L("Ziele & Erinnerungen", "Goals & memories"), desc: L("Gemeinsame Ziele, Bucket List und Familien-Journal", "Shared goals, bucket list and family journal"),
    get sections() { return [{h: L("Ziele", "Goals"), items: activeGoals().map(g => ({t: g.t, o: g.o}))}]; },
    sig: () => lang === "de" ? `${activeGoals().length} Ziele · ${GOALS.bucket.filter(b => b.status !== "done").length} Träume` : `${activeGoals().length} goals · ${GOALS.bucket.filter(b => b.status !== "done").length} dreams`}
};
// Line icons (24×24, stroke) used by themes that set <html data-icons="line">; other themes keep the emoji.
const ICON_PATHS = {
  kids: '<path d="M12 21v-9"/><path d="M12 12c0-4.5-3-7-8-7 0 4.5 3 7 8 7z"/><path d="M12 10c0-3.5 2.6-6 7-6 0 3.5-2.6 6-7 6z"/>',
  week: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z"/>',
  team: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9" r="2.5"/><path d="M15.8 14.1c2.5-.2 4.3 1.4 4.7 4.4"/>',
  admin: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><path d="M3 11h18"/>',
  money: '<path d="M19 8V6a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20H19a2 2 0 0 0 2-2v-3"/><path d="M3 6.5A2.5 2.5 0 0 0 5.5 9H19a2 2 0 0 1 2 2v1"/><path d="M21 10.5h-4a2 2 0 0 0 0 4h4z"/>',
  health: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/><path d="M7.5 12.5H10l1.2-2.2 1.8 4 1.3-1.8h2.2"/>',
  goals: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'
};
const ic = id => document.documentElement.dataset.icons === "line"
  ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[id]}</svg>`
  : DOM[id].icon;
const ORBIT = ["kids", "home", "team", "admin", "money", "health", "goals"];  // the week is the timeline below the orbit, not a planet
// Saved arrangement of the orbit (planets can be swapped by dragging).
const ORBIT_KEY = "fom.orbit.v1";
try { const o = JSON.parse(FOMStore.getItem(ORBIT_KEY)); if (Array.isArray(o) && o.length === ORBIT.length && o.every(x => ORBIT.includes(x))) ORBIT.splice(0, ORBIT.length, ...o); } catch (e) {}
let dragEnded = 0;
function bindOrbit(v) {
  const orbit = v.querySelector(".orbit");
  if (!orbit) return;
  orbit.querySelectorAll(".planet").forEach(p => p.onpointerdown = e => {
    const id = p.dataset.go.slice(2), start = {x: e.clientX, y: e.clientY};
    let dragging = false, target = null;
    const slotAt = (x, y) => { const r = orbit.getBoundingClientRect(), dx = x - r.left - r.width / 2, dy = y - r.top - r.height / 2;
      if (Math.hypot(dx, dy) < r.width * 0.2) return null;  // dropped on the family in the middle: no change
      const n = ORBIT.length; return ((Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 90) / (360 / n)) % n) + n) % n; };
    const move = ev => {
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!dragging && Math.hypot(dx, dy) < 8) return;
      if (!dragging) { dragging = true; p.setPointerCapture(e.pointerId); p.classList.add("dragging"); orbit.classList.add("arranging"); }
      p.style.translate = `${dx}px ${dy}px`;
      const slot = slotAt(ev.clientX, ev.clientY);
      orbit.querySelectorAll(".planet").forEach(q => q.classList.toggle("droptarget", slot !== null && q.dataset.go === `#/${ORBIT[slot]}` && q !== p));
      target = slot;
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      if (!dragging) return;
      dragEnded = Date.now();
      const from = ORBIT.indexOf(id);
      if (target !== null && target !== from) { [ORBIT[from], ORBIT[target]] = [ORBIT[target], ORBIT[from]]; try { FOMStore.setItem(ORBIT_KEY, JSON.stringify(ORBIT)); } catch (err) {} }
      render();
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  });
}
const count = s => s.reduce((n, x) => n + x.items.length, 0);

const age = b => { let m = (TODAY.getFullYear() - b.getFullYear()) * 12 + TODAY.getMonth() - b.getMonth(); if (TODAY.getDate() < b.getDate()) m--; return [Math.floor(m / 12), m % 12]; };
const ageStr = b => { const [y, m] = age(b); return `${y} ${T[lang].years} ${m} ${T[lang].months}`; };
const chip = (label, color) => `<span class="chip" style="--k:${color}">${label}</span>`;
const owner = o => !o ? "" : o === "AN" ? chip("André + Natalia", "var(--muted)")
  : chip(o === me() ? T[lang].you : PEOPLE[o].name, o === "A" ? "var(--a)" : "var(--n)");
const dueChip = i => {
  if (i.warn) return chip(T[lang].check, "var(--warn)");
  if (!i.due) return "";
  const n = dayDiff(i.due);
  return chip(n < 0 ? T[lang].overdue(n) : n <= 60 ? T[lang].inDays(n) : fmt(i.due), n <= 30 ? "var(--warn)" : "var(--muted)");
};
const best = (kid, a) => kid.topics.filter(t => t.a === a).reduce((b, t) => RANK[t.s] > (RANK[b] || 0) ? t.s : b, "none");
const mine = o => o === me() || o === "AN";

function briefing() {
  const all = [];
  for (const [id, d] of Object.entries(DOM)) (d.sections || []).forEach(s => s.items.forEach(i => {
    if (i.warn || (i.due && dayDiff(i.due) <= 45)) all.push({...i, dom: id});
  }));
  const urgency = i => i.warn ? -1 : dayDiff(i.due);
  return all.sort((a, b) => (mine(b.o) - mine(a.o)) || urgency(a) - urgency(b)).slice(0, 5);
}
function mentalLoad() {
  let A = 0, N = 0;
  const add = o => { if (o === "A") A++; else if (o === "N") N++; else if (o === "AN") { A += .5; N += .5; } };
  Object.values(DOM).forEach(d => (d.sections || []).forEach(s => s.items.forEach(i => add(i.o))));
  Object.values(KIDS).forEach(k => k.topics.filter(t => t.s === "active" || t.s === "planned").forEach(t => add(t.o)));
  TEAM.rituals.forEach(r => add(r.o));
  return {A, N};
}
function signal(id) {
  const d = DOM[id];
  if (id === "kids") {
    const tp = Object.values(KIDS).flatMap(k => k.topics), n = tp.filter(x => x.s === "active").length;
    return {sig: lang === "de" ? `${n} gefördert` : `${n} active`, urgent: Object.keys(KIDS).filter(kidCheckDue).length};
  }
  return {sig: d.sig(d.sections), urgent: d.sections.flatMap(s => s.items).filter(i => i.warn || (i.due && dayDiff(i.due) <= 30)).length};
}

/* ---------- Views ---------- */
function vCenter() {
  const t = T[lang], ml = mentalLoad(), tot = ml.A + ml.N, pa = Math.round(ml.A / tot * 100), myP = me() === "A" ? pa : 100 - pa;
  const pos = ORBIT.map((_, i) => { const r = (-90 + i * 360 / ORBIT.length) * Math.PI / 180; return [50 + 39 * Math.cos(r), 50 + 39 * Math.sin(r)]; });
  const ring = `<svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="39"/>${pos.map(([x, y]) => `<line x1="50" y1="50" x2="${x}" y2="${y}"/>`).join("")}</svg>`;
  const people = [["A", "var(--sky)"], ["N", "var(--rose)"], ["Na", "var(--coral)"], ["L", "var(--mustard)"]];
  const sun = `<div class="sun"><div><div class="sun-t">${t.family}</div>
    <div class="avatars">${people.map(([i, c]) => `<span class="av" style="background:${c}">${i}</span>`).join("")}</div>
    <div class="sun-sub">André · Natalia · Nara · Levi</div></div></div>`;
  const planets = ORBIT.map((id, i) => { const d = DOM[id], s = signal(id);
    return `<button class="planet" style="left:${pos[i][0]}%;top:${pos[i][1]}%;--c:${d.c};--d:${-i * .7}s" data-go="#/${id}" title="${tx(d.name)}">
      ${s.urgent ? `<span class="badge">${s.urgent}</span>` : ""}<span class="ic">${ic(id)}</span><span class="nm">${tx(d.short)}</span><span class="sig">${s.sig}</span></button>`; }).join("");
  const brief = briefing().map(i => { const d = DOM[i.dom], n = i.due ? dayDiff(i.due) : null;
    return `<a class="note-item" href="#/${i.dom}" style="--c:${d.c}"><span class="ic">${ic(i.dom)}</span>
      <span class="tt">${tx(i.t)}<small>${mine(i.o) ? t.forYou : i.o ? PEOPLE[i.o].name : ""}</small></span>
      <span class="when ${i.warn || n <= 30 ? "w" : ""}">${i.warn ? t.check : n < 0 ? t.overdue(n) : t.inDays(n)}</span></a>`; }).join("");
  return `<div class="centerwrap"><div><div class="orbit">${ring}${sun}${planets}</div><p class="orbit-hint">${t.arrange}</p></div>
    <aside class="side">
      <div class="card"><h3>${t.brief}</h3>${brief}</div>
    </aside></div>${weekStrip()}
    <section class="card loadcard"><div class="lc-main"><h3>${t.load}</h3><p class="load-big">${t.youCarry(myP)}</p>
        <div class="loadbar"><div style="width:${pa}%;background:var(--sky)"></div><div style="width:${100 - pa}%;background:var(--rose)"></div></div>
        <div class="loadlbl"><span>André ${pa} %</span><span>Natalia ${100 - pa} %</span></div></div>
      <div class="lc-feel">${lastFeel()}</div></section>`;
}
const hero = (icon, c, name, sub, letter) => `<div class="hero" style="--c:${c}"><span class="ic"${letter ? ' style="font-family:var(--display);font-weight:800"' : ""}>${icon}</span><div><h1>${name}</h1><p>${sub}</p></div></div>`;

function vDomain(id) {
  const d = DOM[id];
  return hero(ic(id), d.c, tx(d.name), tx(d.desc)) + `<div class="cols">${d.sections.map(s => `<section class="sec"><h3>${tx(s.h)}</h3>${s.items.map(i => `
    <div class="item ${i.warn ? "warn" : ""}"><div style="flex:1"><div class="t">${tx(i.t)}</div>${i.m ? `<div class="m">${tx(i.m)}</div>` : ""}${i.p != null ? `<div class="progress" style="--c:${d.c}"><div style="width:${i.p}%"></div></div>` : ""}</div>
    <div class="chips">${owner(i.o)}${dueChip(i)}</div></div>`).join("")}</section>`).join("")}</div>`;
}
const legend = () => `<div class="legend">${Object.keys(STATUS_C).map(s => `<span><i class="dot" style="background:${STATUS_C[s]}"></i>${T[lang].status[s]}</span>`).join("")}</div>`;

/* ---------- Fristen & Admin ---------- */
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addMonths = (d, n) => { const r = new Date(d.getFullYear(), d.getMonth() + n, 1), last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate(); r.setDate(Math.min(d.getDate(), last)); return r; };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const both = x => typeof x === "string" ? {de: x, en: x} : x;
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
// Only http(s) links are rendered; bare "drive.google.com/…" gets https:// prepended.
const safeUrl = u => { u = (u || "").trim(); if (!u) return ""; if (!/^[a-z]+:/i.test(u)) u = "https://" + u; return /^https?:\/\//i.test(u) ? u : ""; };
const extLink = (u, label) => safeUrl(u) ? `<a class="extlink" href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer">${label} ↗</a>` : "";
const REPEAT_M = {none: 0, monthly: 1, yearly: 12, y2: 24};

const TA = {
  de: {radar: "Fristen", contracts: "Verträge", docs: "Dokumente", addDeadline: "+ Frist", addContract: "+ Vertrag", addDoc: "+ Dokument",
    g: {overdue: "Überfällig", soon: "Nächste 30 Tage", year: "Bis Jahresende", later: "Später"}, doneH: "Erledigt", nothing: "Nichts offen",
    f: {t: "Was?", due: "Bis wann?", kind: "Art", o: "Wer kümmert sich?", remind: "Vorwarnung", repeat: "Wiederholung", note: "Notiz",
      name: "Name", cat: "Kategorie", cost: "Kosten pro Monat (€)", end: "Läuft bis", notice: "Kündigungsfrist (Monate, 0 = jederzeit)",
      where: "Wo liegt das Original?", link: "Link (z. B. Google Drive)", valid: "Gültig bis (leer = unbegrenzt)", who: "Für wen?"},
    kinds: {application: "Antrag", cancel: "Kündigung", renew: "Verlängerung", appointment: "Termin", payment: "Zahlung", other: "Sonstiges"},
    repeats: {none: "Einmalig", monthly: "Monatlich", yearly: "Jährlich", y2: "Alle 2 Jahre"},
    reminds: {3: "3 Tage vorher", 7: "1 Woche vorher", 14: "2 Wochen vorher", 30: "1 Monat vorher", 56: "8 Wochen vorher"},
    cats: {insurance: "Versicherung", energy: "Energie", phone: "Handy & Internet", sub: "Abo", other: "Sonstiges"},
    owners: {A: "André", N: "Natalia", AN: "Beide"}, whos: {A: "André", N: "Natalia", nara: "Nara", levi: "Levi", fam: "Familie"},
    open: "Öffnen", openDoc: "Dokument öffnen", openContract: "Vertrag öffnen", done: "Erledigt ✓", snooze: "1 Woche schieben", edit: "Bearbeiten", del: "Löschen", reopen: "Wieder öffnen", save: "Speichern", cancel: "Abbrechen",
    reset: "Beispiele zurücksetzen", resetQ: "Alle eigenen Einträge löschen und Beispiele wiederherstellen?",
    auto: "automatisch", fromContract: "aus Vertrag", fromDoc: "aus Dokument", remindFrom: d => `Erinnerung ab ${d}`, remindOn: "Erinnerung läuft",
    rolling: "jederzeit kündbar", noticeShort: "Kündigungsfrist", months: n => `${n} ${n === 1 ? "Monat" : "Monate"}`, nextCancel: "Kündigen bis", perMonth: "€/Mon.", fixed: s => `${s} € pro Monat`, noExpiry: "unbegrenzt",
    cancelOrKeep: n => `${n} kündigen oder behalten?`, expires: n => `${n} läuft ab`, newD: "Neue Frist", newC: "Neuer Vertrag", newDoc: "Neues Dokument",
    nextRepeat: "Nächste Wiederholung wird automatisch angelegt.", goSource: "Zur Quelle", autoNote: "Diese Frist entsteht automatisch – ändern kannst du sie an der Quelle.",
    hint: "Neue Einträge werden nur in diesem Browser gespeichert (Mockup)."},
  en: {radar: "Deadlines", contracts: "Contracts", docs: "Documents", addDeadline: "+ Deadline", addContract: "+ Contract", addDoc: "+ Document",
    g: {overdue: "Overdue", soon: "Next 30 days", year: "By end of year", later: "Later"}, doneH: "Done", nothing: "Nothing open",
    f: {t: "What?", due: "By when?", kind: "Type", o: "Who's on it?", remind: "Heads-up", repeat: "Repeats", note: "Note",
      name: "Name", cat: "Category", cost: "Cost per month (€)", end: "Runs until", notice: "Notice period (months, 0 = anytime)",
      where: "Where is the original?", link: "Link (e.g. Google Drive)", valid: "Valid until (empty = no expiry)", who: "For whom?"},
    kinds: {application: "Application", cancel: "Cancellation", renew: "Renewal", appointment: "Appointment", payment: "Payment", other: "Other"},
    repeats: {none: "Once", monthly: "Monthly", yearly: "Yearly", y2: "Every 2 years"},
    reminds: {3: "3 days before", 7: "1 week before", 14: "2 weeks before", 30: "1 month before", 56: "8 weeks before"},
    cats: {insurance: "Insurance", energy: "Energy", phone: "Phone & internet", sub: "Subscription", other: "Other"},
    owners: {A: "André", N: "Natalia", AN: "Both"}, whos: {A: "André", N: "Natalia", nara: "Nara", levi: "Levi", fam: "Family"},
    open: "Open", openDoc: "Open document", openContract: "Open contract", done: "Done ✓", snooze: "Push 1 week", edit: "Edit", del: "Delete", reopen: "Reopen", save: "Save", cancel: "Cancel",
    reset: "Reset examples", resetQ: "Delete all your own entries and restore the examples?",
    auto: "automatic", fromContract: "from contract", fromDoc: "from document", remindFrom: d => `Reminder from ${d}`, remindOn: "Reminder active",
    rolling: "cancel anytime", noticeShort: "Notice period", months: n => `${n} ${n === 1 ? "month" : "months"}`, nextCancel: "Cancel by", perMonth: "€/mo", fixed: s => `€${s} per month`, noExpiry: "no expiry",
    cancelOrKeep: n => `${n}: cancel or keep?`, expires: n => `${n} expires`, newD: "New deadline", newC: "New contract", newDoc: "New document",
    nextRepeat: "The next occurrence is created automatically.", goSource: "Go to source", autoNote: "This deadline is generated automatically – change it at its source.",
    hint: "New entries are only saved in this browser (mockup)."}
};

const ADMIN_EXAMPLES = () => ({
  deadlines: [
    {id: "d1", t: L("Kita-Vertrag Levi unterschreiben", "Sign Levi's daycare contract"), due: "2026-10-31", kind: "application", o: "N", remind: 14, repeat: "none", note: L("Start Februar 2027", "Starts February 2027"), status: "open"},
    {id: "d2", t: L("Schwimmkurs Nara anmelden", "Sign Nara up for swimming"), due: "2026-11-15", kind: "application", o: "N", remind: 14, repeat: "none", note: L("Seepferdchen-Kurs ab Januar", "Beginner course from January"), status: "open"},
    {id: "d3", t: L("Urlaub für Kita-Eingewöhnung beantragen", "Request leave for daycare settling-in"), due: "2026-11-30", kind: "application", o: "A", remind: 14, repeat: "none", note: L("2 Wochen im Februar", "2 weeks in February"), status: "open"},
    {id: "d4", t: L("Steuerunterlagen sammeln", "Collect tax documents"), due: "2027-01-31", kind: "other", o: "AN", remind: 30, repeat: "yearly", note: "", status: "open"},
    {id: "d5", t: L("TÜV / Hauptuntersuchung", "Car inspection"), due: "2027-03-31", kind: "appointment", o: "A", remind: 30, repeat: "y2", note: "", status: "open"},
    {id: "d6", t: L("Kita-Beitrag überweisen", "Pay daycare fee"), due: "2026-10-01", kind: "payment", o: "A", remind: 3, repeat: "monthly", note: "", status: "open"}
  ],
  contracts: [
    {id: "c1", link: "https://drive.google.com/drive/my-drive", name: L("Kfz-Versicherung", "Car insurance"), cat: "insurance", cost: 52, end: "2026-12-31", notice: 1, o: "A"},
    {id: "c2", name: L("Fitnessstudio Natalia", "Gym Natalia"), cat: "sub", cost: 35, end: "2027-03-31", notice: 3, o: "N"},
    {id: "c3", link: "https://drive.google.com/drive/my-drive", name: L("Strom", "Electricity"), cat: "energy", cost: 89, end: "2027-02-28", notice: 1, o: "A"},
    {id: "c4", name: L("Handyvertrag André", "Phone plan André"), cat: "phone", cost: 25, end: "2027-05-15", notice: 3, o: "A"},
    {id: "c5", name: L("Privathaftpflicht", "Liability insurance"), cat: "insurance", cost: 6, end: "2027-07-01", notice: 3, o: "N"},
    {id: "c6", name: L("Hausrat", "Home contents insurance"), cat: "insurance", cost: 9, end: "2027-07-01", notice: 3, o: "N"},
    {id: "c7", name: L("Streaming", "Streaming"), cat: "sub", cost: 14, end: "", notice: 0, o: "N"}
  ],
  docs: [
    {id: "p1", link: "https://drive.google.com/drive/my-drive", name: L("Personalausweis André", "ID card André"), who: "A", where: L("Ordner Familie, Fach 1", "Family folder, slot 1"), valid: "2027-03-12", o: "A"},
    {id: "p2", link: "https://drive.google.com/drive/my-drive", name: L("Personalausweis Natalia", "ID card Natalia"), who: "N", where: L("Ordner Familie, Fach 1", "Family folder, slot 1"), valid: "2031-06-20", o: "N"},
    {id: "p3", link: "https://drive.google.com/drive/my-drive", name: L("Kinderreisepass Nara", "Child passport Nara"), who: "nara", where: L("Ordner Familie, Fach 2", "Family folder, slot 2"), valid: "2027-01-12", o: "A",
      note: L("Kinderreisepässe werden seit 2024 nicht mehr verlängert → Reisepass oder Personalausweis beantragen", "Child passports can't be renewed since 2024 → apply for passport or ID card")},
    {id: "p4", link: "https://drive.google.com/drive/my-drive", name: L("Geburtsurkunde Nara", "Birth certificate Nara"), who: "nara", where: L("Ordner Familie, Fach 2", "Family folder, slot 2"), valid: "", o: "AN"},
    {id: "p5", link: "https://drive.google.com/drive/my-drive", name: L("Geburtsurkunde Levi", "Birth certificate Levi"), who: "levi", where: L("Ordner Familie, Fach 2", "Family folder, slot 2"), valid: "", o: "AN"},
    {id: "p6", name: L("Impfpässe & U-Hefte", "Vaccination & check-up booklets"), who: "fam", where: L("Wickelkommode, oberste Schublade", "Changing table, top drawer"), valid: "", o: "AN"}
  ],
  handled: {}
});
const ADMIN_KEY = "fom.admin.v3";
let ADMIN = (() => { try { const s = FOMStore.getItem(ADMIN_KEY); if (s) return JSON.parse(s); } catch (e) {} return ADMIN_EXAMPLES(); })();
const saveAdmin = () => { try { FOMStore.setItem(ADMIN_KEY, JSON.stringify(ADMIN)); } catch (e) {} };

// All deadlines in one list: manual ones plus those generated from contracts and documents.
function radarItems() {
  const ta = TA[lang], out = [];
  ADMIN.deadlines.forEach(d => out.push({id: d.id, src: "manual", ref: d, t: d.t, due: parse(d.due), o: d.o, kind: d.kind,
    remind: d.remind, repeat: d.repeat, note: d.note, done: d.status === "done"}));
  ADMIN.contracts.forEach(c => {
    if (!c.end || !c.notice) return;
    let end = parse(c.end), due = addMonths(end, -c.notice);
    while (due < TODAY && !ADMIN.handled[`${c.id}@${iso(due)}`]) { end = addMonths(end, 12); due = addMonths(end, -c.notice); }  // window missed → contract renewed
    const n = both(c.name), key = `${c.id}@${iso(due)}`;
    out.push({id: `c-${c.id}`, src: "contract", ref: c, key, t: L(TA.de.cancelOrKeep(n.de), TA.en.cancelOrKeep(n.en)), due, o: c.o, kind: "cancel", remind: 30, repeat: "none", done: !!ADMIN.handled[key]});
  });
  ADMIN.docs.forEach(p => {
    if (!p.valid) return;
    const n = both(p.name), due = parse(p.valid), key = `${p.id}@${p.valid}`;
    out.push({id: `p-${p.id}`, src: "doc", ref: p, key, t: L(TA.de.expires(n.de), TA.en.expires(n.en)), due, o: p.o, kind: "renew", remind: 56, repeat: "none", note: p.note, done: !!ADMIN.handled[key]});
  });
  return out.sort((a, b) => a.due - b.due);
}
const openRadar = () => radarItems().filter(i => !i.done);

function markDone(i) {
  if (i.src === "manual") {
    const d = i.ref; d.status = "done";
    const m = REPEAT_M[d.repeat];
    if (m) ADMIN.deadlines.push({...d, id: "u" + Date.now(), due: iso(addMonths(parse(d.due), m)), status: "open"});
  } else ADMIN.handled[i.key] = iso(TODAY);
  saveAdmin();
}
function reopen(i) { if (i.src === "manual") i.ref.status = "open"; else delete ADMIN.handled[i.key]; saveAdmin(); }

const ownerTag = o => o ? `<span class="who who-${o}">${o === "AN" ? "A+N" : o}</span>` : "";
const dateBlock = d => `<span class="dblock"><b>${d.getDate()}</b>${d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {month: "short"})}${d.getFullYear() !== TODAY.getFullYear() ? `<small>${d.getFullYear()}</small>` : ""}</span>`;

function adminTabs(active) {
  const ta = TA[lang];
  return `<nav class="tabs">${[["", ta.radar], ["contracts", ta.contracts], ["docs", ta.docs]].map(([k, l]) =>
    `<a href="#/admin${k ? "/" + k : ""}" class="${k === active ? "on" : ""}">${l}</a>`).join("")}</nav>`;
}
function vAdmin(r) {
  const d = DOM.admin, ta = TA[lang];
  if (r[1] === "d") return vDeadline(r[2]);
  if (r[1] === "c" && r[2]) return vContract(r[2]);
  const top = hero(ic("admin"), d.c, tx(d.name), tx(d.desc)) + adminTabs(r[1] || "");
  const foot = `<p class="hint">${ta.hint} <button class="linkbtn" data-act="reset">${ta.reset}</button></p>`;
  if (r[1] === "contracts") return top + vContracts() + foot;
  if (r[1] === "docs") return top + vDocs() + foot;
  return top + vRadar() + foot;
}
function radarRow(i) {
  const ta = TA[lang], n = dayDiff(i.due);
  const src = i.src === "contract" ? `${ta.fromContract} · ` : i.src === "doc" ? `${ta.fromDoc} · ` : "";
  return `<a class="drow ${n < 0 && !i.done ? "late" : ""} ${i.done ? "isdone" : ""}" href="#/admin/d/${i.id}" style="--c:${DOM.admin.c}">
    ${dateBlock(i.due)}<span class="dmain"><span class="t">${esc(tx(i.t))}</span><span class="m">${src}${ta.kinds[i.kind]}${i.repeat !== "none" ? " · " + ta.repeats[i.repeat] : ""}</span></span>
    <span class="dside">${ownerTag(i.o)}${i.done ? "" : dueChip(i)}</span></a>`;
}
function vRadar() {
  const ta = TA[lang], all = radarItems(), open = all.filter(i => !i.done), done = all.filter(i => i.done);
  const yearEnd = new Date(TODAY.getFullYear(), 11, 31);
  const groups = {overdue: [], soon: [], year: [], later: []};
  open.forEach(i => { const n = dayDiff(i.due); groups[n < 0 ? "overdue" : n <= 30 ? "soon" : i.due <= yearEnd ? "year" : "later"].push(i); });
  return `<div class="toolbar"><button class="btn primary" data-act="addD">${ta.addDeadline}</button></div>
    ${open.length ? "" : `<p class="empty">${ta.nothing}</p>`}
    ${Object.entries(groups).filter(([, l]) => l.length).map(([g, l]) => `<section class="dgroup ${g}"><h4>${ta.g[g]} <span>${l.length}</span></h4>${l.map(radarRow).join("")}</section>`).join("")}
    ${done.length ? `<details class="dgroup"><summary><h4>${ta.doneH} <span>${done.length}</span></h4></summary>${done.reverse().map(radarRow).join("")}</details>` : ""}`;
}
function vDeadline(id) {
  const ta = TA[lang], i = radarItems().find(x => x.id === id);
  if (!i) return `<p class="empty">–</p>`;
  const remindAt = addDays(i.due, -i.remind), inRemind = TODAY >= remindAt;
  const srcLink = i.src === "contract" ? `#/admin/c/${i.ref.id}` : i.src === "doc" ? "#/admin/docs" : "";
  const rows = [[ta.f.due, `${i.due.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {weekday: "long", day: "numeric", month: "long", year: "numeric"})} ${i.done ? "" : dueChip(i)}`],
    [ta.f.kind, ta.kinds[i.kind]], [ta.f.o, ta.owners[i.o] || "–"],
    [ta.f.remind, `${ta.reminds[i.remind] || i.remind} · <span class="muted">${inRemind ? ta.remindOn : ta.remindFrom(fmt(remindAt))}</span>`],
    [ta.f.repeat, ta.repeats[i.repeat]]];
  if (i.note && tx(i.note)) rows.push([ta.f.note, esc(tx(i.note))]);
  if (i.src === "doc" && safeUrl(i.ref.link)) rows.push([ta.f.link, extLink(i.ref.link, ta.openDoc)]);
  const acts = i.done ? `<button class="btn" data-act="reopen">${ta.reopen}</button>`
    : `<button class="btn primary" data-act="done">${ta.done}</button>${i.src === "manual" ? `<button class="btn" data-act="snooze">${ta.snooze}</button>` : ""}`;
  const edit = i.src === "manual" ? `<button class="btn" data-act="editD">${ta.edit}</button><button class="btn danger" data-act="delD">${ta.del}</button>`
    : `<a class="btn" href="${srcLink}">${ta.goSource}</a>`;
  return `<div class="detail" data-id="${id}">
    <p class="eyebrow">${i.src === "manual" ? ta.kinds[i.kind] : ta.auto + " · " + (i.src === "contract" ? ta.fromContract : ta.fromDoc)}</p>
    <h1 class="dtitle ${i.done ? "isdone" : ""}">${esc(tx(i.t))}</h1>
    <dl class="dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
    ${i.repeat !== "none" && !i.done ? `<p class="muted small">${ta.nextRepeat}</p>` : ""}
    ${i.src !== "manual" ? `<p class="muted small">${ta.autoNote}</p>` : ""}
    <div class="actions">${acts}${edit}</div></div>`;
}
function nextCancel(c) { const i = radarItems().find(x => x.id === `c-${c.id}`); return i ? i.due : null; }
function vContracts() {
  const ta = TA[lang], sum = ADMIN.contracts.reduce((s, c) => s + (+c.cost || 0), 0);
  return `<div class="toolbar"><span class="sum">${ta.fixed(sum.toLocaleString(lang === "de" ? "de-DE" : "en-GB"))}</span><button class="btn primary" data-act="addC">${ta.addContract}</button></div>
  <div class="clist">${ADMIN.contracts.map(c => { const nc = nextCancel(c);
    return `<div class="crow"><a class="crowmain" href="#/admin/c/${c.id}"><span class="dmain"><span class="t">${esc(tx(c.name))}</span><span class="m">${ta.cats[c.cat] || ""} · ${c.cost} ${ta.perMonth}</span></span>
      <span class="dside">${ownerTag(c.o)}${nc ? `<span class="m">${ta.nextCancel} ${fmt(nc)}</span>${dueChip({due: nc})}` : `<span class="m">${ta.rolling}</span>`}</span></a>${extLink(c.link, ta.open)}</div>`; }).join("")}</div>`;
}
function vContract(id) {
  const ta = TA[lang], c = ADMIN.contracts.find(x => x.id === id);
  if (!c) return `<p class="empty">–</p>`;
  const nc = nextCancel(c);
  const rows = [[ta.f.cat, ta.cats[c.cat]], [ta.f.cost, `${c.cost} €`], [ta.f.end, c.end ? fmt(parse(c.end)) + " " + parse(c.end).getFullYear() : "–"],
    [ta.noticeShort, c.notice ? ta.months(c.notice) : ta.rolling], [ta.f.o, ta.owners[c.o]], ...(safeUrl(c.link) ? [[ta.f.link, extLink(c.link, ta.openContract)]] : []),
    [ta.nextCancel, nc ? `${fmt(nc)} ${nc.getFullYear()} ${dueChip({due: nc})} · <a href="#/admin/d/c-${c.id}">${ta.radar} →</a>` : "–"]];
  return `<div class="detail"><p class="eyebrow">${ta.contracts}</p><h1 class="dtitle">${esc(tx(c.name))}</h1>
    <dl class="dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
    <div class="actions"><button class="btn" data-act="editC" data-id="${c.id}">${ta.edit}</button><button class="btn danger" data-act="delC" data-id="${c.id}">${ta.del}</button></div></div>`;
}
function vDocs() {
  const ta = TA[lang], groups = {};
  ADMIN.docs.forEach(p => (groups[p.who] = groups[p.who] || []).push(p));
  return `<div class="toolbar"><button class="btn primary" data-act="addDoc">${ta.addDoc}</button></div>
  ${Object.keys(ta.whos).filter(w => groups[w]).map(w => `<section class="dgroup"><h4>${ta.whos[w]} <span>${groups[w].length}</span></h4>${groups[w].map(p => `
    <div class="drow docline"><button class="docedit" data-act="editDoc" data-id="${p.id}"><span class="dmain"><span class="t">${esc(tx(p.name))}</span><span class="m">${esc(tx(p.where))}</span>${p.note ? `<span class="m warnnote">${esc(tx(p.note))}</span>` : ""}</span>
    <span class="dside">${p.valid ? dueChip({due: parse(p.valid)}) : `<span class="m">${ta.noExpiry}</span>`}</span></button>${extLink(p.link, ta.open)}</div>`).join("")}</section>`).join("")}`;
}

/* Form dialog */
const saveAll = () => { saveAdmin(); saveTeam(); saveHome(); saveHealth(); saveGoals(); saveWeek(); saveFin(); saveKids(); };
function openForm(title, fields, values, onSave, onDelete) {
  const ta = TA[lang], dlg = document.getElementById("dlg");
  const opt = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${String(k) === String(v) ? "selected" : ""}>${l}</option>`).join("");
  dlg.innerHTML = `<form method="dialog" class="form"><h2>${title}</h2>${fields.map(f => `<label><span>${f.label || ta.f[f.k]}</span>${
    f.type === "select" ? `<select name="${f.k}">${opt(f.options, values[f.k])}</select>`
    : `<input name="${f.k}" type="${f.type || "text"}" value="${esc(values[f.k] ?? "")}" ${f.req ? "required" : ""} ${f.type === "number" ? 'min="0" step="any"' : ""}>`}</label>`).join("")}
    <div class="actions">${onDelete ? `<button type="button" class="btn danger" data-x="del">${ta.del}</button>` : ""}<span style="flex:1"></span>
    <button type="button" class="btn" data-x="cancel">${ta.cancel}</button><button class="btn primary" value="ok">${ta.save}</button></div></form>`;
  const form = dlg.querySelector("form");
  dlg.querySelector('[data-x="cancel"]').onclick = () => dlg.close();
  if (onDelete) dlg.querySelector('[data-x="del"]').onclick = () => { onDelete(); dlg.close(); saveAll(); render(); };
  form.onsubmit = e => { e.preventDefault(); onSave(Object.fromEntries(new FormData(form))); dlg.close(); saveAll(); render(); };
  dlg.showModal();
}
const F = {
  d: () => [{k: "t", req: true}, {k: "due", type: "date", req: true}, {k: "kind", type: "select", options: TA[lang].kinds}, {k: "o", type: "select", options: TA[lang].owners},
    {k: "remind", type: "select", options: TA[lang].reminds}, {k: "repeat", type: "select", options: TA[lang].repeats}, {k: "note"}],
  c: () => [{k: "name", req: true}, {k: "cat", type: "select", options: TA[lang].cats}, {k: "cost", type: "number"}, {k: "end", type: "date"}, {k: "notice", type: "number"}, {k: "link", type: "url"}, {k: "o", type: "select", options: TA[lang].owners}],
  doc: () => [{k: "name", req: true}, {k: "who", type: "select", options: TA[lang].whos}, {k: "where"}, {k: "link", type: "url"}, {k: "valid", type: "date"}, {k: "o", type: "select", options: TA[lang].owners}]
};
const plain = x => tx(x) || "";

function bindAdmin(v) {
  const ta = TA[lang];
  v.querySelectorAll("[data-act]").forEach(b => b.onclick = e => {
    e.preventDefault();
    const act = b.dataset.act, did = v.querySelector(".detail")?.dataset.id, item = did && radarItems().find(x => x.id === did);
    const byId = (list, id) => ADMIN[list].find(x => x.id === id);
    switch (act) {
      case "addD": return openForm(ta.newD, F.d(), {due: iso(addDays(TODAY, 14)), kind: "other", o: me(), remind: 7, repeat: "none"},
        val => ADMIN.deadlines.push({id: "u" + Date.now(), ...val, remind: +val.remind, status: "open"}));
      case "editD": return openForm(ta.edit, F.d(), {...item.ref, t: plain(item.ref.t), note: plain(item.ref.note)},
        val => Object.assign(item.ref, val, {remind: +val.remind}));
      case "delD": ADMIN.deadlines = ADMIN.deadlines.filter(x => x !== item.ref); saveAdmin(); return go("#/admin");
      case "done": markDone(item); return render();
      case "reopen": reopen(item); return render();
      case "snooze": item.ref.due = iso(addDays(parse(item.ref.due), 7)); saveAdmin(); return render();
      case "addC": return openForm(ta.newC, F.c(), {cat: "insurance", cost: 0, notice: 1, o: me()},
        val => ADMIN.contracts.push({id: "u" + Date.now(), ...val, cost: +val.cost || 0, notice: +val.notice || 0}));
      case "editC": { const c = byId("contracts", b.dataset.id);
        return openForm(ta.edit, F.c(), {...c, name: plain(c.name)}, val => Object.assign(c, val, {cost: +val.cost || 0, notice: +val.notice || 0})); }
      case "delC": ADMIN.contracts = ADMIN.contracts.filter(x => x.id !== b.dataset.id); saveAdmin(); return go("#/admin/contracts");
      case "addDoc": return openForm(ta.newDoc, F.doc(), {who: "fam", o: me()}, val => ADMIN.docs.push({id: "u" + Date.now(), ...val}));
      case "editDoc": { const p = byId("docs", b.dataset.id);
        return openForm(ta.edit, F.doc(), {...p, name: plain(p.name), where: plain(p.where)}, val => Object.assign(p, val),
          () => { ADMIN.docs = ADMIN.docs.filter(x => x !== p); }); }
      case "reset": if (confirm(ta.resetQ)) { ADMIN = ADMIN_EXAMPLES(); saveAdmin(); render(); } return;
    }
  });
}

/* ---------- Team & Rituale ---------- */
const TT = {
  de: {checkin: "Check-in", rituals: "Rituale", values: "Werte", good: "Was war gut",
    days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    daysShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    weekly: (d, t) => `Jeden ${d}, ${t} Uhr`, nextOn: d => `Nächster: ${d}`, minutes: n => `ca. ${n} Min.`,
    feelQ: "Wie fühlt sich die Last gerade an?", feelLevels: ["entspannt", "gut", "geht so", "viel", "am Limit"], feelShort: "Gefühlt", lastFeel: d => `Gefühlt beim letzten Check-in (${d})`,
    start: "Check-in starten", next: "Nächster Check-in", chronicle: "Chronik", editAgenda: "Ablauf bearbeiten", setupTitle: "Ablauf & Zeit", when: "Wann", doneEditing: "Fertig", points: n => `${n} Punkte`, editSetup: "Zeit ändern", agenda: "Ablauf", addPoint: "+ Punkt", past: "Vergangene Check-ins", noPast: "Noch kein Check-in – startet euren ersten!",
    finish: "Abschließen & speichern", notesPh: "Notizen, Beschlüsse, wer macht was …", run: d => `Check-in am ${d}`,
    addRitual: "+ Ritual", addValue: "+ Wert", orgBy: n => `organisiert: ${n}`, goodPh: "Was war diese Woche schön?", add: "Hinzufügen", by: n => `von ${n}`,
    thisWeek: "Diese Woche", week: n => `KW ${n}`, emptyGood: "Noch nichts eingetragen – was war heute schön?",
    up: "Nach oben", down: "Nach unten", notesCount: n => `${n} ${n === 1 ? "Notiz" : "Notizen"}`,
    ctx: {none: "Nichts", brief: "Was gerade wichtig ist", load: "Wer trägt was", kids: "Kinder-Thema der Woche"},
    kidOfWeek: n => `Diese Woche: ${n}`, kidPlanned: "Geplant", kidIdeas: "Offene Ideen",
    f: {t: "Titel", m: "Beschreibung", when: "Wann?", who: "Für wen?", org: "Wer organisiert?", fixedDay: "Fester Wochentag (erscheint in der Woche)", ctx: "Automatisch einblenden", day: "Wochentag", time: "Uhrzeit", dur: "Dauer (Minuten)"},
    whoOpts: {family: "Ganze Familie", couple: "Wir zwei", kids: "Mit den Kindern"},
    newPoint: "Neuer Punkt", newRitual: "Neues Ritual", newValue: "Neuer Wert", setup: "Wochen-Check-in"},
  en: {checkin: "Check-in", rituals: "Rituals", values: "Values", good: "What was good",
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    weekly: (d, t) => `Every ${d}, ${t}`, nextOn: d => `Next: ${d}`, minutes: n => `about ${n} min`,
    feelQ: "How heavy does the load feel right now?", feelLevels: ["relaxed", "fine", "so-so", "a lot", "at the limit"], feelShort: "Felt", lastFeel: d => `Felt at last check-in (${d})`,
    start: "Start check-in", next: "Next check-in", chronicle: "History", editAgenda: "Edit agenda", setupTitle: "Agenda & time", when: "When", doneEditing: "Done", points: n => `${n} points`, editSetup: "Change time", agenda: "Agenda", addPoint: "+ Point", past: "Past check-ins", noPast: "No check-ins yet – start your first one!",
    finish: "Finish & save", notesPh: "Notes, decisions, who does what …", run: d => `Check-in on ${d}`,
    addRitual: "+ Ritual", addValue: "+ Value", orgBy: n => `organized by: ${n}`, goodPh: "What was nice this week?", add: "Add", by: n => `by ${n}`,
    thisWeek: "This week", week: n => `Week ${n}`, emptyGood: "Nothing yet – what was nice today?",
    up: "Move up", down: "Move down", notesCount: n => `${n} ${n === 1 ? "note" : "notes"}`,
    ctx: {none: "Nothing", brief: "What matters right now", load: "Who's carrying what", kids: "Kids topic of the week"},
    kidOfWeek: n => `This week: ${n}`, kidPlanned: "Planned", kidIdeas: "Open ideas",
    f: {t: "Title", m: "Description", when: "When?", who: "For whom?", org: "Who organizes it?", fixedDay: "Fixed weekday (shows up in the week)", ctx: "Show automatically", day: "Weekday", time: "Time", dur: "Duration (minutes)"},
    whoOpts: {family: "Whole family", couple: "Just us two", kids: "With the kids"},
    newPoint: "New point", newRitual: "New ritual", newValue: "New value", setup: "Weekly check-in"}
};
const TEAM_EXAMPLES = () => ({
  checkin: {day: 0, time: "20:00", dur: 30, agenda: [
    {id: "a1", t: L("Wie geht's uns beiden?", "How are we doing?"), m: L("Je 5 Minuten, ohne Unterbrechen", "5 minutes each, no interrupting"), ctx: "none"},
    {id: "a2", t: L("Was steht an?", "What's coming up?"), m: L("Termine, Fristen, offene Punkte", "Appointments, deadlines, open items"), ctx: "brief"},
    {id: "a3", t: L("Wer übernimmt was?", "Who takes what?"), m: L("Ist die Last fair verteilt?", "Is the load shared fairly?"), ctx: "load"},
    {id: "a4", t: L("Ein Kinder-Thema", "One kids topic"), m: L("Abwechselnd Nara und Levi", "Alternating Nara and Levi"), ctx: "kids"},
    {id: "a5", t: L("Was freut uns nächste Woche?", "What are we looking forward to?"), m: L("Mit etwas Schönem enden", "End on something nice"), ctx: "none"}]},
  rituals: [
    {id: "r1", o: "A", day: 5, t: L("Pizza & Film", "Pizza & movie"), when: L("Freitagabend", "Friday evening"), who: "family", m: L("Kinder dürfen den Film abwechselnd aussuchen", "Kids take turns picking the movie")},
    {id: "r2", o: "AN", day: 0, t: L("Sonntagsausflug", "Sunday outing"), when: L("Sonntagvormittag", "Sunday morning"), who: "family", m: L("Raus in die Natur, egal bei welchem Wetter", "Out into nature, whatever the weather")},
    {id: "r3", o: "AN", t: L("Abendfrage", "Bedtime question"), when: L("Jeden Abend", "Every evening"), who: "kids", m: L("„Was war heute schön?“", "“What was nice today?”")},
    {id: "r4", o: "N", t: L("Date Night", "Date night"), when: L("Einmal im Monat", "Once a month"), who: "couple", m: L("Oma & Opa übernehmen die Kinder", "Grandparents take the kids")}],
  values: [
    {id: "v1", t: L("Wir sind ein Team", "We're a team"), m: L("Jeder hilft mit, keiner wird allein gelassen.", "Everyone helps, nobody is left alone.")},
    {id: "v2", t: L("Zeit statt Zeug", "Time over stuff"), m: L("Gemeinsame Erlebnisse sind uns wichtiger als Dinge.", "Shared experiences matter more to us than things.")},
    {id: "v3", t: L("Neugier vor Perfektion", "Curiosity over perfection"), m: L("Ausprobieren ist wichtiger als es gleich richtig zu machen.", "Trying matters more than getting it right first time.")},
    {id: "v4", t: L("Miteinander reden", "Talk with each other"), m: L("Wir reden miteinander, nicht übereinander.", "We talk with each other, not about each other.")}],
  good: [
    {id: "g1", t: L("Nara hat Levi getröstet, als er hingefallen ist", "Nara comforted Levi when he fell"), by: "N", date: "2026-10-01"},
    {id: "g2", t: L("Spontanes Picknick im Park", "Spontaneous picnic in the park"), by: "A", date: "2026-09-30"},
    {id: "g3", t: L("Levi hat zum ersten Mal „Nara“ gesagt", "Levi said “Nara” for the first time"), by: "A", date: "2026-09-24"}],
  logs: [
    {id: "l1", feel: {A: 2, N: 4}, date: "2026-09-13", by: "A", items: [
      {t: L("Wie geht's uns beiden?", "How are we doing?"), note: L("Erster Check-in! Ablauf ausprobieren.", "First check-in! Trying out the format.")},
      {t: L("Was steht an?", "What's coming up?"), note: L("Kfz-Versicherung bis Ende November vergleichen.", "Compare car insurance by end of November.")},
      {t: L("Wer übernimmt was?", "Who takes what?"), note: L("Natalia trägt gerade mehr – Wäsche wechselt zu André?", "Natalia is carrying more – laundry moves to André?")},
      {t: L("Ein Kinder-Thema", "One kids topic"), note: L("Nara: Fahrrad ohne Stützräder ausprobieren.", "Nara: try the bike without training wheels.")},
      {t: L("Was freut uns nächste Woche?", "What are we looking forward to?"), note: ""}]},
    {id: "l2", feel: {A: 2, N: 3}, date: "2026-09-20", by: "A", items: [
      {t: L("Wie geht's uns beiden?", "How are we doing?"), note: L("Gute Woche, viel draußen gewesen.", "Good week, lots of time outside.")},
      {t: L("Was steht an?", "What's coming up?"), note: L("U8 von Nara – schon gemacht? Klären.", "Nara's U8 – done already? Check.")},
      {t: L("Wer übernimmt was?", "Who takes what?"), note: ""},
      {t: L("Ein Kinder-Thema", "One kids topic"), note: L("Levi: Krabbelgruppe ab November suchen.", "Levi: look for a toddler group from November.")},
      {t: L("Was freut uns nächste Woche?", "What are we looking forward to?"), note: L("Ausflug in den Herbstferien planen.", "Plan an outing for the autumn holidays.")}]},
    {id: "l3", feel: {A: 3, N: 4}, date: "2026-09-27", by: "N", items: [
      {t: L("Wie geht's uns beiden?", "How are we doing?"), note: L("Beide müde, die Woche war voll. Mehr Pausen einplanen.", "Both tired, busy week. Plan more breaks.")},
      {t: L("Was steht an?", "What's coming up?"), note: L("Kita-Vertrag Levi kommt – Natalia prüft ihn.", "Levi's daycare contract is coming – Natalia reviews it.")},
      {t: L("Wer übernimmt was?", "Who takes what?"), note: L("André übernimmt ab jetzt den Wocheneinkauf.", "André takes over the weekly groceries from now on.")},
      {t: L("Ein Kinder-Thema", "One kids topic"), note: L("Nara: Schwimmkurs anmelden, Probestunde Musik anfragen.", "Nara: sign up for swimming, ask for a music trial lesson.")},
      {t: L("Was freut uns nächste Woche?", "What are we looking forward to?"), note: L("Oma & Opa kommen am 10.10.", "Grandparents visit on Oct 10.")}]}
  ]
});
const TEAM_KEY = "fom.team.v3";
let TEAM = (() => { try { const s = FOMStore.getItem(TEAM_KEY); if (s) return JSON.parse(s); } catch (e) {} return TEAM_EXAMPLES(); })();
// Data saved before rituals had an organizer: take it over from the examples.
TEAM_EXAMPLES().rituals.forEach(ex => { const r = TEAM.rituals.find(x => x.id === ex.id); if (r && !("o" in r)) r.o = ex.o; if (r && !("day" in r) && "day" in ex) r.day = ex.day; });
const saveTeam = () => { try { FOMStore.setItem(TEAM_KEY, JSON.stringify(TEAM)); } catch (e) {} };

const isoWeek = d => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / 864e5 + 1) / 7); };
const nextCheckin = () => { const c = TEAM.checkin; return addDays(TODAY, (c.day - TODAY.getDay() + 7) % 7); };
const longDate = d => d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {weekday: "short", day: "numeric", month: "short"});

function teamTabs(active) {
  const tt = TT[lang];
  return `<nav class="tabs">${[["", tt.checkin], ["rituals", tt.rituals], ["values", tt.values], ["good", tt.good]].map(([k, l]) =>
    `<a href="#/team${k ? "/" + k : ""}" class="${k === active ? "on" : ""}">${l}</a>`).join("")}</nav>`;
}
function vTeam(r) {
  if (r[1] === "run") return vRun();
  if (r[1] === "setup") return vSetup();
  if (r[1] === "log") return vLog(r[2]);
  const d = DOM.team, top = hero(ic("team"), d.c, tx(d.name), tx(d.desc)) + teamTabs(r[1] || "");
  const foot = `<p class="hint">${TA[lang].hint} <button class="linkbtn" data-act="resetTeam">${TA[lang].reset}</button></p>`;
  const body = r[1] === "rituals" ? vRituals() : r[1] === "values" ? vValues() : r[1] === "good" ? vGood() : vCheckin();
  return top + body + foot;
}
function vCheckin() {
  const tt = TT[lang], c = TEAM.checkin, logs = TEAM.logs.slice().sort((a, b) => b.date.localeCompare(a.date));
  const nd = nextCheckin(), dd = dayDiff(nd);
  return `<section class="nextcard">
      <div class="nc-date"><b>${nd.getDate()}</b><span>${nd.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {month: "short"})}</span></div>
      <div class="nc-main"><p class="eyebrow">${tt.next} · ${T[lang].inDays(dd)}</p>
        <p class="big">${tt.days[c.day]}, ${c.time}</p>
        <p class="m">${tt.minutes(c.dur)} · ${tt.points(c.agenda.length)}</p></div>
      <div class="nc-actions"><a class="btn primary" href="#/team/run">${tt.start}</a><a class="nc-link" href="#/team/setup">${tt.editAgenda}</a></div>
    </section>
    <h4 class="lh">${tt.chronicle}</h4>
    ${logs.length ? `<div class="chron">${logs.map(l => { const notes = l.items.filter(i => tx(i.note));
      return `<a class="chron-item" href="#/team/log/${l.id}">${dateBlock(parse(l.date))}<span class="dmain">
        <span class="t">${tt.run(longDate(parse(l.date)))}</span><span class="m">${tt.by(PEOPLE[l.by].name)} · ${tt.notesCount(notes.length)}</span>${feelChips(l.feel)}
        ${notes.slice(0, 2).map(i => `<span class="peek"><b>${esc(tx(i.t))}</b> ${esc(tx(i.note))}</span>`).join("")}</span></a>`; }).join("")}</div>`
    : `<p class="empty">${tt.noPast}</p>`}`;
}
function vSetup() {
  const tt = TT[lang], c = TEAM.checkin, list = c.agenda;
  return `<div class="detail wide"><p class="eyebrow">${tx(DOM.team.name)}</p><h1 class="dtitle">${tt.setupTitle}</h1>
    <section class="sec setup"><div class="setup-row"><div><h3>${tt.when}</h3><p class="big">${tt.weekly(tt.days[c.day], c.time)}</p><p class="m">${tt.minutes(c.dur)}</p></div>
      <div class="actions"><button class="btn" data-act="editSetup">${tt.editSetup}</button></div></div></section>
    <div class="toolbar"><h4 class="lh">${tt.agenda}</h4><button class="btn" data-act="addPoint">${tt.addPoint}</button></div>
    <div class="dgroup">${list.map((a, n) => `<div class="drow agenda"><span class="num">${n + 1}</span>
      <button class="docedit" data-act="editPoint" data-id="${a.id}"><span class="dmain"><span class="t">${esc(tx(a.t))}</span><span class="m">${esc(tx(a.m))}${a.ctx !== "none" ? ` · <span class="ctxtag">↳ ${tt.ctx[a.ctx]}</span>` : ""}</span></span></button>
      <span class="mv"><button data-act="up" data-id="${a.id}" title="${tt.up}" ${n === 0 ? "disabled" : ""}>↑</button><button data-act="down" data-id="${a.id}" title="${tt.down}" ${n === list.length - 1 ? "disabled" : ""}>↓</button></span></div>`).join("")}</div>
    <div class="actions"><a class="btn primary" href="#/team">${tt.doneEditing}</a></div></div>`;
}
function ctxBox(kind) {
  const t = T[lang], tt = TT[lang];
  if (kind === "brief") return `<div class="ctx">${briefing().map(i => `<div>${DOM[i.dom].icon && `<span class="ctxic" style="--c:${DOM[i.dom].c}">${ic(i.dom)}</span>`}${esc(tx(i.t))}<span class="m"> · ${i.warn ? t.check : dayDiff(i.due) < 0 ? t.overdue(dayDiff(i.due)) : t.inDays(dayDiff(i.due))}</span></div>`).join("")}</div>`;
  if (kind === "load") { const ml = mentalLoad(), pa = Math.round(ml.A / (ml.A + ml.N) * 100);
    return `<div class="ctx"><div class="loadbar"><div style="width:${pa}%;background:var(--sky)"></div><div style="width:${100 - pa}%;background:var(--rose)"></div></div><div class="loadlbl"><span>André ${pa} %</span><span>Natalia ${100 - pa} %</span></div>${lastFeel()}</div>`; }
  if (kind === "kids") { const id = isoWeek(nextCheckin()) % 2 ? "levi" : "nara", k = KIDS[id];
    const planned = k.topics.filter(x => x.s === "planned");
    return `<div class="ctx"><div><b>${tt.kidOfWeek(k.name)}</b> · <a href="#/kids/${id}">${k.name} →</a></div>
      ${planned.length ? `<div class="m">${tt.kidPlanned}: ${planned.map(x => esc(tx(x.t))).join(", ")}</div>` : ""}
      <div class="m">${tt.kidIdeas}: ${k.topics.filter(x => x.s === "idea").map(x => esc(tx(x.t))).join(", ") || "–"}</div></div>`; }
  return "";
}
// Felt load (1–5) per parent, captured in the check-in and shown next to the computed share.
function feelSliders() {
  const tt = TT[lang];
  return `<div class="feel"><p class="m">${tt.feelQ}</p>${["A", "N"].map(p => `<label><span>${PEOPLE[p].name}</span>
    <input type="range" min="1" max="5" value="3" name="feel_${p}">
    <output>${tt.feelLevels[2]}</output></label>`).join("")}</div>`;
}
function feelChips(f, big) {
  if (!f) return "";
  const tt = TT[lang];
  return `<span class="feelchips ${big ? "big" : ""}">${["A", "N"].map(p => chip(`${PEOPLE[p].name} ${f[p]}/5${big ? " · " + tt.feelLevels[f[p] - 1] : ""}`,
    f[p] >= 4 ? "var(--warn)" : f[p] <= 2 ? "var(--active)" : "var(--muted)")).join("")}</span>`;
}
function lastFeel() {
  const l = TEAM.logs.filter(x => x.feel).sort((a, b) => b.date.localeCompare(a.date))[0];
  return l ? `<div class="lastfeel"><span class="m">${TT[lang].lastFeel(fmt(parse(l.date)))}</span>${feelChips(l.feel)}</div>` : "";
}
function vRun() {
  const tt = TT[lang], when = TODAY;
  return `<div class="detail wide"><p class="eyebrow">${tx(DOM.team.name)}</p><h1 class="dtitle">${tt.run(longDate(when))}</h1>
    <form id="runform">${TEAM.checkin.agenda.map((a, n) => `<section class="runcard"><div class="runhead"><span class="num">${n + 1}</span><div><b>${esc(tx(a.t))}</b><div class="m">${esc(tx(a.m))}</div></div></div>
      ${ctxBox(a.ctx)}${a.ctx === "load" ? feelSliders() : ""}<textarea name="${a.id}" rows="2" placeholder="${tt.notesPh}"></textarea></section>`).join("")}
    ${TEAM.checkin.agenda.some(a => a.ctx === "load") ? "" : `<section class="runcard">${feelSliders()}</section>`}
    <div class="actions"><a class="btn" href="#/team">${TA[lang].cancel}</a><button class="btn primary">${tt.finish}</button></div></form></div>`;
}
function vLog(id) {
  const tt = TT[lang], l = TEAM.logs.find(x => x.id === id);
  if (!l) return `<p class="empty">–</p>`;
  return `<div class="detail wide"><p class="eyebrow">${tt.by(PEOPLE[l.by].name)}</p><h1 class="dtitle">${tt.run(longDate(parse(l.date)))}</h1>
    <dl class="dl">${l.items.map(i => `<dt>${esc(tx(i.t))}</dt><dd>${tx(i.note) ? esc(tx(i.note)).replace(/\n/g, "<br>") : `<span class="muted">–</span>`}</dd>`).join("")}</dl>
    ${l.feel ? `<p class="lh">${tt.feelQ}</p>${feelChips(l.feel, true)}` : ""}
    <div class="actions"><button class="btn danger" data-act="delLog" data-id="${l.id}">${TA[lang].del}</button></div></div>`;
}
function vRituals() {
  const tt = TT[lang];
  return `<div class="toolbar"><button class="btn primary" data-act="addRitual">${tt.addRitual}</button></div>
  <div class="cols">${TEAM.rituals.map(x => `<button class="sec tcard" data-act="editRitual" data-id="${x.id}">
    <span class="tchips"><span class="chip" style="--k:var(--coral)">${tt.whoOpts[x.who] || ""}</span>${x.o ? `<span class="m">${tt.orgBy(TA[lang].owners[x.o])}</span>` : ""}</span><b>${esc(tx(x.t))}</b><span class="when2">${esc(tx(x.when))}</span><span class="m">${esc(tx(x.m))}</span></button>`).join("")}</div>`;
}
function vValues() {
  const tt = TT[lang];
  return `<div class="toolbar"><button class="btn primary" data-act="addValue">${tt.addValue}</button></div>
  <div class="cols">${TEAM.values.map((x, n) => `<button class="sec tcard value" data-act="editValue" data-id="${x.id}">
    <span class="vnum">${n + 1}</span><b>${esc(tx(x.t))}</b><span class="m">${esc(tx(x.m))}</span></button>`).join("")}</div>`;
}
function vGood() {
  const tt = TT[lang], groups = {};
  TEAM.good.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach(g => { const w = isoWeek(parse(g.date)); (groups[w] = groups[w] || []).push(g); });
  const cw = isoWeek(TODAY);
  return `<form class="goodform" id="goodform"><input name="t" placeholder="${tt.goodPh}" autocomplete="off" required><button class="btn primary">${tt.add}</button></form>
    ${TEAM.good.length ? Object.keys(groups).sort((a, b) => b - a).map(w => `<section class="dgroup"><h4>${+w === cw ? tt.thisWeek : tt.week(w)} <span>${groups[w].length}</span></h4>
      ${groups[w].map(g => `<div class="drow good"><span class="dmain"><span class="t">${esc(tx(g.t))}</span><span class="m">${tt.by(PEOPLE[g.by].name)} · ${longDate(parse(g.date))}</span></span>
      <button class="x" data-act="delGood" data-id="${g.id}" title="${TA[lang].del}">×</button></div>`).join("")}</section>`).join("")
    : `<p class="empty">${tt.emptyGood}</p>`}`;
}

function bindTeam(v) {
  const tt = TT[lang], ag = TEAM.checkin.agenda;
  const F2 = {
    point: () => [{k: "t", label: tt.f.t, req: true}, {k: "m", label: tt.f.m}, {k: "ctx", label: tt.f.ctx, type: "select", options: tt.ctx}],
    ritual: () => [{k: "t", label: tt.f.t, req: true}, {k: "when", label: tt.f.when}, {k: "who", label: tt.f.who, type: "select", options: tt.whoOpts}, {k: "o", label: tt.f.org, type: "select", options: TA[lang].owners}, {k: "day", label: tt.f.fixedDay, type: "select", options: {"": "–", ...Object.fromEntries(tt.days.map((d, i) => [i, d]))}}, {k: "m", label: tt.f.m}],
    value: () => [{k: "t", label: tt.f.t, req: true}, {k: "m", label: tt.f.m}],
    setup: () => [{k: "day", label: tt.f.day, type: "select", options: Object.fromEntries(tt.days.map((d, i) => [i, d]))}, {k: "time", label: tt.f.time, type: "time"}, {k: "dur", label: tt.f.dur, type: "number"}]
  };
  const strip = x => ({...x, t: plain(x.t), m: plain(x.m), when: plain(x.when)});
  const editIn = (list, form, title, id) => { const x = list.find(y => y.id === id);
    openForm(title, form(), strip(x), val => Object.assign(x, val), () => list.splice(list.indexOf(x), 1)); };
  v.querySelectorAll("[data-act]").forEach(b => b.onclick = e => {
    const act = b.dataset.act, id = b.dataset.id;
    if (!["resetTeam"].includes(act)) e.preventDefault();
    switch (act) {
      case "editSetup": return openForm(tt.setup, F2.setup(), TEAM.checkin, val => Object.assign(TEAM.checkin, {day: +val.day, time: val.time, dur: +val.dur || 30}));
      case "addPoint": return openForm(tt.newPoint, F2.point(), {ctx: "none"}, val => ag.push({id: "u" + Date.now(), ...val}));
      case "editPoint": return editIn(ag, F2.point, TA[lang].edit, id);
      case "up": case "down": { const i = ag.findIndex(a => a.id === id), j = act === "up" ? i - 1 : i + 1;
        [ag[i], ag[j]] = [ag[j], ag[i]]; saveTeam(); return render(); }
      case "addRitual": return openForm(tt.newRitual, F2.ritual(), {who: "family", o: me()}, val => TEAM.rituals.push({id: "u" + Date.now(), ...val}));
      case "editRitual": return editIn(TEAM.rituals, F2.ritual, TA[lang].edit, id);
      case "addValue": return openForm(tt.newValue, F2.value(), {}, val => TEAM.values.push({id: "u" + Date.now(), ...val}));
      case "editValue": return editIn(TEAM.values, F2.value, TA[lang].edit, id);
      case "delGood": TEAM.good = TEAM.good.filter(g => g.id !== id); saveTeam(); return render();
      case "delLog": TEAM.logs = TEAM.logs.filter(l => l.id !== id); saveTeam(); return go("#/team");
      case "resetTeam": if (confirm(TA[lang].resetQ)) { TEAM = TEAM_EXAMPLES(); saveTeam(); render(); } return;
    }
  });
  const gf = v.querySelector("#goodform");
  if (gf) gf.onsubmit = e => { e.preventDefault(); const t = gf.elements.namedItem("t").value.trim(); if (!t) return;
    TEAM.good.push({id: "u" + Date.now(), t, by: me(), date: iso(TODAY)}); saveTeam(); render(); v.querySelector("#goodform input")?.focus(); };
  // Inline handlers would resolve `lang` to the element's lang attribute, so the slider label is bound here.
  v.querySelectorAll('.feel input[type="range"]').forEach(r => r.oninput = () => { r.nextElementSibling.textContent = tt.feelLevels[r.value - 1]; });
  const rf = v.querySelector("#runform");
  if (rf) rf.onsubmit = e => { e.preventDefault(); const fd = new FormData(rf), id = "u" + Date.now();
    TEAM.logs.push({id, date: iso(TODAY), by: me(), items: ag.map(a => ({t: tx(a.t), note: (fd.get(a.id) || "").trim()})), feel: {A: +fd.get("feel_A"), N: +fd.get("feel_N")}}); saveTeam(); go(`#/team/log/${id}`); };
}

/* ---------- Haushalt ---------- */
const TH = {
  de: {tasks: "To-dos", plan: "Wer macht was", efforts: {1: "Klein (ca. 10 Min.)", 2: "Mittel (ca. 30 Min.)", 3: "Groß (1 Std. +)"}, effort: "Aufwand", pts: n => `${n} ${n === 1 || n === "1" ? "Punkt" : "Punkte"}`, ptsHint: "Punkte = Häufigkeit × Aufwand (klein 1 · mittel 2 · groß 3). „Im Wechsel“ und „Beide“ zählen je zur Hälfte.", doneWeekPts: "Diese Woche erledigt (Punkte)", shop: "Einkauf", planTitle: "Wiederkehrendes pro Woche", approx: n => `ca. ${n}×`, perWeek: n => `ca. ${n}× pro Woche`, nowTurn: n => `jetzt: ${n}`, planHint: "„Im Wechsel“ und „Beide“ zählen für jeden zur Hälfte.", addTask: "+ Aufgabe", addRoutine: "+ Routine",
    g: {overdue: "Überfällig", today: "Heute", week: "Nächste 7 Tage", later: "Später"}, doneH: "Erledigt",
    all: "Alle", mine: "Meine", nothing: "Alles erledigt – Füße hoch!",
    doneWeek: "Diese Woche erledigt", todayOpen: n => `${n} heute offen`, dueToday: n => `${n} heute`,
    freq: {daily: "Täglich", d2: "Alle 2 Tage", d3: "Alle 3 Tage", weekly: "Wöchentlich", w2: "Alle 2 Wochen", monthly: "Monatlich", once: "Einmalig"},
    owners: {A: "André", N: "Natalia", AN: "Beide", R: "Im Wechsel"}, rotate: "im Wechsel",
    f: {t: "Was?", freq: "Wie oft?", next: "Fällig / nächstes Mal", o: "Wer?", effort: "Wie aufwendig?", note: "Notiz"},
    newTask: "Neue Aufgabe", shopPh: "Was brauchen wir?", add: "Hinzufügen", clearDone: "Erledigte entfernen", inCart: "Im Wagen",
    emptyShop: "Die Liste ist leer.", nextOn: d => `nächstes Mal ${d}`, by: n => `von ${n}`},
  en: {tasks: "To-dos", plan: "Who does what", efforts: {1: "Small (about 10 min)", 2: "Medium (about 30 min)", 3: "Big (1 h +)"}, effort: "Effort", pts: n => `${n} ${n === 1 || n === "1" ? "point" : "points"}`, ptsHint: "Points = frequency × effort (small 1 · medium 2 · big 3). “Taking turns” and “Both” count half for each.", doneWeekPts: "Done this week (points)", shop: "Groceries", planTitle: "Recurring per week", approx: n => `about ${n}×`, perWeek: n => `about ${n}× a week`, nowTurn: n => `now: ${n}`, planHint: "“Taking turns” and “Both” count half for each.", addTask: "+ Task", addRoutine: "+ Routine",
    g: {overdue: "Overdue", today: "Today", week: "Next 7 days", later: "Later"}, doneH: "Done",
    all: "All", mine: "Mine", nothing: "All done – put your feet up!",
    doneWeek: "Done this week", todayOpen: n => `${n} open today`, dueToday: n => `${n} today`,
    freq: {daily: "Daily", d2: "Every 2 days", d3: "Every 3 days", weekly: "Weekly", w2: "Every 2 weeks", monthly: "Monthly", once: "Once"},
    owners: {A: "André", N: "Natalia", AN: "Both", R: "Taking turns"}, rotate: "taking turns",
    f: {t: "What?", freq: "How often?", next: "Due / next time", o: "Who?", effort: "How much effort?", note: "Note"},
    newTask: "New task", shopPh: "What do we need?", add: "Add", clearDone: "Remove checked", inCart: "In the cart",
    emptyShop: "The list is empty.", nextOn: d => `next ${d}`, by: n => `by ${n}`}
};
const FREQ_DAYS = {daily: 1, d2: 2, d3: 3, weekly: 7, w2: 14};
const HOME_EXAMPLES = () => ({
  chores: [
    {id: "h1", effort: 1, t: L("Spülmaschine ausräumen", "Empty the dishwasher"), freq: "daily", next: "2026-10-03", o: "R", cur: "A"},
    {id: "h2", effort: 3, t: L("Wocheneinkauf", "Weekly groceries"), freq: "weekly", next: "2026-10-03", o: "A", note: L("Liste im Reiter Einkauf", "List in the Groceries tab")},
    {id: "h3", effort: 3, t: L("Bad putzen", "Clean the bathroom"), freq: "w2", next: "2026-10-02", o: "R", cur: "N"},
    {id: "h4", effort: 2, t: L("Wäsche waschen", "Do the laundry"), freq: "d3", next: "2026-10-04", o: "N"},
    {id: "h5", effort: 2, t: L("Essensplan für die Woche", "Meal plan for the week"), freq: "weekly", next: "2026-10-04", o: "N"},
    {id: "h6", effort: 2, t: L("Staubsaugen", "Vacuum"), freq: "weekly", next: "2026-10-05", o: "R", cur: "A"},
    {id: "h7", effort: 1, t: L("Müll & Altglas rausbringen", "Take out trash & glass"), freq: "weekly", next: "2026-10-06", o: "A"},
    {id: "h8", effort: 2, t: L("Bettwäsche wechseln", "Change the bed sheets"), freq: "w2", next: "2026-10-10", o: "N"},
    {id: "h9", effort: 2, t: L("Kühlschrank auswischen", "Wipe out the fridge"), freq: "monthly", next: "2026-10-15", o: "A"},
    {id: "h10", effort: 1, t: L("Glühbirne im Flur tauschen", "Replace hallway light bulb"), freq: "once", next: "2026-10-05", o: "A"},
    {id: "h11", effort: 2, t: L("Winterjacke Nara kaufen", "Buy winter jacket for Nara"), freq: "once", next: "2026-10-20", o: "N", note: L("Gr. 110", "Size 110")},
    {id: "h12", effort: 2, t: L("Fahrradanhänger verkaufen", "Sell the bike trailer"), freq: "once", next: "2026-10-31", o: "A", note: "Kleinanzeigen"}
  ],
  shop: [
    {id: "s1", t: L("Milch", "Milk"), by: "N", done: false}, {id: "s2", t: L("Bananen", "Bananas"), by: "A", done: false},
    {id: "s3", t: L("Windeln Gr. 5", "Diapers size 5"), by: "N", done: false}, {id: "s4", t: L("Haferflocken", "Oats"), by: "A", done: false},
    {id: "s5", t: L("Kaffee", "Coffee"), by: "A", done: true}
  ],
  log: [["A", "2026-09-28"], ["N", "2026-09-28"], ["N", "2026-09-29"], ["A", "2026-09-30"], ["N", "2026-09-30"], ["N", "2026-10-01"], ["A", "2026-10-01"], ["N", "2026-10-02"], ["N", "2026-10-02"], ["A", "2026-10-02"]]
});
const HOME_KEY = "fom.home.v1";
let HOME = (() => { try { const s = FOMStore.getItem(HOME_KEY); if (s) return JSON.parse(s); } catch (e) {} return HOME_EXAMPLES(); })();
// Data saved before chores had an effort level: take it from the examples.
HOME_EXAMPLES().chores.forEach(ex => { const c = HOME.chores.find(x => x.id === ex.id); if (c && !("effort" in c)) c.effort = ex.effort; });
const saveHome = () => { try { FOMStore.setItem(HOME_KEY, JSON.stringify(HOME)); } catch (e) {} };
let homeFilter = "all";

const whoNow = c => c.o === "R" ? c.cur : c.o;
const effortOf = c => +c.effort || 2;
const step = (d, f) => f === "monthly" ? addMonths(d, 1) : addDays(d, FREQ_DAYS[f]);
const openChores = () => HOME.chores.filter(c => !c.done);

function completeChore(c) {
  HOME.log.push([me(), iso(TODAY), effortOf(c)]);
  if (c.freq === "once") { c.done = iso(TODAY); return; }
  let n = parse(c.next);
  do n = step(n, c.freq); while (n <= TODAY);
  c.next = iso(n);
  if (c.o === "R") c.cur = c.cur === "A" ? "N" : "A";
}
function choreOwner(c) {
  if (c.o === "R") return `<span class="who who-${c.cur}" title="${TH[lang].rotate}">↻ ${c.cur}</span>`;
  return ownerTag(c.o);
}
function homeTabs(active) {
  const th = TH[lang];
  return `<nav class="tabs">${[["", th.tasks], ["plan", th.plan], ["shop", th.shop]].map(([k, l]) =>
    `<a href="#/home${k ? "/" + k : ""}" class="${k === active ? "on" : ""}">${l}${k === "shop" ? ` <span class="cnt">${HOME.shop.filter(s => !s.done).length}</span>` : ""}</a>`).join("")}</nav>`;
}
function vHome(r) {
  const d = DOM.home, top = hero(ic("home"), d.c, tx(d.name), tx(d.desc)) + homeTabs(r[1] || "");
  const foot = `<p class="hint">${TA[lang].hint} <button class="linkbtn" data-act="resetHome">${TA[lang].reset}</button></p>`;
  return top + (r[1] === "plan" ? vPlan() : r[1] === "shop" ? vShop() : vTasks()) + foot;
}
function choreRow(c, checked) {
  const th = TH[lang], due = parse(c.next);
  return `<div class="drow chore ${checked ? "isdone" : ""}"><button class="check ${checked ? "on" : ""}" data-act="${checked ? "undoChore" : "doneChore"}" data-id="${c.id}" aria-label="✓"></button>
    <button class="docedit" data-act="editChore" data-id="${c.id}"><span class="dmain"><span class="t">${esc(tx(c.t))}</span>
    <span class="m">${th.freq[c.freq]}${c.note && tx(c.note) ? " · " + esc(tx(c.note)) : ""}</span></span></button>
    <span class="dside">${choreOwner(c)}${checked ? "" : dayDiff(due) > 0 ? chip(dayDiff(due) <= 6 ? longDate(due) : fmt(due), "var(--muted)") : dayDiff(due) < 0 ? dueChip({due}) : ""}</span></div>`;
}
function vTasks() {
  const th = TH[lang], meC = me();
  const mineOnly = c => homeFilter === "all" || whoNow(c) === meC || c.o === "AN";
  const groups = {overdue: [], today: [], week: [], later: []};
  openChores().filter(mineOnly).sort((a, b) => a.next.localeCompare(b.next)).forEach(c => { const n = dayDiff(parse(c.next));
    groups[n < 0 ? "overdue" : n === 0 ? "today" : n <= 7 ? "week" : "later"].push(c); });
  const doneOnce = HOME.chores.filter(c => c.done);
  const monday = addDays(TODAY, -((TODAY.getDay() + 6) % 7)), wk = HOME.log.filter(([, d]) => parse(d) >= monday);
  const ptsOf = p => wk.filter(([q]) => q === p).reduce((s, [, , e]) => s + (e || 2), 0), a = ptsOf("A"), n = ptsOf("N"), pa = a + n ? Math.round(a / (a + n) * 100) : 50;
  return `<section class="nextcard homecard"><div class="nc-main"><p class="eyebrow">${th.doneWeekPts}</p>
      <p class="big">André ${a} · Natalia ${n}</p>
      <div class="loadbar"><div style="width:${pa}%;background:var(--sky)"></div><div style="width:${100 - pa}%;background:var(--rose)"></div></div></div>
      <div class="nc-actions"><button class="btn primary" data-act="addChore">${th.addTask}</button>
      <div class="seg mini">${[["all", th.all], ["mine", th.mine]].map(([k, l]) => `<button class="${homeFilter === k ? "on" : ""}" data-act="filter" data-id="${k}">${l}</button>`).join("")}</div></div></section>
    ${Object.values(groups).some(g => g.length) ? "" : `<p class="empty">${th.nothing}</p>`}
    ${Object.entries(groups).filter(([, l]) => l.length).map(([g, l]) => `<section class="dgroup ${g === "overdue" ? "overdue" : ""}"><h4>${th.g[g]} <span>${l.length}</span></h4>${l.map(c => choreRow(c)).join("")}</section>`).join("")}
    ${doneOnce.length ? `<details class="dgroup"><summary><h4>${th.doneH} <span>${doneOnce.length}</span></h4></summary>${doneOnce.map(c => choreRow(c, true)).join("")}</details>` : ""}`;
}
// Times per week, used to compare how much recurring work each person carries.
const PER_WEEK = {daily: 7, d2: 3.5, d3: 7 / 3, weekly: 1, w2: 0.5, monthly: 12 / 52};
const perWeekTxt = n => (Math.round(n * 10) / 10).toLocaleString(lang === "de" ? "de-DE" : "en-GB");
function vPlan() {
  const th = TH[lang], list = HOME.chores.filter(c => c.freq !== "once"), order = Object.keys(th.freq);
  const sum = o => list.filter(c => c.o === o).reduce((s, c) => s + PER_WEEK[c.freq], 0);
  const pts = o => list.filter(c => c.o === o).reduce((s, c) => s + PER_WEEK[c.freq] * effortOf(c), 0);
  const A = pts("A") + (pts("R") + pts("AN")) / 2, N = pts("N") + (pts("R") + pts("AN")) / 2, pa = A + N ? Math.round(A / (A + N) * 100) : 50;
  const dots = c => `<span class="effort" title="${th.efforts[effortOf(c)]}">${"●".repeat(effortOf(c))}<span>${"●".repeat(3 - effortOf(c))}</span></span>`;
  const col = o => { const items = list.filter(c => c.o === o).sort((a, b) => order.indexOf(a.freq) - order.indexOf(b.freq));
    return `<section class="sec plancol"><div class="planhead">${o === "R" ? `<span class="who">↻</span>` : ownerTag(o)}<b>${th.owners[o]}</b><span class="m">${th.pts(Math.round(pts(o)))} · ${th.perWeek(perWeekTxt(sum(o)))}</span></div>
      ${items.length ? items.map(c => `<button class="planitem" data-act="editChore" data-id="${c.id}"><span class="t">${esc(tx(c.t))} ${dots(c)}</span><span class="m">${th.freq[c.freq]} · ${th.pts(perWeekTxt(PER_WEEK[c.freq] * effortOf(c)))}${o === "R" ? ` · ${th.nowTurn(PEOPLE[c.cur].name)}` : ""}</span></button>`).join("")
        : `<p class="empty">–</p>`}</section>`; };
  return `<section class="nextcard homecard"><div class="nc-main"><p class="eyebrow">${th.planTitle}</p>
      <p class="big">André ${th.pts(Math.round(A))} · Natalia ${th.pts(Math.round(N))}</p>
      <div class="loadbar"><div style="width:${pa}%;background:var(--sky)"></div><div style="width:${100 - pa}%;background:var(--rose)"></div></div>
      <p class="m">${th.ptsHint}</p></div>
      <div class="nc-actions"><button class="btn primary" data-act="addRoutine">${th.addRoutine}</button></div></section>
    <div class="cols plan">${["A", "N", "R", "AN"].map(col).join("")}</div>`;
}
function vShop() {
  const th = TH[lang], open = HOME.shop.filter(s => !s.done), done = HOME.shop.filter(s => s.done);
  const row = s => `<div class="drow chore shop ${s.done ? "isdone" : ""}"><button class="check ${s.done ? "on" : ""}" data-act="toggleShop" data-id="${s.id}" aria-label="✓"></button>
    <span class="dmain"><span class="t">${esc(tx(s.t))}</span><span class="m">${th.by(PEOPLE[s.by].name)}</span></span>
    <button class="x" data-act="delShop" data-id="${s.id}" title="${TA[lang].del}">×</button></div>`;
  return `<form class="goodform" id="shopform"><input name="t" placeholder="${th.shopPh}" autocomplete="off" required><button class="btn primary">${th.add}</button></form>
    ${open.length ? `<section class="dgroup">${open.map(row).join("")}</section>` : `<p class="empty">${th.emptyShop}</p>`}
    ${done.length ? `<section class="dgroup"><h4>${th.inCart} <span>${done.length}</span> <button class="linkbtn" data-act="clearShop">${th.clearDone}</button></h4>${done.map(row).join("")}</section>` : ""}`;
}
function bindHome(v) {
  const th = TH[lang], byId = id => HOME.chores.find(c => c.id === id);
  const form = once => [{k: "t", label: th.f.t, req: true}, {k: "freq", label: th.f.freq, type: "select", options: once ? th.freq : Object.fromEntries(Object.entries(th.freq).filter(([k]) => k !== "once"))},
    {k: "next", label: th.f.next, type: "date", req: true}, {k: "o", label: th.f.o, type: "select", options: th.owners}, {k: "effort", label: th.f.effort, type: "select", options: th.efforts}, {k: "note", label: th.f.note}];
  const clean = val => ({...val, effort: +val.effort || 2, cur: val.o === "R" ? me() : undefined});
  v.querySelectorAll("[data-act]").forEach(b => b.onclick = e => {
    const act = b.dataset.act, id = b.dataset.id;
    if (act !== "resetHome") e.preventDefault();
    switch (act) {
      case "doneChore": completeChore(byId(id)); saveHome(); return render();
      case "undoChore": { const c = byId(id); delete c.done; HOME.log.pop(); saveHome(); return render(); }
      case "filter": homeFilter = id; return render();
      case "addChore": return openForm(th.newTask, form(true), {freq: "once", next: iso(TODAY), o: me(), effort: 2}, val => HOME.chores.push({id: "u" + Date.now(), ...clean(val)}));
      case "addRoutine": return openForm(th.newTask, form(false), {freq: "weekly", next: iso(TODAY), o: "R", effort: 2}, val => HOME.chores.push({id: "u" + Date.now(), ...clean(val)}));
      case "editChore": { const c = byId(id);
        return openForm(TA[lang].edit, form(true), {...c, t: plain(c.t), note: plain(c.note)},
          val => Object.assign(c, val, {effort: +val.effort || 2}, val.o === "R" && !c.cur ? {cur: me()} : {}), () => HOME.chores.splice(HOME.chores.indexOf(c), 1)); }
      case "toggleShop": { const s = HOME.shop.find(x => x.id === id); s.done = !s.done; saveHome(); return render(); }
      case "delShop": HOME.shop = HOME.shop.filter(x => x.id !== id); saveHome(); return render();
      case "clearShop": HOME.shop = HOME.shop.filter(x => !x.done); saveHome(); return render();
      case "resetHome": if (confirm(TA[lang].resetQ)) { HOME = HOME_EXAMPLES(); saveHome(); render(); } return;
    }
  });
  const sf = v.querySelector("#shopform");
  if (sf) sf.onsubmit = e => { e.preventDefault(); const t = sf.elements.namedItem("t").value.trim(); if (!t) return;
    HOME.shop.unshift({id: "u" + Date.now(), t, by: me(), done: false}); saveHome(); render(); v.querySelector("#shopform input")?.focus(); };
}

/* ---------- Gesundheit ---------- */
const TG = {
  de: {appts: "Termine", profiles: "Steckbriefe", doctors: "Ärzte", addAppt: "+ Termin", addDoc: "+ Arzt / Praxis",
    g: {check: "Zu klären", booked: "Termin steht", todo: "Termin machen", later: "Später"}, nothing: "Alles im grünen Bereich.",
    kinds: {checkup: "Vorsorge", dentist: "Zahnarzt", vaccine: "Impfung", doctor: "Arzttermin", other: "Sonstiges"},
    repeats: {0: "Einmalig", 6: "Alle 6 Monate", 12: "Jährlich", 24: "Alle 2 Jahre", 36: "Alle 3 Jahre", 120: "Alle 10 Jahre"},
    states: {open: "Offen", booked: "Termin vereinbart", done: "Erledigt", unknown: "Unklar – erledigt?"},
    window: (a, b) => `Zeitraum ${a} – ${b}`, from: d => `ab ${d}`, bookedAt: d => `Termin ${d}`, doneQ: "erledigt?",
    uAuto: "automatisch aus dem Geburtsdatum", f: {t: "Was?", who: "Für wen?", kind: "Art", due: "Fällig ab", booked: "Vereinbarter Termin", repeat: "Wiederholung",
      o: "Wer kümmert sich?", note: "Notiz", state: "Status", blood: "Blutgruppe", allergies: "Allergien / Unverträglichkeiten", meds: "Medikamente",
      insurance: "Krankenkasse", height: "Größe (cm)", weight: "Gewicht (kg)", measured: "Gemessen am", notes: "Hinweise",
      name: "Name", spec: "Fachrichtung", phone: "Telefon", addr: "Adresse", for: "Für wen?"},
    forOpts: {fam: "Ganze Familie", AN: "Eltern", kids: "Kinder", A: "André", N: "Natalia", nara: "Nara", levi: "Levi"}, call: "Anrufen", emergency: "Notfall", e112: "Notruf", e116: "Ärztlicher Bereitschaftsdienst", none: "–",
    sensitive: "Gesundheitsdaten sind sensibel. Im Mockup bleiben sie nur in diesem Browser; die echte App braucht dafür Login und Verschlüsselung.",
    newAppt: "Neuer Termin", newDoc: "Neue Praxis", measuredOn: d => `gemessen ${d}`, editProfile: "Bearbeiten"},
  en: {appts: "Appointments", profiles: "Profiles", doctors: "Doctors", addAppt: "+ Appointment", addDoc: "+ Doctor / practice",
    g: {check: "To clarify", booked: "Booked", todo: "Needs booking", later: "Later"}, nothing: "All good.",
    kinds: {checkup: "Check-up", dentist: "Dentist", vaccine: "Vaccination", doctor: "Doctor visit", other: "Other"},
    repeats: {0: "Once", 6: "Every 6 months", 12: "Yearly", 24: "Every 2 years", 36: "Every 3 years", 120: "Every 10 years"},
    states: {open: "Open", booked: "Appointment booked", done: "Done", unknown: "Unclear – done?"},
    window: (a, b) => `Window ${a} – ${b}`, from: d => `from ${d}`, bookedAt: d => `Booked ${d}`, doneQ: "done?",
    uAuto: "automatic from date of birth", f: {t: "What?", who: "For whom?", kind: "Type", due: "Due from", booked: "Booked appointment", repeat: "Repeats",
      o: "Who's on it?", note: "Note", state: "Status", blood: "Blood type", allergies: "Allergies / intolerances", meds: "Medication",
      insurance: "Health insurance", height: "Height (cm)", weight: "Weight (kg)", measured: "Measured on", notes: "Notes",
      name: "Name", spec: "Specialty", phone: "Phone", addr: "Address", for: "For whom?"},
    forOpts: {fam: "Whole family", AN: "Parents", kids: "Kids", A: "André", N: "Natalia", nara: "Nara", levi: "Levi"}, call: "Call", emergency: "Emergency", e112: "Emergency number", e116: "Out-of-hours doctor service", none: "–",
    sensitive: "Health data is sensitive. In the mockup it stays in this browser only; the real app needs login and encryption.",
    newAppt: "New appointment", newDoc: "New practice", measuredOn: d => `measured ${d}`, editProfile: "Edit"}
};
// Children's check-ups (G-BA schedule): name, window start and end in months of age.
const U_SCHEDULE = [["U6", 10, 12], ["U7", 21, 24], ["U7a", 34, 36], ["U8", 46, 48], ["U9", 60, 64], ["J1", 144, 168]];
const HEALTH_EXAMPLES = () => ({
  u: {"nara:U8": {state: "unknown", o: "N"}, "levi:U7": {state: "open", o: "A"}},
  appts: [
    {id: "m1", who: "nara", t: L("Kinderzahnarzt Nara", "Pediatric dentist Nara"), kind: "dentist", due: "2026-10-20", booked: "", repeat: 6, o: "N", note: ""},
    {id: "m2", who: "A", t: L("Zahnarzt-Kontrolle André", "Dentist check-up André"), kind: "dentist", due: "2026-11-10", booked: "", repeat: 6, o: "A", note: ""},
    {id: "m3", who: "N", t: L("Zahnarzt-Kontrolle Natalia", "Dentist check-up Natalia"), kind: "dentist", due: "2026-12-01", booked: "2026-12-02T09:30", repeat: 6, o: "N", note: ""},
    {id: "m4", who: "N", t: L("Augenarzt Natalia", "Eye doctor Natalia"), kind: "doctor", due: "2027-01-15", booked: "", repeat: 24, o: "N", note: ""},
    {id: "m5", who: "A", t: L("Tetanus-Auffrischung André", "Tetanus booster André"), kind: "vaccine", due: "2027-05-01", booked: "", repeat: 120, o: "A", note: L("laut Impfpass", "per vaccination record")}
  ],
  profiles: {
    A: {blood: "A+", allergies: L("Heuschnupfen (Birke)", "Hay fever (birch)"), meds: "", insurance: L("gesetzlich", "statutory"), notes: ""},
    N: {blood: "0+", allergies: "", meds: "", insurance: L("gesetzlich", "statutory"), notes: ""},
    nara: {blood: "", allergies: L("keine bekannt", "none known"), meds: "", insurance: L("familienversichert", "family-insured"), height: "104", weight: "16,5", measured: "2026-09-12", notes: L("Nimmt Medizin am liebsten mit Saft", "Prefers medicine with juice")},
    levi: {blood: "", allergies: L("keine bekannt", "none known"), meds: "", insurance: L("familienversichert", "family-insured"), height: "82", weight: "11,2", measured: "2026-09-12", notes: L("Zahnt gerade (Backenzähne)", "Teething (molars)")}
  },
  doctors: [
    {id: "k1", name: "Kinderarztpraxis Sonnenschein", spec: L("Kinderarzt", "Pediatrician"), phone: "0123 456780", addr: "Lindenstraße 4", for: "kids"},
    {id: "k2", name: "Zahnarztpraxis am Markt", spec: L("Zahnarzt", "Dentist"), phone: "0123 456781", addr: "Marktplatz 2", for: "fam"},
    {id: "k3", name: "Hausarztpraxis Dr. Muster", spec: L("Hausarzt", "General practitioner"), phone: "0123 456782", addr: "Bahnhofstraße 10", for: "AN"}
  ]
});
const HEALTH_KEY = "fom.health.v1";
let HEALTH = (() => { try { const s = FOMStore.getItem(HEALTH_KEY); if (s) return JSON.parse(s); } catch (e) {} return HEALTH_EXAMPLES(); })();
const saveHealth = () => { try { FOMStore.setItem(HEALTH_KEY, JSON.stringify(HEALTH)); } catch (e) {} };
const personName = w => KIDS[w]?.name || PEOPLE[w]?.name || TA[lang].whos[w] || w;
const fmtDT = s => { const d = new Date(s); return `${fmt(d)} ${d.toLocaleTimeString(lang === "de" ? "de-DE" : "en-GB", {hour: "2-digit", minute: "2-digit"})}`; };

// One list of everything health-related that is still open: generated check-ups plus manual appointments.
function healthItems() {
  const out = [];
  Object.entries(KIDS).forEach(([kid, k]) => U_SCHEDULE.forEach(([u, a, b]) => {
    const from = addMonths(k.born, a), to = addMonths(k.born, b), key = `${kid}:${u}`, s = HEALTH.u[key] || {};
    const state = s.state || (to < TODAY ? "done" : "open");
    if (state === "done" || dayDiff(from) > 400) return;
    out.push({id: `u-${key}`, src: "u", key, who: kid, t: L(`${u} ${k.name}`, `${u} ${k.name}`), kind: "checkup", due: from, until: to,
      booked: s.booked || "", state: s.booked && state === "open" ? "booked" : state, o: s.o || "AN"});
  }));
  HEALTH.appts.filter(m => !m.done).forEach(m => { const g = !m.booked && gcalMatch(m.t), booked = m.booked || (g ? `${g.date}T${g.time || "00:00"}` : "");
    out.push({id: m.id, src: "appt", ref: m, who: m.who, t: m.t, kind: m.kind, due: parse(m.due), gcal: g ? g.id : "",
    booked, state: booked ? "booked" : "open", o: m.o, repeat: m.repeat, note: m.note}); });
  return out;
}
const hGroup = i => i.state === "unknown" || (i.state === "open" && (i.until ? i.until : i.due) < TODAY) ? "check"
  : i.state === "booked" ? "booked" : dayDiff(i.due) <= 90 ? "todo" : "later";
const hWhen = i => { const tg = TG[lang];
  if (i.state === "booked") return chip(tg.bookedAt(fmtDT(i.booked)), "var(--active)");
  if (hGroup(i) === "check") return chip(i.state === "unknown" ? tg.doneQ : T[lang].check, "var(--warn)");
  return dayDiff(i.due) > 0 ? chip(tg.from(fmt(i.due) + (i.due.getFullYear() !== TODAY.getFullYear() ? " " + i.due.getFullYear() : "")), "var(--muted)") : dueChip({due: i.until || i.due}); };

function healthTabs(active) {
  const tg = TG[lang];
  return `<nav class="tabs">${[["", tg.appts], ["profiles", tg.profiles], ["doctors", tg.doctors]].map(([k, l]) =>
    `<a href="#/health${k ? "/" + k : ""}" class="${k === active ? "on" : ""}">${l}</a>`).join("")}</nav>`;
}
function vHealth(r) {
  const d = DOM.health, top = hero(ic("health"), d.c, tx(d.name), tx(d.desc)) + healthTabs(r[1] || "");
  const foot = `<p class="hint">${TG[lang].sensitive} <button class="linkbtn" data-act="resetHealth">${TA[lang].reset}</button></p>`;
  return top + (r[1] === "profiles" ? vProfiles() : r[1] === "doctors" ? vDoctors() : vAppts()) + foot;
}
function vAppts() {
  const tg = TG[lang], groups = {check: [], booked: [], todo: [], later: []};
  healthItems().sort((a, b) => (a.booked || iso(a.due)).localeCompare(b.booked || iso(b.due))).forEach(i => groups[hGroup(i)].push(i));
  return `<div class="toolbar"><button class="btn primary" data-act="addAppt">${tg.addAppt}</button></div>
    ${Object.values(groups).some(g => g.length) ? "" : `<p class="empty">${tg.nothing}</p>`}
    ${Object.entries(groups).filter(([, l]) => l.length).map(([g, l]) => `<section class="dgroup ${g === "check" ? "overdue" : ""}"><h4>${tg.g[g]} <span>${l.length}</span></h4>${l.map(i => `
      <div class="drow chore"><button class="check" data-act="doneHealth" data-id="${i.id}" aria-label="✓"></button>
      <button class="docedit" data-act="editHealth" data-id="${i.id}"><span class="dmain"><span class="t">${esc(tx(i.t))}</span>
      <span class="m">${personName(i.who)} · ${tg.kinds[i.kind]}${i.until ? " · " + tg.window(fmt(i.due), fmt(i.until) + " " + i.until.getFullYear()) : ""}${i.src === "appt" && i.repeat ? " · " + tg.repeats[i.repeat] : ""}</span></span>
      <span class="dside">${i.gcal ? `<span class="gbadge" title="Google Kalender">G</span>` : ""}${ownerTag(i.o)}${hWhen(i)}</span></button></div>`).join("")}</section>`).join("")}`;
}
function vProfiles() {
  const tg = TG[lang], f = tg.f;
  return `<div class="cols">${["A", "N", "nara", "levi"].map(w => { const p = HEALTH.profiles[w] || {};
    const rows = [[f.blood, p.blood], [f.allergies, tx(p.allergies)], [f.meds, tx(p.meds)], [f.insurance, tx(p.insurance)]];
    if (KIDS[w]) rows.push([`${f.height} / ${f.weight}`, p.height ? `${p.height} cm · ${p.weight} kg <span class="muted">· ${tg.measuredOn(fmt(parse(p.measured)))}</span>` : ""]);
    rows.push([f.notes, tx(p.notes)]);
    return `<section class="sec"><div class="planhead">${KIDS[w] ? `<span class="kidav sm" style="--c:${KIDS[w].c}">${KIDS[w].name[0]}</span>` : ownerTag(w)}<b>${personName(w)}</b>
      <button class="linkbtn" style="margin-left:auto" data-act="editProfile" data-id="${w}">${tg.editProfile}</button></div>
      <dl class="dl compact">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v ? (typeof v === "string" && v.includes("<span") ? v : esc(v)) : `<span class="muted">${tg.none}</span>`}</dd>`).join("")}</dl></section>`; }).join("")}</div>`;
}
const telLink = (n, label) => n ? `<a class="extlink" href="tel:${esc(n.replace(/[^\d+]/g, ""))}">${label}</a>` : "";
function vDoctors() {
  const tg = TG[lang];
  return `<section class="nextcard emerg"><div class="nc-main"><p class="eyebrow">${tg.emergency}</p>
      <p class="big">112 <span class="m">${tg.e112}</span></p><p class="big">116 117 <span class="m">${tg.e116}</span></p></div>
      <div class="nc-actions"><a class="btn primary" href="tel:112">112 ${tg.call}</a><a class="btn" href="tel:116117">116 117</a></div></section>
    <div class="toolbar"><button class="btn primary" data-act="addDoctor">${tg.addDoc}</button></div>
    <div class="dgroup">${HEALTH.doctors.map(d => `<div class="drow docrow2"><button class="docedit" data-act="editDoctor" data-id="${d.id}"><span class="dmain">
      <span class="t">${esc(d.name)}</span><span class="m">${esc(tx(d.spec))} · ${tg.forOpts[d.for] || ""}</span>
      <span class="m">${esc(d.addr || "")}${d.phone ? " · " + esc(d.phone) : ""}</span></span></button>${telLink(d.phone, tg.call)}</div>`).join("")}</div>`;
}
function bindHealth(v) {
  const tg = TG[lang], f = tg.f, whos = {A: "André", N: "Natalia", nara: "Nara", levi: "Levi"};
  const apptForm = () => [{k: "t", label: f.t, req: true}, {k: "who", label: f.who, type: "select", options: whos}, {k: "kind", label: f.kind, type: "select", options: tg.kinds},
    {k: "due", label: f.due, type: "date", req: true}, {k: "booked", label: f.booked, type: "datetime-local"}, {k: "repeat", label: f.repeat, type: "select", options: tg.repeats},
    {k: "o", label: f.o, type: "select", options: TA[lang].owners}, {k: "note", label: f.note}];
  const uForm = () => [{k: "state", label: f.state, type: "select", options: {open: tg.states.open, unknown: tg.states.unknown, done: tg.states.done}},
    {k: "booked", label: f.booked, type: "datetime-local"}, {k: "o", label: f.o, type: "select", options: TA[lang].owners}];
  const docForm = () => [{k: "name", label: f.name, req: true}, {k: "spec", label: f.spec}, {k: "phone", label: f.phone, type: "tel"}, {k: "addr", label: f.addr}, {k: "for", label: f.for, type: "select", options: tg.forOpts}];
  const find = id => healthItems().find(i => i.id === id);
  v.querySelectorAll("[data-act]").forEach(b => b.onclick = e => {
    const act = b.dataset.act, id = b.dataset.id;
    if (act !== "resetHealth") e.preventDefault();
    switch (act) {
      case "doneHealth": { const i = find(id);
        if (i.src === "u") HEALTH.u[i.key] = {...(HEALTH.u[i.key] || {}), state: "done"};
        else if (+i.repeat) { /* next one counts from when it actually happened */ const m = i.ref, base = m.booked ? new Date(m.booked) : TODAY; m.due = iso(addMonths(base, +m.repeat)); m.booked = ""; }
        else i.ref.done = iso(TODAY);
        saveHealth(); return render(); }
      case "editHealth": { const i = find(id);
        if (i.src === "u") return openForm(tx(i.t), uForm(), {state: i.state === "booked" ? "open" : i.state, booked: i.booked, o: i.o},
          val => { HEALTH.u[i.key] = {state: val.state, booked: val.booked, o: val.o}; });
        const m = i.ref;
        return openForm(TA[lang].edit, apptForm(), {...m, t: plain(m.t), note: plain(m.note)}, val => Object.assign(m, val, {repeat: +val.repeat}),
          () => HEALTH.appts.splice(HEALTH.appts.indexOf(m), 1)); }
      case "addAppt": return openForm(tg.newAppt, apptForm(), {who: "A", kind: "doctor", due: iso(TODAY), repeat: 0, o: me()},
        val => HEALTH.appts.push({id: "u" + Date.now(), ...val, repeat: +val.repeat}));
      case "editProfile": { const p = HEALTH.profiles[id] = HEALTH.profiles[id] || {};
        const fields = [{k: "blood", label: f.blood}, {k: "allergies", label: f.allergies}, {k: "meds", label: f.meds}, {k: "insurance", label: f.insurance}];
        if (KIDS[id]) fields.push({k: "height", label: f.height}, {k: "weight", label: f.weight}, {k: "measured", label: f.measured, type: "date"});
        fields.push({k: "notes", label: f.notes});
        return openForm(personName(id), fields, Object.fromEntries(fields.map(x => [x.k, plain(p[x.k])])), val => Object.assign(p, val)); }
      case "addDoctor": return openForm(tg.newDoc, docForm(), {for: "fam"}, val => HEALTH.doctors.push({id: "u" + Date.now(), ...val}));
      case "editDoctor": { const d = HEALTH.doctors.find(x => x.id === id);
        return openForm(TA[lang].edit, docForm(), {...d, spec: plain(d.spec)}, val => Object.assign(d, val), () => HEALTH.doctors.splice(HEALTH.doctors.indexOf(d), 1)); }
      case "resetHealth": if (confirm(TA[lang].resetQ)) { HEALTH = HEALTH_EXAMPLES(); saveHealth(); render(); } return;
    }
  });
}

/* ---------- Ziele & Erinnerungen ---------- */
const TZ = {
  de: {goals: "Ziele", bucket: "Bucket List", memories: "Erinnerungen", addGoal: "+ Ziel", addDream: "+ Traum", addMemory: "+ Erinnerung",
    active: "Woran wir arbeiten", achieved: "Erreicht", steps: "Schritte", addStepPh: "Nächster Schritt …", add: "Hinzufügen",
    achieve: "Ziel erreicht 🎉", reopen: "Wieder öffnen", why: "Warum", horizon: "Bis wann", progress: (a, b) => `${a} von ${b} Schritten`,
    bstatus: {idea: "Idee", planned: "Geplant", done: "Erlebt"}, cats: {travel: "Reise", experience: "Erlebnis", project: "Projekt", adventure: "Abenteuer", learn: "Lernen"},
    forWho: {fam: "Ganze Familie", AN: "Wir zwei", kids: "Mit den Kindern", nara: "Nara", levi: "Levi", A: "André", N: "Natalia"},
    lived: d => `erlebt ${d}`, plannedFor: w => `geplant: ${w}`, toMemory: "Als Erinnerung festhalten", yearAgo: "Heute vor einem Jahr", yearsAgo: n => `Vor ${n} Jahren`,
    photos: "Fotos ↗", emptyMem: "Noch keine Erinnerungen – haltet den ersten schönen Moment fest!",
    f: {t: "Was?", why: "Warum ist uns das wichtig?", horizon: "Bis wann? (z. B. 2027, Sommer 2027)", o: "Wer treibt es voran?", cat: "Kategorie", who: "Für wen?",
      status: "Status", when: "Wann ungefähr?", note: "Notiz", date: "Datum", text: "Was ist passiert?", link: "Fotos (Link, z. B. Google Fotos)"},
    newGoal: "Neues Ziel", newDream: "Neuer Traum", newMemory: "Neue Erinnerung"},
  en: {goals: "Goals", bucket: "Bucket list", memories: "Memories", addGoal: "+ Goal", addDream: "+ Dream", addMemory: "+ Memory",
    active: "What we're working on", achieved: "Achieved", steps: "Steps", addStepPh: "Next step …", add: "Add",
    achieve: "Goal achieved 🎉", reopen: "Reopen", why: "Why", horizon: "By when", progress: (a, b) => `${a} of ${b} steps`,
    bstatus: {idea: "Idea", planned: "Planned", done: "Done"}, cats: {travel: "Travel", experience: "Experience", project: "Project", adventure: "Adventure", learn: "Learning"},
    forWho: {fam: "Whole family", AN: "Just us two", kids: "With the kids", nara: "Nara", levi: "Levi", A: "André", N: "Natalia"},
    lived: d => `done ${d}`, plannedFor: w => `planned: ${w}`, toMemory: "Save as a memory", yearAgo: "One year ago today", yearsAgo: n => `${n} years ago`,
    photos: "Photos ↗", emptyMem: "No memories yet – capture your first nice moment!",
    f: {t: "What?", why: "Why does it matter to us?", horizon: "By when? (e.g. 2027, summer 2027)", o: "Who drives it?", cat: "Category", who: "For whom?",
      status: "Status", when: "Roughly when?", note: "Note", date: "Date", text: "What happened?", link: "Photos (link, e.g. Google Photos)"},
    newGoal: "New goal", newDream: "New dream", newMemory: "New memory"}
};
const st = (t, done) => ({id: "s" + Math.random().toString(36).slice(2, 8), t, done});
const GOALS_EXAMPLES = () => ({
  goals: [
    {id: "z1", t: L("Mehr Zeit draußen als Familie", "More time outdoors as a family"), why: L("Weniger Bildschirm, mehr Natur und Bewegung", "Less screen time, more nature and movement"), horizon: "2026", o: "AN",
      steps: [st(L("Sonntagsausflug als festes Ritual", "Sunday outing as a fixed ritual"), true), st(L("Kraxe für Levi kaufen", "Buy a child carrier for Levi"), true), st(L("10 Ausflugsziele in der Nähe sammeln", "Collect 10 nearby day trips"), false), st(L("Einmal im Garten zelten", "Camp in the garden once"), false)]},
    {id: "z2", t: L("Sommerurlaub 2027 in Skandinavien", "Summer holiday 2027 in Scandinavia"), why: L("Erster großer Urlaub zu viert", "First big holiday as a family of four"), horizon: L("Sommer 2027", "Summer 2027"), o: "N",
      steps: [st(L("Region festlegen", "Pick the region"), true), st(L("Ferienhaus buchen", "Book a holiday house"), false), st(L("Fähre buchen", "Book the ferry"), false), st(L("Urlaub einreichen", "Request time off"), false)]},
    {id: "z3", t: L("Notgroschen auf 10.000 €", "Emergency fund at €10,000"), why: L("Ruhe, falls mal etwas kaputtgeht", "Peace of mind if something breaks"), horizon: "2027", o: "A",
      steps: [st(L("Dauerauftrag 300 € im Monat", "Standing order €300 a month"), true), st(L("Abos durchgehen und kündigen", "Review and cancel subscriptions"), false)]},
    {id: "z4", t: L("Kita-Platz für Levi finden", "Find a daycare place for Levi"), why: L("Damit beide wieder mehr arbeiten können", "So both of us can work more again"), horizon: "2026", o: "N", status: "done", doneAt: "2026-09-15",
      steps: [st(L("Anmeldungen bei 5 Kitas", "Apply at 5 daycares"), true), st(L("Zusage bekommen", "Get an offer"), true)]}
  ],
  bucket: [
    {id: "b1", t: L("Hüttenurlaub in den Bergen", "Mountain cabin holiday"), cat: "travel", who: "fam", status: "planned", when: L("Winter 2027", "Winter 2027")},
    {id: "b2", t: L("Ein Hochbeet zusammen bauen", "Build a raised bed together"), cat: "project", who: "kids", status: "planned", when: L("Frühjahr 2027", "Spring 2027")},
    {id: "b3", t: L("Nordlichter sehen", "See the northern lights"), cat: "travel", who: "AN", status: "idea", when: ""},
    {id: "b4", t: L("Eine Nacht im Zelt", "A night in a tent"), cat: "adventure", who: "fam", status: "idea", when: ""},
    {id: "b5", t: L("Mit Nara Fahrrad zum See", "Bike to the lake with Nara"), cat: "experience", who: "nara", status: "idea", when: ""},
    {id: "b6", t: L("Erster Urlaub am Meer zu viert", "First seaside holiday as four"), cat: "travel", who: "fam", status: "done", when: "", doneAt: "2025-08-10"}
  ],
  memories: [
    {id: "e1", date: "2026-09-24", t: L("Levi sagt zum ersten Mal „Nara“", "Levi says “Nara” for the first time"), text: L("Beim Frühstück, Nara hat vor Freude gequietscht.", "At breakfast, Nara squealed with joy."), who: "levi", link: ""},
    {id: "e2", date: "2026-09-07", t: L("Naras erster Tag in der Vorschulgruppe", "Nara's first day in the preschool group"), text: L("Ganz stolz mit neuem Rucksack.", "Very proud with her new backpack."), who: "nara", link: "https://photos.google.com/"},
    {id: "e3", date: "2026-08-16", t: L("Naras 4. Geburtstag", "Nara's 4th birthday"), text: L("Einhorn-Torte und Picknick im Park mit Oma & Opa.", "Unicorn cake and a picnic in the park with the grandparents."), who: "nara", link: "https://photos.google.com/"},
    {id: "e4", date: "2026-07-14", t: L("Levis erste Schritte", "Levi's first steps"), text: L("Drei Schritte vom Sofa zu Nara.", "Three steps from the sofa to Nara."), who: "levi", link: ""},
    {id: "e5", date: "2025-10-03", t: L("Erster Herbstspaziergang mit Levi in der Trage", "First autumn walk with Levi in the carrier"), text: L("Nara hat Kastanien für alle gesammelt.", "Nara collected chestnuts for everyone."), who: "fam", link: ""},
    {id: "e6", date: "2025-08-10", t: L("Erster Urlaub am Meer zu viert", "First seaside holiday as four"), text: L("Levi war vier Monate alt und hat fast nur geschlafen.", "Levi was four months old and slept most of the time."), who: "fam", link: "https://photos.google.com/"},
    {id: "e7", date: "2025-04-05", t: L("Levi ist da!", "Levi is here!"), text: L("3.400 g, 51 cm.", "3,400 g, 51 cm."), who: "levi", link: ""}
  ]
});
const GOALS_KEY = "fom.goals.v1";
let GOALS = (() => { try { const s = FOMStore.getItem(GOALS_KEY); if (s) return JSON.parse(s); } catch (e) {} return GOALS_EXAMPLES(); })();
const saveGoals = () => { try { FOMStore.setItem(GOALS_KEY, JSON.stringify(GOALS)); } catch (e) {} };
const activeGoals = () => GOALS.goals.filter(g => g.status !== "done");
const goalPct = g => g.steps.length ? Math.round(g.steps.filter(s => s.done).length / g.steps.length * 100) : 0;
const monthYear = d => d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {month: "long", year: "numeric"});

function goalsTabs(active) {
  const tz = TZ[lang];
  return `<nav class="tabs">${[["", tz.goals], ["bucket", tz.bucket], ["memories", tz.memories]].map(([k, l]) =>
    `<a href="#/goals${k ? "/" + k : ""}" class="${k === active ? "on" : ""}">${l}</a>`).join("")}</nav>`;
}
function vGoals(r) {
  if (r[1] === "g") return vGoal(r[2]);
  const d = DOM.goals, top = hero(ic("goals"), d.c, tx(d.name), tx(d.desc)) + goalsTabs(r[1] || "");
  const foot = `<p class="hint">${TA[lang].hint} <button class="linkbtn" data-act="resetGoals">${TA[lang].reset}</button></p>`;
  return top + (r[1] === "bucket" ? vBucket() : r[1] === "memories" ? vMemories() : vGoalList()) + foot;
}
function goalCard(g) {
  const tz = TZ[lang], p = goalPct(g), done = g.steps.filter(s => s.done).length;
  return `<a class="sec gcard ${g.status === "done" ? "isdone" : ""}" href="#/goals/g/${g.id}">
    <span class="tchips">${ownerTag(g.o)}<span class="m">${esc(tx(g.horizon))}</span></span>
    <b>${esc(tx(g.t))}</b><span class="m">${esc(tx(g.why))}</span>${(sv => sv ? `<span class="m">💶 ${sv.target ? TF[lang].ofTarget(eur(sv.current), eur(sv.target)) : eur(sv.current)}</span>` : "")(FIN.savings.find(x => x.goal === g.id))}
    <div class="progress" style="--c:var(--peach)"><div style="width:${g.status === "done" ? 100 : p}%"></div></div>
    <span class="m">${g.status === "done" ? `✓ ${tz.achieved} ${fmt(parse(g.doneAt))} ${parse(g.doneAt).getFullYear()}` : tz.progress(done, g.steps.length)}</span></a>`;
}
function vGoalList() {
  const tz = TZ[lang], act = activeGoals(), done = GOALS.goals.filter(g => g.status === "done");
  return `<div class="toolbar"><h4 class="lh">${tz.active}</h4><button class="btn primary" data-act="addGoal">${tz.addGoal}</button></div>
    <div class="cols">${act.map(goalCard).join("")}</div>
    ${done.length ? `<h4 class="lh" style="margin-top:28px">${tz.achieved}</h4><div class="cols">${done.map(goalCard).join("")}</div>` : ""}`;
}
function vGoal(id) {
  const tz = TZ[lang], g = GOALS.goals.find(x => x.id === id);
  if (!g) return `<p class="empty">–</p>`;
  const p = goalPct(g);
  return `<div class="detail wide" data-goal="${g.id}"><p class="eyebrow">${tz.goals} · ${esc(tx(g.horizon))}</p><h1 class="dtitle ${g.status === "done" ? "isdone" : ""}">${esc(tx(g.t))}</h1>
    <dl class="dl"><dt>${tz.why}</dt><dd>${esc(tx(g.why)) || "–"}</dd><dt>${tz.horizon}</dt><dd>${esc(tx(g.horizon)) || "–"}</dd><dt>${TA[lang].f.o}</dt><dd>${TA[lang].owners[g.o] || "–"}</dd></dl>
    <h4 class="lh">${tz.steps} · ${p} %</h4>
    <div class="progress" style="--c:var(--peach);margin-bottom:12px"><div style="width:${p}%"></div></div>
    <div class="dgroup">${g.steps.map(s => `<div class="drow chore ${s.done ? "isdone" : ""}"><button class="check ${s.done ? "on" : ""}" data-act="toggleStep" data-id="${s.id}" aria-label="✓"></button>
      <span class="dmain"><span class="t">${esc(tx(s.t))}</span></span><button class="x" data-act="delStep" data-id="${s.id}" title="${TA[lang].del}">×</button></div>`).join("")}</div>
    <form class="goodform" id="stepform"><input name="t" placeholder="${tz.addStepPh}" autocomplete="off" required><button class="btn">${tz.add}</button></form>
    <div class="actions">${g.status === "done" ? `<button class="btn" data-act="reopenGoal">${tz.reopen}</button>` : `<button class="btn primary" data-act="achieveGoal">${tz.achieve}</button>`}
      <button class="btn" data-act="editGoal">${TA[lang].edit}</button><button class="btn danger" data-act="delGoal">${TA[lang].del}</button></div></div>`;
}
function vBucket() {
  const tz = TZ[lang], order = ["planned", "idea", "done"];
  return `<div class="toolbar"><button class="btn primary" data-act="addDream">${tz.addDream}</button></div>
    ${order.map(s => { const l = GOALS.bucket.filter(b => b.status === s); if (!l.length) return "";
      return `<h4 class="lh">${tz.bstatus[s]} <span class="cnt neutral">${l.length}</span></h4><div class="cols bucket">${l.map(b => `
        <button class="sec tcard dream ${s === "done" ? "isdone" : ""}" data-act="editDream" data-id="${b.id}">
        <span class="tchips"><span class="chip" style="--k:var(--peach)">${tz.cats[b.cat] || ""}</span><span class="m">${tz.forWho[b.who] || ""}</span></span>
        <b>${esc(tx(b.t))}</b><span class="m">${s === "done" ? "✓ " + tz.lived(monthYear(parse(b.doneAt))) : tx(b.when) ? tz.plannedFor(esc(tx(b.when))) : ""}</span></button>`).join("")}</div>`; }).join("")}`;
}
function vMemories() {
  const tz = TZ[lang], list = GOALS.memories.slice().sort((a, b) => b.date.localeCompare(a.date));
  // "On this day": memories from earlier years within a week of today's date.
  const flash = list.filter(m => { const d = parse(m.date); if (d.getFullYear() >= TODAY.getFullYear()) return false;
    const same = new Date(TODAY.getFullYear(), d.getMonth(), d.getDate()); return Math.abs(dayDiff(same)) <= 7; });
  const groups = {}; list.forEach(m => { const k = m.date.slice(0, 7); (groups[k] = groups[k] || []).push(m); });
  const memRow = m => `<div class="chron-item mem"><button class="docedit" data-act="editMemory" data-id="${m.id}">${dateBlock(parse(m.date))}<span class="dmain">
    <span class="t">${esc(tx(m.t))}</span><span class="m">${tz.forWho[m.who] || ""}</span>${tx(m.text) ? `<span class="peek">${esc(tx(m.text))}</span>` : ""}</span></button>${extLink(m.link, tz.photos.replace(" ↗", ""))}</div>`;
  return `${flash.map(m => { const n = TODAY.getFullYear() - parse(m.date).getFullYear();
      return `<section class="nextcard flash"><div class="nc-date"><b>${n}</b><span>${lang === "de" ? (n === 1 ? "Jahr" : "Jahre") : (n === 1 ? "year" : "years")}</span></div>
      <div class="nc-main"><p class="eyebrow">${n === 1 ? tz.yearAgo : tz.yearsAgo(n)}</p><p class="big">${esc(tx(m.t))}</p><p class="m">${esc(tx(m.text))}</p></div>
      ${safeUrl(m.link) ? `<div class="nc-actions">${extLink(m.link, tz.photos.replace(" ↗", ""))}</div>` : ""}</section>`; }).join("")}
    <div class="toolbar"><button class="btn primary" data-act="addMemory">${tz.addMemory}</button></div>
    ${list.length ? Object.keys(groups).map(k => `<h4 class="lh">${monthYear(parse(k + "-01"))}</h4><div class="chron">${groups[k].map(memRow).join("")}</div>`).join("") : `<p class="empty">${tz.emptyMem}</p>`}`;
}
function bindGoals(v) {
  const tz = TZ[lang], f = tz.f, g = GOALS.goals.find(x => x.id === v.querySelector("[data-goal]")?.dataset.goal);
  const goalForm = () => [{k: "t", label: f.t, req: true}, {k: "why", label: f.why}, {k: "horizon", label: f.horizon}, {k: "o", label: f.o, type: "select", options: TA[lang].owners}];
  const dreamForm = () => [{k: "t", label: f.t, req: true}, {k: "cat", label: f.cat, type: "select", options: tz.cats}, {k: "who", label: f.who, type: "select", options: tz.forWho},
    {k: "status", label: f.status, type: "select", options: tz.bstatus}, {k: "when", label: f.when}];
  const memForm = () => [{k: "date", label: f.date, type: "date", req: true}, {k: "t", label: f.t, req: true}, {k: "text", label: f.text},
    {k: "who", label: f.who, type: "select", options: tz.forWho}, {k: "link", label: f.link, type: "url"}];
  v.querySelectorAll("[data-act]").forEach(b => b.onclick = e => {
    const act = b.dataset.act, id = b.dataset.id;
    if (act !== "resetGoals") e.preventDefault();
    switch (act) {
      case "addGoal": return openForm(tz.newGoal, goalForm(), {horizon: String(TODAY.getFullYear() + 1), o: "AN"}, val => GOALS.goals.push({id: "u" + Date.now(), ...val, steps: []}));
      case "editGoal": return openForm(TA[lang].edit, goalForm(), {...g, t: plain(g.t), why: plain(g.why), horizon: plain(g.horizon)}, val => Object.assign(g, val));
      case "delGoal": GOALS.goals = GOALS.goals.filter(x => x !== g); saveGoals(); return go("#/goals");
      case "achieveGoal": g.status = "done"; g.doneAt = iso(TODAY); saveGoals(); return render();
      case "reopenGoal": g.status = "active"; delete g.doneAt; saveGoals(); return render();
      case "toggleStep": { const s = g.steps.find(x => x.id === id); s.done = !s.done; saveGoals(); return render(); }
      case "delStep": g.steps = g.steps.filter(x => x.id !== id); saveGoals(); return render();
      case "addDream": return openForm(tz.newDream, dreamForm(), {cat: "experience", who: "fam", status: "idea"}, val => GOALS.bucket.push({id: "u" + Date.now(), ...val, doneAt: val.status === "done" ? iso(TODAY) : undefined}));
      case "editDream": { const d = GOALS.bucket.find(x => x.id === id);
        return openForm(TA[lang].edit, dreamForm(), {...d, t: plain(d.t), when: plain(d.when)}, val => {
          // A dream that just came true also lands in the memories.
          if (val.status === "done" && d.status !== "done") { d.doneAt = iso(TODAY); GOALS.memories.push({id: "u" + Date.now(), date: d.doneAt, t: val.t, text: "", who: val.who, link: ""}); }
          Object.assign(d, val); }, () => GOALS.bucket.splice(GOALS.bucket.indexOf(d), 1)); }
      case "addMemory": return openForm(tz.newMemory, memForm(), {date: iso(TODAY), who: "fam"}, val => GOALS.memories.push({id: "u" + Date.now(), ...val}));
      case "editMemory": { const m = GOALS.memories.find(x => x.id === id);
        return openForm(TA[lang].edit, memForm(), {...m, t: plain(m.t), text: plain(m.text)}, val => Object.assign(m, val), () => GOALS.memories.splice(GOALS.memories.indexOf(m), 1)); }
      case "resetGoals": if (confirm(TA[lang].resetQ)) { GOALS = GOALS_EXAMPLES(); saveGoals(); render(); } return;
    }
  });
  const sf = v.querySelector("#stepform");
  if (sf) sf.onsubmit = e => { e.preventDefault(); const t = sf.elements.namedItem("t").value.trim(); if (!t) return;
    g.steps.push(st(t, false)); saveGoals(); render(); v.querySelector("#stepform input")?.focus(); };
}

/* ---------- Woche: the time axis across all areas + Google Calendar ---------- */
const TW = {
  de: {next7: "Die nächsten 7 Tage", whole: "Ganze Woche ›", week: "Woche", logistics: "Bringen & Abholen", today: "Heute", tomorrow: "Morgen",
    allDay: "ganztägig", more: n => `+${n} mehr`, nothing: "Nichts geplant", addEvent: "+ Termin", prev: "‹", next: "›", backToday: "Heute",
    all: "Alle", mine: "Meine", google: "Google", fromGoogle: "Google Kalender", alsoIn: d => `auch in ${d}`,
    kita: "Kita", brings: (n, t) => `bringt ${n} ${t}`, picks: (n, t) => `holt ${n} ${t}`, nobody: "niemand",
    conflict: n => `${n} hat an dem Tag einen ganztägigen Termin – Bringen/Abholen klären`,
    days: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
    f: {t: "Was?", date: "Datum", time: "Uhrzeit (leer = ganztägig)", who: "Für wen?", b: "Wer bringt?", bt: "Bringen um", p: "Wer holt ab?", pt: "Abholen um"},
    newEvent: "Neuer Termin (wird in Google Kalender angelegt – simuliert)", checkin: "Wochen-Check-in",
    gHint: "Termine mit Uhrzeit kommen aus eurem Google Kalender (im Mockup simuliert). Fristen, Aufgaben und Routinen kommen aus den Bereichen.",
    logHint: "Feste Wochenvorlage für die Kita. Ganztägige Google-Termine einer Person werden als Konflikt markiert."},
  en: {next7: "The next 7 days", whole: "Whole week ›", week: "Week", logistics: "Drop-off & pick-up", today: "Today", tomorrow: "Tomorrow",
    allDay: "all day", more: n => `+${n} more`, nothing: "Nothing planned", addEvent: "+ Event", prev: "‹", next: "›", backToday: "Today",
    all: "All", mine: "Mine", google: "Google", fromGoogle: "Google Calendar", alsoIn: d => `also in ${d}`,
    kita: "Daycare", brings: (n, t) => `${n} drops off ${t}`, picks: (n, t) => `${n} picks up ${t}`, nobody: "nobody",
    conflict: n => `${n} has an all-day event that day – sort out drop-off/pick-up`,
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    f: {t: "What?", date: "Date", time: "Time (empty = all day)", who: "For whom?", b: "Who drops off?", bt: "Drop-off at", p: "Who picks up?", pt: "Pick-up at"},
    newEvent: "New event (created in Google Calendar – simulated)", checkin: "Weekly check-in",
    gHint: "Timed events come from your Google Calendar (simulated in the mockup). Deadlines, tasks and routines come from the areas.",
    logHint: "Fixed weekly template for daycare. All-day Google events of a person are flagged as a conflict."}
};
const WEEK_EXAMPLES = () => ({
  gcal: [
    {id: "c1", t: "Kindergeburtstag Paul (Nara eingeladen)", date: "2026-10-04", time: "15:00", who: "nara"},
    {id: "c2", t: "Elternabend Kita", date: "2026-10-06", time: "19:30", who: "N"},
    {id: "c3", t: "Dienstreise Hamburg", date: "2026-10-07", time: "", who: "A"},
    {id: "c4", t: "Kinderzahnarzt Nara", date: "2026-10-08", time: "10:00", who: "nara"},
    {id: "c5", t: "Oma & Opa zu Besuch", date: "2026-10-10", time: "", who: "fam"},
    {id: "c6", t: "Laternenumzug Kita", date: "2026-10-13", time: "17:30", who: "fam"},
    {id: "c7", t: "Natalia Teamevent", date: "2026-10-15", time: "18:00", who: "N"}
  ],
  logistics: {1: {b: "A", bt: "07:45", p: "N", pt: "15:00"}, 2: {b: "A", bt: "07:45", p: "A", pt: "15:00"}, 3: {b: "A", bt: "07:45", p: "N", pt: "15:00"},
    4: {b: "N", bt: "07:45", p: "N", pt: "15:00"}, 5: {b: "N", bt: "07:45", p: "A", pt: "14:00"}}
});
const WEEK_KEY = "fom.week.v1";
let WEEK = (() => { try { const s = FOMStore.getItem(WEEK_KEY); if (s) return JSON.parse(s); } catch (e) {} return WEEK_EXAMPLES(); })();
const saveWeek = () => { try { FOMStore.setItem(WEEK_KEY, JSON.stringify(WEEK)); } catch (e) {} };
let weekOffset = 0, weekFilter = "all";

// A Google event and an app appointment are the same thing if their titles match (case-insensitive).
const norm = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const gcalMatch = title => WEEK.gcal.find(e => [norm(title.de), norm(title.en), norm(title)].includes(norm(e.t)));
const gLink = "https://calendar.google.com/";

function weekItems(start, n) {
  const end = addDays(start, n - 1), inR = d => d >= start && d <= end, out = [];
  const push = (date, x) => out.push({date, time: "", ...x});
  // Health first, so a matching Google event can be merged into it.
  const merged = new Set();
  healthItems().filter(i => i.state === "booked").forEach(i => { const d = new Date(i.booked), day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (!inR(day)) return; if (i.gcal) merged.add(i.gcal);
    push(day, {time: i.booked.slice(11, 16), t: i.t, dom: "health", o: i.o, href: "#/health", gcal: !!i.gcal}); });
  WEEK.gcal.forEach(e => { const d = parse(e.date); if (!inR(d) || merged.has(e.id)) return;
    push(d, {time: e.time, t: e.t, dom: "gcal", who: e.who, o: e.who === "A" || e.who === "N" ? e.who : "", href: gLink, gcal: true}); });
  openRadar().filter(i => inR(i.due)).forEach(i => push(i.due, {t: i.t, dom: "admin", o: i.o, href: `#/admin/d/${i.id}`}));
  KD.topics.filter(x => x.s === "active" && x.day !== "" && x.day != null).forEach(x => { for (let k = 0; k < n; k++) { const d = addDays(start, k);
    if (d.getDay() === +x.day) push(d, {time: x.time || "", t: L(`${x.t.de || x.t} ${KIDS[x.kid].name}`, `${x.t.en || x.t} ${KIDS[x.kid].name}`), dom: "kids", o: x.o, href: `#/kids/${x.kid}`}); } });
  openChores().filter(c => c.freq !== "daily").forEach(c => { let d = parse(c.next), who = whoNow(c);
    while (d <= end) { if (d >= start) push(d, {t: c.t, dom: "home", o: who, href: "#/home"}); if (c.freq === "once") break;
      d = step(d, c.freq); if (c.o === "R") who = who === "A" ? "N" : "A"; } });
  for (let k = 0; k < n; k++) { const d = addDays(start, k), wd = d.getDay();
    if (wd === TEAM.checkin.day) push(d, {time: TEAM.checkin.time, t: L(TW.de.checkin, TW.en.checkin), dom: "team", o: "AN", href: "#/team"});
    TEAM.rituals.filter(r => r.day !== undefined && r.day !== "" && +r.day === wd).forEach(r => push(d, {time: r.time || "", t: r.t, dom: "team", o: r.o, href: "#/team/rituals"})); }
  return out.sort((a, b) => a.date - b.date || (a.time || "00:00").localeCompare(b.time || "00:00"));
}
function logisticsFor(d) {
  const l = WEEK.logistics[d.getDay()]; if (!l) return null;
  const busy = WEEK.gcal.filter(e => e.date === iso(d) && !e.time && (e.who === "A" || e.who === "N")).map(e => e.who);
  return {...l, conflict: [...new Set([l.b, l.p].filter(p => busy.includes(p)))]};
}
const domIc = it => it.dom === "gcal" ? `<span class="wic g">${ic("week")}</span>` : `<span class="wic" style="--c:${DOM[it.dom].c}">${ic(it.dom)}</span>`;
const dayLabel = d => { const tw = TW[lang], n = dayDiff(d); return n === 0 ? tw.today : n === 1 ? tw.tomorrow : tw.days[d.getDay()]; };

// Center: compact strip below the orbit.
function weekStrip() {
  const tw = TW[lang], items = weekItems(TODAY, 7);
  return `<section class="weekstrip"><div class="ws-head"><h3>${tw.next7}</h3><a href="#/week">${tw.whole}</a></div><div class="ws-days">${
    Array.from({length: 7}, (_, k) => { const d = addDays(TODAY, k), list = items.filter(i => +i.date === +d), lg = logisticsFor(d);
      return `<a class="ws-day ${k === 0 ? "today" : ""}" href="#/week"><span class="ws-date"><b>${d.getDate()}</b>${tw.days[d.getDay()].slice(0, 2)}</span>
        ${lg ? `<span class="ws-item ${lg.conflict.length ? "warn" : ""}"><span class="wic car">${CAR_SVG}</span>${lg.b}→ ←${lg.p}</span>` : ""}
        ${list.slice(0, 3).map(i => `<span class="ws-item">${domIc(i)}<span class="ws-t">${esc(tx(i.t))}</span></span>`).join("")}
        ${list.length > 3 ? `<span class="ws-more">${tw.more(list.length - 3)}</span>` : ""}${!list.length && !lg ? `<span class="ws-more">–</span>` : ""}</a>`; }).join("")}</div></section>`;
}
const CAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M5 17a2 2 0 1 1-4 0v-4l2.2-5.2A2 2 0 0 1 5 6.5h14a2 2 0 0 1 1.8 1.3L23 13v4a2 2 0 1 1-4 0"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>';

function weekTabs(active) {
  const tw = TW[lang];
  return `<nav class="tabs">${[["", tw.week], ["logistics", tw.logistics]].map(([k, l]) => `<a href="#/week${k ? "/" + k : ""}" class="${k === active ? "on" : ""}">${l}</a>`).join("")}</nav>`;
}
function vWeek(r) {
  const d = DOM.week, top = hero(ic("week"), d.c, tx(d.name), tx(d.desc)) + weekTabs(r[1] || "");
  const foot = `<p class="hint">${TW[lang].gHint} <button class="linkbtn" data-act="resetWeek">${TA[lang].reset}</button></p>`;
  return top + (r[1] === "logistics" ? vLogistics() : vWeekList()) + foot;
}
function vWeekList() {
  const tw = TW[lang], start = addDays(TODAY, weekOffset * 7), all = weekItems(start, 7), meC = me();
  const keep = i => weekFilter === "all" || (weekFilter === "google" ? i.gcal : (i.o === meC || i.o === "AN"));
  const end = addDays(start, 6);
  return `<div class="toolbar wk-tools"><div class="seg mini">${[["prev", tw.prev], ["today", tw.backToday], ["next", tw.next]].map(([k, l]) => `<button data-act="wk-${k}" class="${k === "today" && !weekOffset ? "on" : ""}">${l}</button>`).join("")}</div>
      <span class="wk-range">${fmt(start)} – ${fmt(end)}</span>
      <div class="seg mini">${[["all", tw.all], ["mine", tw.mine], ["google", tw.google]].map(([k, l]) => `<button data-act="wk-filter" data-id="${k}" class="${weekFilter === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <button class="btn primary" data-act="addEvent">${tw.addEvent}</button></div>
    ${Array.from({length: 7}, (_, k) => { const d = addDays(start, k), list = all.filter(i => +i.date === +d && keep(i)), lg = logisticsFor(d);
      return `<section class="dgroup wkday ${dayDiff(d) === 0 ? "isToday" : ""}"><h4>${dayLabel(d)} · ${fmt(d)}</h4>
        ${lg && weekFilter !== "google" ? `<a class="drow wk logi ${lg.conflict.length ? "late" : ""}" href="#/week/logistics"><span class="wtime">${tw.kita}</span><span class="wic car">${CAR_SVG}</span>
          <span class="dmain"><span class="t">${tw.brings(PEOPLE[lg.b]?.name || tw.nobody, lg.bt)} · ${tw.picks(PEOPLE[lg.p]?.name || tw.nobody, lg.pt)}</span>
          ${lg.conflict.length ? `<span class="m warnnote">⚠ ${lg.conflict.map(p => tw.conflict(PEOPLE[p].name)).join(" · ")}</span>` : ""}</span></a>` : ""}
        ${list.map(i => `<a class="drow wk" href="${i.href}" ${i.href.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>
          <span class="wtime">${i.time || (i.dom === "gcal" ? tw.allDay : "")}</span>${domIc(i)}<span class="dmain"><span class="t">${esc(tx(i.t))}</span>
          <span class="m">${i.dom === "gcal" ? tw.fromGoogle : tx(DOM[i.dom].short)}${i.gcal && i.dom !== "gcal" ? ` · ${tw.alsoIn(tw.fromGoogle)}` : ""}</span></span>
          <span class="dside">${i.gcal ? `<span class="gbadge">G</span>` : ""}${ownerTag(i.o)}</span></a>`).join("")}
        ${!list.length && !lg ? `<p class="empty">${tw.nothing}</p>` : ""}</section>`; }).join("")}`;
}
function vLogistics() {
  const tw = TW[lang];
  return `<p class="muted small">${tw.logHint}</p><div class="dgroup">${[1, 2, 3, 4, 5].map(wd => { const l = WEEK.logistics[wd] || {};
    return `<div class="drow"><button class="docedit" data-act="editLogi" data-id="${wd}"><span class="wtime">${tw.days[wd].slice(0, 2)}</span><span class="wic car">${CAR_SVG}</span>
      <span class="dmain"><span class="t">${tw.days[wd]}</span><span class="m">${tw.brings(PEOPLE[l.b]?.name || tw.nobody, l.bt || "")} · ${tw.picks(PEOPLE[l.p]?.name || tw.nobody, l.pt || "")}</span></span>
      <span class="dside">${ownerTag(l.b)}${ownerTag(l.p)}</span></button></div>`; }).join("")}</div>`;
}
function bindWeek(v) {
  const tw = TW[lang], f = tw.f, people = {A: "André", N: "Natalia", "": tw.nobody};
  v.querySelectorAll("[data-act]").forEach(b => b.onclick = e => {
    const act = b.dataset.act, id = b.dataset.id;
    if (act !== "resetWeek") e.preventDefault();
    switch (act) {
      case "wk-prev": weekOffset--; return render();
      case "wk-next": weekOffset++; return render();
      case "wk-today": weekOffset = 0; return render();
      case "wk-filter": weekFilter = id; return render();
      case "addEvent": return openForm(tw.newEvent, [{k: "t", label: f.t, req: true}, {k: "date", label: f.date, type: "date", req: true}, {k: "time", label: f.time, type: "time"},
        {k: "who", label: f.who, type: "select", options: {fam: TZ[lang].forWho.fam, A: "André", N: "Natalia", nara: "Nara", levi: "Levi"}}],
        {date: iso(addDays(TODAY, weekOffset * 7)), who: "fam"}, val => WEEK.gcal.push({id: "u" + Date.now(), ...val}));
      case "editLogi": { const l = WEEK.logistics[id] = WEEK.logistics[id] || {};
        return openForm(tw.days[id], [{k: "b", label: f.b, type: "select", options: people}, {k: "bt", label: f.bt, type: "time"},
          {k: "p", label: f.p, type: "select", options: people}, {k: "pt", label: f.pt, type: "time"}], l, val => Object.assign(l, val)); }
      case "resetWeek": if (confirm(TA[lang].resetQ)) { WEEK = WEEK_EXAMPLES(); saveWeek(); render(); } return;
    }
  });
}

/* ---------- Finanzen: overview, not bookkeeping ---------- */
const TF = {
  de: {overview: "Überblick", fixed: "Fixkosten", saving: "Sparen", potential: "Potenziale", perMonth: "/ Monat",
    income: "Einnahmen", fixedC: "Fixkosten", savingC: "Sparen", daily: "Alltagsbudget", rest: "Bleibt persönlich",
    picture: "Euer Monat", joint: "Gemeinsames Konto", needs: "braucht im Monat", kgDirect: "Kindergeld fließt direkt drauf",
    pays: (n, a) => `${n} überweist ${a}`, keeps: (n, a) => `bleiben ${n}: ${a}`, splitBy: {income: "nach Einkommen", equal: "50 / 50"},
    split: "Aufteilung", editIncome: "Einnahmen bearbeiten", settings: "Einstellungen",
    check: "Monats-Check", checkDue: "Monats-Check fällig", checkDone: d => `Zuletzt am ${d}`, startCheck: "Monats-Check machen", checkLog: "Verlauf",
    balance: "Kontostand gemeinsames Konto", checkQ: "Kurz durchgehen: Kontostand, Auffälligkeiten, Sparziele, Potenziale.",
    acct: {joint: "Gemeinsam", A: "André", N: "Natalia"}, fromContract: "aus Verträgen", fromKids: "aus Kinder-Themen", addFixed: "+ Fixkosten", addSaving: "+ Sparziel", addPotential: "+ Potenzial",
    cats: {home: "Wohnen", kids: "Kinder", mobility: "Mobilität", insurance: "Versicherung", energy: "Energie", phone: "Handy & Internet", sub: "Abos", other: "Sonstiges"},
    rate: r => `${r} im Monat`, reachIn: n => n <= 0 ? "erreicht 🎉" : `erreicht in ca. ${n} ${n === 1 ? "Monat" : "Monaten"}`, linkedGoal: "Ziel",
    pcats: {refund: "Erstattung", grant: "Zuschuss", sale: "Verkauf", service: "Nebenjob", tax: "Steuer", insurance: "Versicherung", rental: "Vermietung", saving: "Einsparung", other: "Sonstiges"},
    pstatus: {open: "Offen", progress: "In Arbeit", done: "Realisiert", obsolete: "Hinfällig"}, prio: {high: "Hoch", medium: "Mittel", low: "Niedrig"},
    openPot: "Offenes Potenzial", realized: "Realisiert", est: "geschätzt", act: "tatsächlich",
    f: {t: "Was?", amount: "Betrag pro Monat (€)", cycle: "Zahlweise", acct: "Von welchem Konto?", cat: "Kategorie", who: "Wer?", current: "Schon gespart (€)", target: "Ziel (€, leer = offen)",
      rate: "Sparrate pro Monat (€)", goal: "Verknüpftes Ziel", est: "Geschätzt (€)", actual: "Tatsächlich (€)", status: "Status", prio: "Priorität", o: "Wer kümmert sich?",
      note: "Notiz", date: "Datum", balance: "Kontostand (€)", splitMode: "Aufteilung aufs gemeinsame Konto", dailyBudget: "Alltagsbudget pro Monat (€)"},
    cycles: {1: "Monatlich", 3: "Vierteljährlich", 12: "Jährlich"}, noGoal: "–", none: "–",
    sensitive: "Finanzdaten sind sensibel. Im Mockup bleiben sie nur in diesem Browser; alle Beträge sind Beispiele.",
    newFixed: "Neue Fixkosten", newSaving: "Neues Sparziel", newPot: "Neues Potenzial", contractEdit: "Wird im Papierkram gepflegt", ofTarget: (a, b) => `${a} von ${b}`},
  en: {overview: "Overview", fixed: "Fixed costs", saving: "Savings", potential: "Potentials", perMonth: "/ month",
    income: "Income", fixedC: "Fixed costs", savingC: "Savings", daily: "Everyday budget", rest: "Stays personal",
    picture: "Your month", joint: "Joint account", needs: "needs per month", kgDirect: "Child benefit goes straight in",
    pays: (n, a) => `${n} transfers ${a}`, keeps: (n, a) => `${n} keeps ${a}`, splitBy: {income: "by income", equal: "50 / 50"},
    split: "Split", editIncome: "Edit income", settings: "Settings",
    check: "Monthly check", checkDue: "Monthly check due", checkDone: d => `Last done ${d}`, startCheck: "Do the monthly check", checkLog: "History",
    balance: "Joint account balance", checkQ: "Quick run-through: balance, anything unusual, savings goals, potentials.",
    acct: {joint: "Joint", A: "André", N: "Natalia"}, fromContract: "from contracts", fromKids: "from kids' topics", addFixed: "+ Fixed cost", addSaving: "+ Savings goal", addPotential: "+ Potential",
    cats: {home: "Housing", kids: "Kids", mobility: "Mobility", insurance: "Insurance", energy: "Energy", phone: "Phone & internet", sub: "Subscriptions", other: "Other"},
    rate: r => `${r} a month`, reachIn: n => n <= 0 ? "reached 🎉" : `reached in about ${n} ${n === 1 ? "month" : "months"}`, linkedGoal: "Goal",
    pcats: {refund: "Refund", grant: "Grant", sale: "Sale", service: "Side job", tax: "Tax", insurance: "Insurance", rental: "Rental", saving: "Saving", other: "Other"},
    pstatus: {open: "Open", progress: "In progress", done: "Realized", obsolete: "Obsolete"}, prio: {high: "High", medium: "Medium", low: "Low"},
    openPot: "Open potential", realized: "Realized", est: "estimated", act: "actual",
    f: {t: "What?", amount: "Amount per month (€)", cycle: "Billing", acct: "From which account?", cat: "Category", who: "Who?", current: "Saved so far (€)", target: "Target (€, empty = open)",
      rate: "Monthly saving (€)", goal: "Linked goal", est: "Estimated (€)", actual: "Actual (€)", status: "Status", prio: "Priority", o: "Who's on it?",
      note: "Note", date: "Date", balance: "Balance (€)", splitMode: "How to split the joint account", dailyBudget: "Everyday budget per month (€)"},
    cycles: {1: "Monthly", 3: "Quarterly", 12: "Yearly"}, noGoal: "–", none: "–",
    sensitive: "Financial data is sensitive. In the mockup it stays in this browser only; all amounts are examples.",
    newFixed: "New fixed cost", newSaving: "New savings goal", newPot: "New potential", contractEdit: "Managed in Paperwork", ofTarget: (a, b) => `${a} of ${b}`}
};
const FIN_EXAMPLES = () => ({
  settings: {split: "income", daily: 1100},
  incomes: [{id: "i1", t: L("Gehalt André (netto)", "Salary André (net)"), who: "A", amount: 3400}, {id: "i2", t: L("Gehalt Natalia (netto, Teilzeit)", "Salary Natalia (net, part-time)"), who: "N", amount: 2300},
    {id: "i3", t: L("Kindergeld Nara & Levi", "Child benefit Nara & Levi"), who: "joint", amount: 518}],
  fixed: [
    {id: "f1", t: L("Warmmiete", "Rent incl. utilities"), cat: "home", amount: 1450, cycle: 1, acct: "joint"},
    {id: "f2", t: L("Kita-Beitrag", "Daycare fee"), cat: "kids", amount: 180, cycle: 1, acct: "joint"},
    {id: "f4", t: L("Internet", "Internet"), cat: "phone", amount: 40, cycle: 1, acct: "joint"},
    {id: "f5", t: L("Rundfunkbeitrag", "Broadcast fee"), cat: "other", amount: 55.08, cycle: 3, acct: "joint"},
    {id: "f6", t: L("Kfz-Steuer", "Car tax"), cat: "mobility", amount: 120, cycle: 12, acct: "joint"}
  ],
  contractAcct: {c2: "N", c4: "A"},
  savings: [
    {id: "v1", t: L("Notgroschen", "Emergency fund"), current: 8000, target: 10000, rate: 300, goal: "z3"},
    {id: "v2", t: L("Sommerurlaub 2027", "Summer holiday 2027"), current: 1400, target: 3000, rate: 200, goal: "z2"},
    {id: "v3", t: L("Kinderdepot Nara", "Kids' fund Nara"), current: 1150, target: "", rate: 25, goal: ""},
    {id: "v4", t: L("Kinderdepot Levi", "Kids' fund Levi"), current: 450, target: "", rate: 25, goal: ""}
  ],
  potentials: [
    {id: "p1", t: L("Steuererstattung 2025", "Tax refund 2025"), cat: "tax", est: 900, actual: "", status: "progress", prio: "high", o: "A", note: L("Unterlagen beim Steuerberater", "Documents with tax advisor")},
    {id: "p2", t: L("Fahrradanhänger verkaufen", "Sell the bike trailer"), cat: "sale", est: 250, actual: "", status: "open", prio: "medium", o: "A", note: L("→ Haushalt-To-do", "→ Home to-do")},
    {id: "p3", t: L("Zahnzusatz: Erstattung Prophylaxe", "Dental plan: cleaning refund"), cat: "insurance", est: 90, actual: "", status: "open", prio: "low", o: "N", note: ""},
    {id: "p4", t: L("Streaming-Abo kündigen", "Cancel streaming subscription"), cat: "saving", est: 168, actual: "", status: "open", prio: "low", o: "N", note: L("14 € × 12", "€14 × 12")},
    {id: "p5", t: L("Kinderwagen verkauft", "Sold the pram"), cat: "sale", est: 300, actual: 340, status: "done", prio: "medium", o: "N", note: ""}
  ],
  checks: [{id: "k1", date: "2026-08-02", balance: 4200, note: L("Urlaub bezahlt, alles im Rahmen", "Holiday paid, all within budget")},
    {id: "k2", date: "2026-09-01", balance: 4650, note: L("Kita-Nachzahlung eingeplant", "Daycare back payment planned")}]
});
const FIN_KEY = "fom.fin.v1";
let FIN = (() => { try { const s = FOMStore.getItem(FIN_KEY); if (s) return JSON.parse(s); } catch (e) {} return FIN_EXAMPLES(); })();
const saveFin = () => { try { FOMStore.setItem(FIN_KEY, JSON.stringify(FIN)); } catch (e) {} };
FIN.savings = []; FIN.potentials = [];  // Finanzen laufen jetzt über die Familienkasse
const eur = n => (+n || 0).toLocaleString(lang === "de" ? "de-DE" : "en-GB", {style: "currency", currency: "EUR", maximumFractionDigits: 0});
const monthly = x => (+x.amount || 0) / (+x.cycle || 1);

// Fixed costs = own entries + contracts from Paperwork (their account can be set here).
function fixedItems() {
  const c = ADMIN.contracts.map(k => ({id: `c-${k.id}`, src: "contract", ref: k, t: k.name, cat: k.cat === "energy" || k.cat === "phone" || k.cat === "insurance" ? k.cat : "sub",
    amount: +k.cost || 0, cycle: 1, acct: FIN.contractAcct[k.id] || "joint"}));
  const kidsCosts = KD.topics.filter(x => (x.s === "active" || x.s === "planned") && +x.cost).map(x => ({id: `k-${x.id}`, src: "kids", ref: x,
    t: L(`${x.t.de || x.t} (${KIDS[x.kid].name})`, `${x.t.en || x.t} (${KIDS[x.kid].name})`), cat: "kids", amount: +x.cost, cycle: 1, acct: "joint"}));
  return [...FIN.fixed.map(x => ({...x, src: "own"})), ...c, ...kidsCosts];
}
function finSummary() {
  const inc = a => FIN.incomes.filter(i => i.who === a).reduce((s, i) => s + (+i.amount || 0), 0);
  const fixed = fixedItems(), fx = a => fixed.filter(x => x.acct === a).reduce((s, x) => s + monthly(x), 0);
  const sav = FIN.savings.reduce((s, v) => s + (+v.rate || 0), 0), daily = +FIN.settings.daily || 0;
  const incA = inc("A"), incN = inc("N"), kg = inc("joint"), total = incA + incN + kg;
  const jointNeed = fx("joint") + sav + daily, fromParents = Math.max(0, jointNeed - kg);
  const shareA = FIN.settings.split === "equal" ? 0.5 : (incA + incN ? incA / (incA + incN) : 0.5);
  const payA = fromParents * shareA, payN = fromParents - payA;
  const fixedAll = fixed.reduce((s, x) => s + monthly(x), 0);
  return {total, incA, incN, kg, fixedAll, fixedJoint: fx("joint"), sav, daily, jointNeed, payA, payN, shareA,
    keepA: incA - payA - fx("A"), keepN: incN - payN - fx("N"), rest: total - fixedAll - sav - daily};
}
const lastCheck = () => FIN.checks.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
const checkDue = () => { const l = lastCheck(); return !l || parse(l.date) < new Date(TODAY.getFullYear(), TODAY.getMonth(), 1); };

function finTabs(active) {
  const tf = TF[lang];
  return `<nav class="tabs">${[["", tf.overview], ["fixed", tf.fixed], ["saving", tf.saving], ["potential", tf.potential]].map(([k, l]) =>
    `<a href="#/money${k ? "/" + k : ""}" class="${k === active ? "on" : ""}">${l}</a>`).join("")}</nav>`;
}
function vMoney(r) {
  const d = DOM.money, top = hero(ic("money"), d.c, tx(d.name), tx(d.desc)) + finTabs(r[1] || "");
  const foot = `<p class="hint">${TF[lang].sensitive} <button class="linkbtn" data-act="resetFin">${TA[lang].reset}</button></p>`;
  return top + (r[1] === "fixed" ? vFixed() : r[1] === "saving" ? vSaving() : r[1] === "potential" ? vPotential() : vFinOverview()) + foot;
}
function vFinOverview() {
  const tf = TF[lang], s = finSummary(), l = lastCheck(), pct = x => s.total ? Math.max(0, x / s.total * 100) : 0;
  const seg = [[tf.fixedC, s.fixedAll, "var(--plum)"], [tf.savingC, s.sav, "var(--teal)"], [tf.daily, s.daily, "var(--mustard)"], [tf.rest, Math.max(0, s.rest), "var(--sage)"]];
  return `${checkDue() ? `<section class="nextcard checkdue"><div class="nc-main"><p class="eyebrow">${tf.checkDue}</p><p class="big">${tf.check} · ${monthYear(TODAY)}</p>
      <p class="m">${tf.checkQ}${l ? " " + tf.checkDone(fmt(parse(l.date))) : ""}</p></div>
      <div class="nc-actions"><button class="btn primary" data-act="doCheck">${tf.startCheck}</button></div></section>` : ""}
    <section class="sec fin-pic"><div class="fhead"><b>${tf.picture}</b><span class="m">${tf.income} ${eur(s.total)} ${tf.perMonth}</span>
      <button class="linkbtn" style="margin-left:auto" data-act="editIncome">${tf.editIncome}</button></div>
      <div class="stackbar">${seg.map(([, v, c]) => `<div style="width:${pct(v)}%;background:${c}"></div>`).join("")}</div>
      <div class="fin-legend">${seg.map(([n, v, c]) => `<div><i class="dot" style="background:${c}"></i><span>${n}</span><b>${eur(v)}</b></div>`).join("")}</div></section>
    <section class="sec fin-joint"><div class="fhead"><b>${tf.joint}</b><span class="m">${tf.needs} ${eur(s.jointNeed)} · ${tf.split} ${tf.splitBy[FIN.settings.split]}</span>
      <button class="linkbtn" style="margin-left:auto" data-act="finSettings">${tf.settings}</button></div>
      <div class="jrows">
        <div class="jrow"><span class="wic" style="--c:var(--teal)">${ic("money")}</span><span>${tf.kgDirect}</span><b>${eur(s.kg)}</b></div>
        <div class="jrow">${ownerTag("A")}<span>${tf.pays("André", "")}<span class="m"> · ${Math.round(s.shareA * 100)} %</span></span><b>${eur(s.payA)}</b></div>
        <div class="jrow">${ownerTag("N")}<span>${tf.pays("Natalia", "")}<span class="m"> · ${100 - Math.round(s.shareA * 100)} %</span></span><b>${eur(s.payN)}</b></div>
      </div>
      <div class="keep"><span>${tf.keeps("André", `<b>${eur(s.keepA)}</b>`)}</span><span>${tf.keeps("Natalia", `<b>${eur(s.keepN)}</b>`)}</span></div></section>
    <h4 class="lh">${tf.check} · ${tf.checkLog}</h4>
    <div class="dgroup">${FIN.checks.slice().sort((a, b) => b.date.localeCompare(a.date)).map(c => `<div class="drow"><button class="docedit" data-act="editCheck" data-id="${c.id}">${dateBlock(parse(c.date))}
      <span class="dmain"><span class="t">${tf.balance}: ${eur(c.balance)}</span><span class="m">${esc(tx(c.note))}</span></span></button></div>`).join("")}</div>`;
}
function vFixed() {
  const tf = TF[lang], items = fixedItems(), byAcct = a => items.filter(x => x.acct === a).reduce((s, x) => s + monthly(x), 0);
  const cats = Object.keys(tf.cats).filter(c => items.some(x => x.cat === c));
  return `<section class="nextcard homecard"><div class="nc-main"><p class="eyebrow">${tf.fixed} ${tf.perMonth}</p>
      <p class="big">${eur(items.reduce((s, x) => s + monthly(x), 0))}</p>
      <p class="m">${Object.entries(tf.acct).map(([a, n]) => `${n} ${eur(byAcct(a))}`).join(" · ")}</p></div>
      <div class="nc-actions"><button class="btn primary" data-act="addFixed">${tf.addFixed}</button></div></section>
    ${cats.map(c => { const l = items.filter(x => x.cat === c);
      return `<section class="dgroup"><h4>${tf.cats[c]} <span>${eur(l.reduce((s, x) => s + monthly(x), 0))}</span></h4>${l.map(x => `
        <div class="drow"><button class="docedit" data-act="editFixed" data-id="${x.id}"><span class="dmain"><span class="t">${esc(tx(x.t))}</span>
        <span class="m">${tf.acct[x.acct]}${+x.cycle !== 1 ? ` · ${tf.cycles[x.cycle]} ${eur(x.amount)}` : ""}${x.src === "contract" ? ` · ${tf.fromContract}` : x.src === "kids" ? ` · ${tf.fromKids}` : ""}</span></span>
        <span class="dside"><b class="amt">${eur(monthly(x))}</b></span></button></div>`).join("")}</section>`; }).join("")}`;
}
function vSaving() {
  const tf = TF[lang];
  return `<div class="toolbar"><span class="sum">${tf.rate(eur(FIN.savings.reduce((s, v) => s + (+v.rate || 0), 0)))}</span><button class="btn primary" data-act="addSaving">${tf.addSaving}</button></div>
    <div class="cols">${FIN.savings.map(v => { const p = v.target ? Math.min(100, Math.round(v.current / v.target * 100)) : null;
      const months = v.target && +v.rate ? Math.ceil((v.target - v.current) / v.rate) : null, g = GOALS.goals.find(x => x.id === v.goal);
      return `<button class="sec tcard" data-act="editSaving" data-id="${v.id}"><span class="tchips">${g ? `<span class="chip" style="--k:var(--peach)">${tf.linkedGoal}: ${esc(tx(g.t))}</span>` : ""}</span>
        <b>${esc(tx(v.t))}</b><span class="big2">${v.target ? tf.ofTarget(eur(v.current), eur(v.target)) : eur(v.current)}</span>
        ${p !== null ? `<div class="progress" style="--c:var(--teal);width:100%"><div style="width:${p}%"></div></div>` : ""}
        <span class="m">${tf.rate(eur(v.rate))}${months !== null ? " · " + tf.reachIn(months) : ""}</span></button>`; }).join("")}</div>`;
}
function vPotential() {
  const tf = TF[lang], P = FIN.potentials, open = P.filter(p => p.status === "open" || p.status === "progress"), done = P.filter(p => p.status === "done");
  const row = p => `<div class="drow"><button class="docedit" data-act="editPotential" data-id="${p.id}"><span class="dmain"><span class="t">${esc(tx(p.t))}</span>
    <span class="m">${tf.pcats[p.cat]} · ${tf.pstatus[p.status]}${p.prio === "high" ? ` · <span class="warnnote">${tf.prio.high}</span>` : ""}${tx(p.note) ? " · " + esc(tx(p.note)) : ""}</span></span>
    <span class="dside">${ownerTag(p.o)}<b class="amt">${p.actual !== "" && p.actual != null ? eur(p.actual) : `<span class="muted">~${eur(p.est)}</span>`}</b></span></button></div>`;
  return `<section class="nextcard homecard"><div class="nc-main"><p class="eyebrow">${tf.openPot}</p><p class="big">${eur(open.reduce((s, p) => s + (+p.est || 0), 0))}</p>
      <p class="m">${tf.realized} ${eur(done.reduce((s, p) => s + (+p.actual || +p.est || 0), 0))}</p></div>
      <div class="nc-actions"><button class="btn primary" data-act="addPotential">${tf.addPotential}</button></div></section>
    ${["progress", "open", "done", "obsolete"].map(st2 => { const l = P.filter(p => p.status === st2); return l.length ? `<section class="dgroup"><h4>${tf.pstatus[st2]} <span>${l.length}</span></h4>${l.map(row).join("")}</section>` : ""; }).join("")}`;
}
function bindMoney(v) {
  const tf = TF[lang], f = tf.f, num = x => x === "" || x == null ? "" : +x;
  const goals = {"": tf.noGoal, ...Object.fromEntries(GOALS.goals.map(g => [g.id, tx(g.t)]))};
  const fixedForm = () => [{k: "t", label: f.t, req: true}, {k: "cat", label: f.cat, type: "select", options: tf.cats}, {k: "amount", label: f.amount.replace(" pro Monat", "").replace(" per month", ""), type: "number"},
    {k: "cycle", label: f.cycle, type: "select", options: tf.cycles}, {k: "acct", label: f.acct, type: "select", options: tf.acct}];
  const savForm = () => [{k: "t", label: f.t, req: true}, {k: "current", label: f.current, type: "number"}, {k: "target", label: f.target, type: "number"}, {k: "rate", label: f.rate, type: "number"}, {k: "goal", label: f.goal, type: "select", options: goals}];
  const potForm = () => [{k: "t", label: f.t, req: true}, {k: "cat", label: f.cat, type: "select", options: tf.pcats}, {k: "est", label: f.est, type: "number"}, {k: "actual", label: f.actual, type: "number"},
    {k: "status", label: f.status, type: "select", options: tf.pstatus}, {k: "prio", label: f.prio, type: "select", options: tf.prio}, {k: "o", label: f.o, type: "select", options: TA[lang].owners}, {k: "note", label: f.note}];
  const checkForm = () => [{k: "date", label: f.date, type: "date", req: true}, {k: "balance", label: f.balance, type: "number"}, {k: "note", label: f.note}];
  const strip = x => ({...x, t: plain(x.t), note: plain(x.note)});
  v.querySelectorAll("[data-act]").forEach(b => b.onclick = e => {
    const act = b.dataset.act, id = b.dataset.id;
    if (act !== "resetFin") e.preventDefault();
    switch (act) {
      case "doCheck": return openForm(tf.check, checkForm(), {date: iso(TODAY), balance: lastCheck()?.balance ?? ""}, val => FIN.checks.push({id: "u" + Date.now(), ...val, balance: num(val.balance)}));
      case "editCheck": { const c = FIN.checks.find(x => x.id === id);
        return openForm(tf.check, checkForm(), strip(c), val => Object.assign(c, val, {balance: num(val.balance)}), () => FIN.checks.splice(FIN.checks.indexOf(c), 1)); }
      case "editIncome": { const fields = FIN.incomes.map(i => ({k: i.id, label: tx(i.t), type: "number"}));
        return openForm(tf.editIncome, fields, Object.fromEntries(FIN.incomes.map(i => [i.id, i.amount])), val => FIN.incomes.forEach(i => { i.amount = num(val[i.id]); })); }
      case "finSettings": return openForm(tf.settings, [{k: "split", label: f.splitMode, type: "select", options: tf.splitBy}, {k: "daily", label: f.dailyBudget, type: "number"}],
        FIN.settings, val => Object.assign(FIN.settings, {split: val.split, daily: num(val.daily)}));
      case "addFixed": return openForm(tf.newFixed, fixedForm(), {cat: "other", cycle: 1, acct: "joint"}, val => FIN.fixed.push({id: "u" + Date.now(), ...val, amount: num(val.amount), cycle: +val.cycle}));
      case "editFixed": { const x = fixedItems().find(y => y.id === id);
        if (x.src === "kids") return go(`#/kids/${x.ref.kid}/topics`);
        if (x.src === "contract") return openForm(`${tx(x.t)} – ${tf.contractEdit}`, [{k: "acct", label: f.acct, type: "select", options: tf.acct}], {acct: x.acct}, val => { FIN.contractAcct[x.ref.id] = val.acct; });
        const own = FIN.fixed.find(y => y.id === id);
        return openForm(TA[lang].edit, fixedForm(), strip(own), val => Object.assign(own, val, {amount: num(val.amount), cycle: +val.cycle}), () => FIN.fixed.splice(FIN.fixed.indexOf(own), 1)); }
      case "addSaving": return openForm(tf.newSaving, savForm(), {current: 0, rate: 50, goal: ""}, val => FIN.savings.push({id: "u" + Date.now(), ...val, current: num(val.current), target: num(val.target), rate: num(val.rate)}));
      case "editSaving": { const s2 = FIN.savings.find(y => y.id === id);
        return openForm(TA[lang].edit, savForm(), strip(s2), val => Object.assign(s2, val, {current: num(val.current), target: num(val.target), rate: num(val.rate)}), () => FIN.savings.splice(FIN.savings.indexOf(s2), 1)); }
      case "addPotential": return openForm(tf.newPot, potForm(), {cat: "refund", status: "open", prio: "medium", o: me()}, val => FIN.potentials.push({id: "u" + Date.now(), ...val, est: num(val.est), actual: num(val.actual)}));
      case "editPotential": { const p = FIN.potentials.find(y => y.id === id);
        return openForm(TA[lang].edit, potForm(), strip(p), val => Object.assign(p, val, {est: num(val.est), actual: num(val.actual)}), () => FIN.potentials.splice(FIN.potentials.indexOf(p), 1)); }
      case "resetFin": if (confirm(TA[lang].resetQ)) { FIN = FIN_EXAMPLES(); saveFin(); render(); } return;
    }
  });
}

/* ---------- Kinder & Entwicklung ---------- */
const TK = {
  de: {kids: "Kinder", kita: "Kita & Betreuung", catalog: "Ideen-Katalog", moreIdeas: "Alle Ideen im Katalog ›", catYear: n => `${n}. Lebensjahr`, catMonth: (y, m) => `${y} J. ${m} Mon.`, catNew: "neu", catFor: "Übernehmen für", catJump: "Springe zu", catHint: "Pro Monat bis zu 4 Ideen je Bereich – „neu“ heißt: ab diesem Monat passend. Antippen übernimmt die Idee als Thema.", catTotal: n => `${n} Ideen von 0 bis 6 Jahren`, overview: "Überblick", topics: "Themen", moments: "Momente", check: "Entwicklungs-Check", checkTab: "Check",
    capture: "Moment festhalten", capturePh: "Was ist passiert? z. B. „Hat heute allein die Schuhe angezogen“", save: "Speichern", areaOpt: "Bereich (optional)",
    mtypes: {note: "Beobachtung", quote: "Zitat", milestone: "Meilenstein"}, mIcon: {note: "👀", quote: "💬", milestone: "⭐"},
    status: {active: "Gefördert", planned: "Geplant", idea: "Ideen", paused: "Pausiert"}, addTopic: "+ Thema", ideasFor: a => `Ideen fürs Alter (${a})`,
    ideasHint: "Grobe Orientierung – jedes Kind ist anders. Antippen übernimmt die Idee als Thema.", gap: "Gerade nichts – bewusst?",
    thisWeek: "Diese Woche", noWeek: "Keine festen Termine", lastMoments: "Letzte Momente", allMoments: "Alle Momente ›", noMoments: "Noch keine Momente – der erste dauert 5 Sekunden.",
    checkDue: "Entwicklungs-Check fällig", checkNext: d => `Nächster Entwicklungs-Check: ${d}`, startCheck: "Check starten", lastCheck: d => `Letzter Check: ${d}`,
    since: n => `Seit dem letzten Check: ${n} Momente`, ratings: {bloom: "Blüht auf", ok: "Läuft", attention: "Braucht Aufmerksamkeit"}, rIcon: {bloom: "🌱", ok: "👍", attention: "👀"},
    overall: "Was nehmen wir uns vor?", overallPh: "Entscheidungen, nächste Schritte, wer macht was …", notePh: "Notiz (optional)", finish: "Check speichern",
    history: "Bisherige Checks", noChecks: "Noch kein Check – der erste legt die Basis.", decisions: "Vorhaben", by: n => `von ${n}`,
    languages: "Sprachen", addLang: "+ Sprache", langNone: "Noch keine Sprachen eingetragen.",
    lastTalk: "Letztes Elterngespräch", talks: "Elterngespräche", contacts: "Kita & Kontakte", care: "Betreuungsnetz", addTalk: "+ Gespräch", addContact: "+ Kontakt", addCare: "+ Person",
    agreements: "Vereinbart", call: "Anrufen", perMonth: "/Mon.", inWeek: "in der Woche", inFixed: "in den Fixkosten",
    f: {t: "Was?", a: "Bereich", s: "Status", why: "Warum / Ziel", o: "Wer kümmert sich?", day: "Fester Wochentag", time: "Uhrzeit", cost: "Kosten pro Monat (€)", note: "Notiz",
      date: "Datum", type: "Art", text: "Was ist passiert?", link: "Foto-Link (optional)", kid: "Kind", l: "Sprache", src: "Wer spricht sie mit dem Kind?", level: "Stand",
      name: "Name", role: "Rolle", phone: "Telefon", with: "Mit wem?", notes: "Was wurde besprochen?", agree: "Vereinbarungen", when: "Wann typischerweise?"},
    newTopic: "Neues Thema", newMoment: "Moment bearbeiten", newLang: "Neue Sprache", newTalk: "Neues Elterngespräch", newContact: "Neuer Kontakt", newCare: "Neue Person",
    every3: "alle 3 Monate", both: "Beide Kinder", hint: "Neue Einträge werden nur in diesem Browser gespeichert (Mockup)."},
  en: {kids: "Kids", kita: "Daycare & care", catalog: "Idea catalog", moreIdeas: "All ideas in the catalog ›", catYear: n => `Year ${n}`, catMonth: (y, m) => `${y}y ${m}m`, catNew: "new", catFor: "Add for", catJump: "Jump to", catHint: "Up to 4 ideas per area each month – “new” means: fits from this month on. Tap to add the idea as a topic.", catTotal: n => `${n} ideas from 0 to 6 years`, overview: "Overview", topics: "Topics", moments: "Moments", check: "Development check", checkTab: "Check",
    capture: "Capture a moment", capturePh: "What happened? e.g. “Put on her shoes alone today”", save: "Save", areaOpt: "Area (optional)",
    mtypes: {note: "Observation", quote: "Quote", milestone: "Milestone"}, mIcon: {note: "👀", quote: "💬", milestone: "⭐"},
    status: {active: "Active", planned: "Planned", idea: "Ideas", paused: "Paused"}, addTopic: "+ Topic", ideasFor: a => `Ideas for this age (${a})`,
    ideasHint: "Rough guidance – every child is different. Tap to add the idea as a topic.", gap: "Nothing right now – on purpose?",
    thisWeek: "This week", noWeek: "No fixed activities", lastMoments: "Recent moments", allMoments: "All moments ›", noMoments: "No moments yet – the first takes 5 seconds.",
    checkDue: "Development check due", checkNext: d => `Next development check: ${d}`, startCheck: "Start check", lastCheck: d => `Last check: ${d}`,
    since: n => `Since the last check: ${n} moments`, ratings: {bloom: "Blossoming", ok: "Going fine", attention: "Needs attention"}, rIcon: {bloom: "🌱", ok: "👍", attention: "👀"},
    overall: "What do we want to do?", overallPh: "Decisions, next steps, who does what …", notePh: "Note (optional)", finish: "Save check",
    history: "Previous checks", noChecks: "No check yet – the first one sets the baseline.", decisions: "Plans", by: n => `by ${n}`,
    languages: "Languages", addLang: "+ Language", langNone: "No languages yet.",
    lastTalk: "Last parent-teacher talk", talks: "Parent-teacher talks", contacts: "Daycare & contacts", care: "Care network", addTalk: "+ Talk", addContact: "+ Contact", addCare: "+ Person",
    agreements: "Agreed", call: "Call", perMonth: "/mo", inWeek: "in the week", inFixed: "in fixed costs",
    f: {t: "What?", a: "Area", s: "Status", why: "Why / goal", o: "Who's on it?", day: "Fixed weekday", time: "Time", cost: "Cost per month (€)", note: "Note",
      date: "Date", type: "Type", text: "What happened?", link: "Photo link (optional)", kid: "Child", l: "Language", src: "Who speaks it with the child?", level: "Level",
      name: "Name", role: "Role", phone: "Phone", with: "With whom?", notes: "What was discussed?", agree: "Agreements", when: "Usually when?"},
    newTopic: "New topic", newMoment: "Edit moment", newLang: "New language", newTalk: "New talk", newContact: "New contact", newCare: "New person",
    every3: "every 3 months", both: "Both kids", hint: "New entries are only saved in this browser (mockup)."}
};
// Age-based ideas: [from month, to month, area, de, en]
const IDEA_LIB = [
  [12, 36, "motor", "Treppen steigen üben", "Practice climbing stairs"], [12, 36, "motor", "Bobbycar / Rutschauto", "Ride-on car"],
  [12, 36, "lang", "Fingerspiele & Reime", "Finger plays & rhymes"], [12, 36, "lang", "Bilderbücher benennen lassen", "Naming things in picture books"],
  [12, 36, "mind", "Formen-Steckspiel", "Shape sorter"], [12, 36, "mind", "Stapeln & Umfüllen", "Stacking & pouring"],
  [12, 36, "creative", "Fingerfarben", "Finger paint"], [12, 36, "indep", "Schuhe selbst ausziehen", "Taking off shoes alone"],
  [12, 36, "nature", "Tiere & ihre Geräusche", "Animals & their sounds"], [12, 36, "social", "Spielgruppe", "Playgroup"],
  [12, 48, "langs", "Lieder auf Portugiesisch", "Songs in Portuguese"],
  [36, 72, "motor", "Fahrrad ohne Stützräder", "Bike without training wheels"], [36, 72, "motor", "Klettern", "Climbing"],
  [36, 72, "lang", "Geschichten nacherzählen", "Retelling stories"], [36, 72, "mind", "Zählen & Mengen", "Counting & quantities"],
  [36, 72, "mind", "Experimente (Wasser, Magnete)", "Experiments (water, magnets)"], [36, 72, "mind", "Erste Brettspiele", "First board games"],
  [36, 72, "social", "Übernachtung bei Freundin/Freund", "Sleepover at a friend's"], [36, 72, "creative", "Basteln mit Schere", "Crafting with scissors"],
  [36, 72, "indep", "Tisch decken", "Setting the table"], [36, 72, "indep", "Schleife binden", "Tying shoelaces"], [48, 84, "indep", "Kleines Taschengeld", "Small pocket money"],
  [36, 72, "nature", "Eigene Pflanze / Hochbeet", "Own plant / raised bed"], [36, 84, "langs", "Bücher auf Portugiesisch", "Books in Portuguese"], [36, 84, "langs", "Englische Kinderlieder & Bücher", "English songs & books"],
  [36, 84, "langs", "Videocall mit der portugiesischsprachigen Familie", "Video calls with the Portuguese-speaking family"]
];
const KIDS_EXAMPLES = () => ({
  topics: [
    {id: "t1", kid: "nara", a: "motor", s: "active", t: L("Kinderturnen", "Kids gymnastics"), why: L("Bewegung & Körpergefühl", "Movement & body awareness"), o: "N", day: 4, time: "15:30", cost: 18},
    {id: "t2", kid: "nara", a: "motor", s: "planned", t: L("Schwimmkurs (Seepferdchen)", "Swimming course"), why: L("Sicher schwimmen bis zur Schule", "Swim safely before school"), o: "N", day: "", time: "", cost: "", note: L("ab Jan. · Anmeldung bis 15.11.", "from Jan · sign up by Nov 15")},
    {id: "t3", kid: "nara", a: "lang", s: "active", t: L("Vorlesen abends", "Bedtime reading"), why: "", o: "AN", day: "", time: "", cost: "", note: L("täglich", "daily")},
    {id: "t4", kid: "nara", a: "lang", s: "idea", t: L("Buchstaben & eigener Name", "Letters & own name"), why: L("Fragt oft nach Buchstaben", "Often asks about letters"), o: "", day: "", time: "", cost: ""},
    {id: "t5", kid: "nara", a: "social", s: "active", t: L("Gefühle benennen", "Naming feelings"), why: "", o: "A", day: "", time: "", cost: "", note: L("Gefühlskarten beim Abendessen", "Feelings cards at dinner")},
    {id: "t6", kid: "nara", a: "creative", s: "planned", t: L("Musikalische Früherziehung", "Early music education"), why: "", o: "A", day: "", time: "", cost: 35, note: L("Probestunde 12.11.", "Trial lesson Nov 12")},
    {id: "t7", kid: "nara", a: "creative", s: "paused", t: L("Malkurs", "Painting class"), why: "", o: "", day: "", time: "", cost: "", note: L("Juni beendet – zu voll mit Turnen", "Stopped in June – too much with gymnastics")},
    {id: "t8", kid: "nara", a: "indep", s: "active", t: L("Allein anziehen", "Getting dressed alone"), why: "", o: "AN", day: "", time: "", cost: "", note: L("morgens, ohne Hetze", "mornings, no rush")},
    {id: "t9", kid: "nara", a: "nature", s: "idea", t: L("Waldtag mit Oma", "Forest day with grandma"), why: "", o: "", day: "", time: "", cost: ""},
    {id: "t10", kid: "nara", a: "langs", s: "active", t: L("Portugiesische Bücher mit Natalia", "Portuguese books with Natalia"), why: L("Portugiesisch aktiv halten", "Keep Portuguese active"), o: "N", day: "", time: "", cost: ""},
    {id: "t11", kid: "levi", a: "motor", s: "active", t: L("Laufen & Klettern", "Walking & climbing"), why: "", o: "N", day: "", time: "", cost: "", note: L("Spielplatz, Treppen", "Playground, stairs")},
    {id: "t12", kid: "levi", a: "lang", s: "active", t: L("Bilderbücher & Benennen", "Picture books & naming"), why: "", o: "N", day: "", time: "", cost: ""},
    {id: "t13", kid: "levi", a: "social", s: "planned", t: L("Krabbelgruppe", "Toddler group"), why: L("Kontakt zu anderen Kindern vor der Kita", "Meet other kids before daycare"), o: "N", day: 2, time: "10:00", cost: 12},
    {id: "t14", kid: "levi", a: "social", s: "planned", t: L("Kita-Eingewöhnung", "Daycare settling-in"), why: "", o: "A", day: "", time: "", cost: "", note: L("Feb. 2027 · André nimmt 2 Wochen frei", "Feb 2027 · André takes 2 weeks off")},
    {id: "t15", kid: "levi", a: "indep", s: "idea", t: L("Mit Löffel allein essen", "Eating with a spoon alone"), why: "", o: "", day: "", time: "", cost: ""},
    {id: "t16", kid: "levi", a: "langs", s: "active", t: L("Portugiesische Lieder", "Portuguese songs"), why: "", o: "N", day: "", time: "", cost: ""}
  ],
  moments: [
    {id: "m1", kid: "nara", date: "2026-09-28", type: "quote", a: "langs", t: L("„Ich will das azul!“ – mischt fröhlich Deutsch und Portugiesisch", "“Ich will das azul!” – happily mixes German and Portuguese"), by: "N", link: ""},
    {id: "m2", kid: "nara", date: "2026-09-24", type: "milestone", a: "motor", t: L("Purzelbaum rückwärts klappt", "Can do a backward roll"), by: "N", link: ""},
    {id: "m3", kid: "nara", date: "2026-09-12", type: "quote", a: "lang", t: L("„Papa, das Buch ist spannend wie Nachtisch.“", "“Dad, this book is exciting like dessert.”"), by: "A", link: ""},
    {id: "m4", kid: "nara", date: "2026-08-30", type: "note", a: "motor", t: L("Fährt 200 m Laufrad ohne abzusetzen", "Rides 200 m on the balance bike without stopping"), by: "A", link: ""},
    {id: "m5", kid: "levi", date: "2026-10-01", type: "note", a: "mind", t: L("Stapelt vier Klötze übereinander", "Stacks four blocks"), by: "N", link: ""},
    {id: "m6", kid: "levi", date: "2026-09-20", type: "milestone", a: "lang", t: L("Sagt „Ball“, „Nara“ und „mehr“", "Says “ball”, “Nara” and “more”"), by: "A", link: ""},
    {id: "m7", kid: "levi", date: "2026-07-14", type: "milestone", a: "motor", t: L("Läuft frei!", "Walking freely!"), by: "N", link: "https://photos.google.com/"}
  ],
  checks: [
    {id: "k1", kid: "nara", date: "2026-06-28", by: "A", ratings: {motor: "bloom", lang: "bloom", social: "ok", mind: "ok", creative: "attention", indep: "ok", nature: "ok", langs: "ok"},
      notes: {creative: L("Malkurs passt gerade nicht", "Painting class doesn't fit right now")}, overall: L("Malkurs pausieren, dafür Musik ausprobieren. Schwimmkurs fürs Frühjahr suchen.", "Pause painting class, try music instead. Find a swimming course for spring.")},
    {id: "k2", kid: "levi", date: "2026-08-20", by: "N", ratings: {motor: "bloom", lang: "ok", social: "ok", mind: "ok", creative: "ok", indep: "ok", nature: "ok", langs: "ok"},
      notes: {}, overall: L("Krabbelgruppe vor der Kita suchen.", "Find a toddler group before daycare.")}
  ],
  languages: {
    nara: [{id: "l1", l: "Deutsch", src: L("André, Kita, Großeltern", "André, daycare, grandparents"), level: L("spricht fließend", "fluent")},
      {id: "l2", l: "Portugiesisch", src: L("Natalia", "Natalia"), level: L("versteht alles, spricht kurze Sätze", "understands everything, short sentences")},
      {id: "l5", l: "Englisch", src: L("hört André & Natalia miteinander", "hears André & Natalia talk to each other"), level: L("versteht einzelne Sätze", "understands some sentences")}],
    levi: [{id: "l3", l: "Deutsch", src: L("André, Großeltern", "André, grandparents"), level: L("erste Wörter", "first words")},
      {id: "l4", l: "Portugiesisch", src: L("Natalia", "Natalia"), level: L("versteht viel", "understands a lot")},
      {id: "l6", l: "Englisch", src: L("hört André & Natalia miteinander", "hears André & Natalia talk to each other"), level: L("passiv", "passive")}]
  },
  kita: {
    contacts: [{id: "c1", name: "Kita Regenbogen – Igelgruppe", role: L("Naras Gruppe", "Nara's group"), phone: "0123 456790", kid: "nara"},
      {id: "c2", name: "Sabine", role: L("Bezugserzieherin Nara", "Nara's key educator"), phone: "", kid: "nara"},
      {id: "c3", name: "Kita Regenbogen – Krippe", role: L("Levi ab Feb. 2027", "Levi from Feb 2027"), phone: "0123 456791", kid: "levi"}],
    talks: [{id: "g1", kid: "nara", date: "2026-06-18", with: "Sabine", notes: L("Spielt viel mit 2–3 festen Freundinnen, sehr sprachgewandt, beim Schneiden noch unsicher.", "Plays a lot with 2–3 close friends, very articulate, still unsure with scissors."),
      agree: L("Zuhause Schneiden üben · Vorschulgruppe ab September", "Practice cutting at home · preschool group from September")}],
    care: [{id: "b1", name: "Oma & Opa", role: L("Großeltern", "Grandparents"), phone: "0123 456792", when: L("donnerstags nachmittags", "Thursday afternoons")},
      {id: "b2", name: "Lea", role: L("Babysitterin", "Babysitter"), phone: "0123 456793", when: L("abends nach Absprache", "evenings by arrangement")}]
  }
});
const KIDS_KEY = "fom.kids.v1";
let KD = (() => { try { const s = FOMStore.getItem(KIDS_KEY); if (s) return JSON.parse(s); } catch (e) {} return KIDS_EXAMPLES(); })();
// Saved data from before the languages were known: switch the placeholders to German / Portuguese / English.
(() => { const ex = KIDS_EXAMPLES(), byId = (l, id) => l && l.find(x => x.id === id);
  ["nara", "levi"].forEach(k => { const cur = KD.languages[k] || [];
    if (cur.some(x => x.l === "Englisch" && plain(x.src) === "Natalia")) KD.languages[k] = ex.languages[k]; });
  [["t10", "Englische Bücher mit Natalia"], ["t16", "Englische Lieder"], ["m1", null]].forEach(([id, old]) => {
    const list = id[0] === "m" ? KD.moments : KD.topics, x = byId(list, id), e = byId(id[0] === "m" ? ex.moments : ex.topics, id);
    if (x && e && (old ? plain(x.t) === old : plain(x.t).includes("blue one"))) Object.assign(x, {t: e.t, ...(e.why ? {why: e.why} : {})}); }); })();
const saveKids = () => { try { FOMStore.setItem(KIDS_KEY, JSON.stringify(KD)); } catch (e) {} };
// Older code reads KIDS[kid].topics; keep that working on top of the editable store.
Object.keys(KIDS).forEach(k => Object.defineProperty(KIDS[k], "topics", {get: () => KD.topics.filter(t => t.kid === k), configurable: true}));

const ageMonths = b => { let m = (TODAY.getFullYear() - b.getFullYear()) * 12 + TODAY.getMonth() - b.getMonth(); if (TODAY.getDate() < b.getDate()) m--; return m; };
const lastKidCheck = kid => KD.checks.filter(c => c.kid === kid).sort((a, b) => b.date.localeCompare(a.date))[0];
const nextKidCheck = kid => { const l = lastKidCheck(kid); return l ? addMonths(parse(l.date), 3) : TODAY; };
const kidCheckDue = kid => nextKidCheck(kid) <= TODAY;
// Idea catalog (catalog/ideen-katalog.json, built by tools/build_catalog.py). Until it has loaded, the small built-in list is used.
let CATALOG = null;
fetch("catalog/ideen-katalog.json").then(r => r.ok ? r.json() : null).then(d => { if (d) { CATALOG = d; render(); } }).catch(() => {});
const catalogIdeas = () => CATALOG ? CATALOG.ideas : IDEA_LIB.map(([from, to, area, de, en], i) => ({id: "lib" + i, area, from, to, de, en, tip_de: "", tip_en: ""}));
// Ideas for a given age month: per area up to `per`, the ones that just became relevant first.
const ideasAt = (m, per = 4, skip = new Set()) => {
  const out = {}; Object.keys(AREAS).forEach(a => out[a] = catalogIdeas().filter(i => i.area === a && i.from <= m && m < i.to && !skip.has(norm(i.de)) && !skip.has(norm(i.en)))
    .sort((x, y) => y.from - x.from || (x.to - x.from) - (y.to - y.from)).slice(0, per)); return out; };
const ideasFor = (kid, per = 4) => ideasAt(ageMonths(KIDS[kid].born), per, new Set(KD.topics.filter(t => t.kid === kid).map(t => norm(tx(t.t)))));
const ideaBtn = (kid, i, withArea) => `<button data-act="takeIdea" data-id="${kid}|${i.area}|${i.de}|${i.en}" title="${esc(lang === "de" ? i.tip_de : i.tip_en)}">${withArea ? tx(AREAS[i.area]) + ": " : ""}${lang === "de" ? i.de : i.en}</button>`;
const schedTxt = t => t.day !== "" && t.day != null ? `${TW[lang].days[t.day].slice(0, 2)}${t.time ? " " + t.time : ""}` : "";
const mIcon = m => `<span class="mic">${TK[lang].mIcon[m.type]}</span>`;

function kidTabs(kid, active) {
  const tk = TK[lang];
  return `<nav class="tabs">${[["", tk.overview], ["topics", tk.topics], ["moments", tk.moments], ["check", tk.checkTab]].map(([k, l]) =>
    `<a href="#/kids/${kid}${k ? "/" + k : ""}" class="${k === active ? "on" : ""}">${l}${k === "check" && kidCheckDue(kid) ? ' <span class="cnt">!</span>' : ""}</a>`).join("")}</nav>`;
}
function captureForm(kid) {
  const tk = TK[lang];
  return `<form class="capture" id="capture"><div class="cap-row">
      ${kid ? `<input type="hidden" name="kid" value="${kid}">` : `<div class="seg mini pick">${Object.entries(KIDS).map(([id, k], i) => `<label><input type="radio" name="kid" value="${id}" ${i === 0 ? "checked" : ""}><span>${k.name}</span></label>`).join("")}</div>`}
      <div class="seg mini pick">${Object.entries(tk.mtypes).map(([k, l], i) => `<label><input type="radio" name="type" value="${k}" ${i === 0 ? "checked" : ""}><span>${tk.mIcon[k]} ${l}</span></label>`).join("")}</div>
      <select name="a"><option value="">${tk.areaOpt}</option>${Object.entries(AREAS).map(([k, l]) => `<option value="${k}">${tx(l)}</option>`).join("")}</select></div>
    <div class="cap-row"><input name="t" placeholder="${tk.capturePh}" autocomplete="off" required><button class="btn primary">${tk.save}</button></div></form>`;
}
function vKidsRoute(r) {
  if (!r[1]) return vKidsHome();
  if (r[1] === "kita") return vKita();
  if (r[1] === "catalog") return vCatalog(r[2]);
  const kid = r[1], sub = r[2] || "";
  if (AREAS[sub]) return vKidArea(kid, sub);
  if (sub === "checkrun") return vKidCheckRun(kid);
  if (sub === "checklog") return vKidCheckLog(kid, r[3]);
  const k = KIDS[kid], top = hero(k.name[0], k.c, k.name, `${ageStr(k.born)} · ${tx(DOM.kids.name)}`, true) + kidTabs(kid, sub);
  return top + (sub === "topics" ? vKidTopics(kid) : sub === "moments" ? vKidMoments(kid) : sub === "check" ? vKidCheck(kid) : vKidOverview(kid))
    + `<p class="hint">${TK[lang].hint} <button class="linkbtn" data-act="resetKids">${TA[lang].reset}</button></p>`;
}
function vKidsHome() {
  const tk = TK[lang], t = T[lang];
  return hero(ic("kids"), DOM.kids.c, tx(DOM.kids.name), tx(DOM.kids.desc)) + `<nav class="tabs"><a href="#/kids" class="on">${tk.kids}</a><a href="#/kids/catalog">${tk.catalog}</a><a href="#/kids/kita">${tk.kita}</a></nav>
    <section class="sec capwrap"><h3>${tk.capture}</h3>${captureForm()}</section>
    <div class="kidcards">${Object.entries(KIDS).map(([id, k]) => { const lm = KD.moments.filter(m => m.kid === id).sort((a, b) => b.date.localeCompare(a.date))[0];
      return `<a class="kidcard" href="#/kids/${id}"><div class="kidtop"><span class="kidav" style="--c:${k.c}">${k.name[0]}</span><div><b>${k.name}</b><span>${ageStr(k.born)} · ${k.topics.filter(x => x.s === "active").length} ${tk.status.active.toLowerCase()}</span></div></div>
        <div class="matrix">${Object.keys(AREAS).map(a => { const b = best(k, a); return `<span><i class="dot" style="background:${STATUS_C[b]}"></i>${tx(AREAS[a])}</span><span class="muted">${k.topics.filter(x => x.a === a && x.s !== "paused").length || "–"}</span>`; }).join("")}</div>
        ${lm ? `<p class="kc-moment">${mIcon(lm)} ${esc(tx(lm.t))} <span class="muted">· ${fmt(parse(lm.date))}</span></p>` : ""}
        <p class="kc-check ${kidCheckDue(id) ? "due" : ""}">${kidCheckDue(id) ? tk.checkDue : tk.checkNext(fmt(nextKidCheck(id)) + " " + nextKidCheck(id).getFullYear())}</p></a>`; }).join("")}</div>
    ${legend()}`;
}
function vKidOverview(kid) {
  const tk = TK[lang], k = KIDS[kid], t = T[lang], tops = k.topics, l = lastKidCheck(kid);
  const weekly = tops.filter(x => x.s === "active" && x.day !== "" && x.day != null).sort((a, b) => ((+a.day + 6) % 7) - ((+b.day + 6) % 7));
  const moments = KD.moments.filter(m => m.kid === kid).sort((a, b) => b.date.localeCompare(a.date));
  const talk = KD.kita.talks.filter(x => x.kid === kid).sort((a, b) => b.date.localeCompare(a.date))[0];
  return `<div class="healthbar">${healthItems().filter(i => i.who === kid && i.src === "u").map(i => `<a class="hpill" href="#/health"><span class="emo">❤️ </span><b>${tx(i.t).split(" ")[0]}</b> ${fmt(i.due)} – ${fmt(i.until)} ${i.until.getFullYear()}${i.state === "unknown" ? ` <span class="w">· ${t.done}</span>` : i.state === "booked" ? ` <span class="ok">· ${fmtDT(i.booked)}</span>` : ""}</a>`).join("")}</div>
    ${kidCheckDue(kid) ? `<section class="nextcard checkdue"><div class="nc-main"><p class="eyebrow">${tk.checkDue}</p><p class="big">${k.name} · ${tk.every3}</p>
      <p class="m">${l ? tk.lastCheck(fmt(parse(l.date))) + " · " + tk.since(moments.filter(m => m.date > l.date).length) : ""}</p></div>
      <div class="nc-actions"><a class="btn primary" href="#/kids/${kid}/checkrun">${tk.startCheck}</a></div></section>` : ""}
    <section class="sec capwrap"><h3>${tk.capture}</h3>${captureForm(kid)}</section>
    <div class="cols">${Object.keys(AREAS).map(a => { const list = tops.filter(x => x.a === a && x.s !== "paused"), lr = l?.ratings?.[a];
      return `<a class="area" style="--c:${k.c}" href="#/kids/${kid}/${a}"><h3>${tx(AREAS[a])}<span class="go">→</span></h3>
        ${lr ? `<span class="rating r-${lr}">${tk.rIcon[lr]} ${tk.ratings[lr]}</span>` : ""}
        ${list.length ? list.map(x => `<div class="topic"><div class="row"><span class="t">${esc(tx(x.t))}</span>${chip(tk.status[x.s], STATUS_C[x.s])}</div>${schedTxt(x) ? `<div class="m">${schedTxt(x)}</div>` : ""}</div>`).join("") : `<div class="empty gap">${tk.gap}</div>`}</a>`; }).join("")}</div>
    <div class="cols" style="margin-top:16px">
      <section class="sec"><h3>${tk.thisWeek}</h3>${weekly.length ? weekly.map(x => `<div class="item"><div><div class="t">${esc(tx(x.t))}</div><div class="m">${schedTxt(x)}</div></div><div class="chips">${owner(x.o)}</div></div>`).join("") : `<p class="empty">${tk.noWeek}</p>`}</section>
      <section class="sec"><h3>${tk.lastMoments}</h3>${moments.slice(0, 3).map(m => `<div class="item"><div>${mIcon(m)} ${esc(tx(m.t))}<div class="m">${fmt(parse(m.date))}</div></div></div>`).join("") || `<p class="empty">${tk.noMoments}</p>`}
        <a class="linkbtn" href="#/kids/${kid}/moments">${tk.allMoments}</a></section>
      <section class="sec"><h3>${tk.languages}</h3>${(KD.languages[kid] || []).map(x => `<div class="item"><div><div class="t">${esc(x.l)}</div><div class="m">${esc(tx(x.level))} · ${esc(tx(x.src))}</div></div></div>`).join("") || `<p class="empty">${tk.langNone}</p>`}
        <a class="linkbtn" href="#/kids/${kid}/langs">${tx(AREAS.langs)} ›</a></section>
      ${talk ? `<section class="sec"><h3>${tk.lastTalk}</h3><div class="m">${fmt(parse(talk.date))} ${parse(talk.date).getFullYear()} · ${esc(talk.with)}</div><p>${esc(tx(talk.notes))}</p>
        <p class="m"><b>${tk.agreements}:</b> ${esc(tx(talk.agree))}</p><a class="linkbtn" href="#/kids/kita">${tk.kita} ›</a></section>` : ""}
    </div>`;
}
function topicCard(x) {
  const tk = TK[lang];
  return `<button class="tcard sec kt" data-act="editTopic" data-id="${x.id}"><span class="tchips"><span class="chip" style="--k:var(--sage)">${tx(AREAS[x.a])}</span>${owner(x.o)}</span>
    <b>${esc(tx(x.t))}</b>${tx(x.why) ? `<span class="m">${esc(tx(x.why))}</span>` : ""}
    <span class="m">${[schedTxt(x) && `🗓 ${schedTxt(x)}`, x.cost && `${eur(x.cost)} ${tk.perMonth}`, tx(x.note) && esc(tx(x.note))].filter(Boolean).join(" · ")}</span></button>`;
}
function vKidTopics(kid) {
  const tk = TK[lang], k = KIDS[kid], ideas = ideasFor(kid, 2), flat = Object.values(ideas).flat();
  return `<div class="toolbar"><button class="btn primary" data-act="addTopic" data-id="${kid}">${tk.addTopic}</button></div>
    <div class="board">${["active", "planned", "idea", "paused"].map(s => { const l = k.topics.filter(x => x.s === s);
      return `<section class="col"><h4 class="lh"><i class="dot" style="background:${STATUS_C[s]}"></i>${tk.status[s]} <span class="cnt neutral">${l.length}</span></h4>${l.map(topicCard).join("") || `<p class="empty">–</p>`}</section>`; }).join("")}</div>
    ${flat.length ? `<div class="ideas"><h3><span class="emo">💡 </span>${tk.ideasFor(ageStr(k.born))}</h3><p>${tk.ideasHint} <a class="linkbtn" href="#/kids/catalog/${ageMonths(k.born)}">${tk.moreIdeas}</a></p><div class="idea-list">${flat.map(i => ideaBtn(kid, i, true)).join("")}</div></div>` : ""}`;
}
function vKidMoments(kid, area) {
  const tk = TK[lang], list = KD.moments.filter(m => m.kid === kid && (!area || m.a === area)).sort((a, b) => b.date.localeCompare(a.date));
  const groups = {}; list.forEach(m => (groups[m.date.slice(0, 7)] = groups[m.date.slice(0, 7)] || []).push(m));
  return `${area ? "" : `<section class="sec capwrap"><h3>${tk.capture}</h3>${captureForm(kid)}</section>`}
    ${list.length ? Object.keys(groups).map(g => `<h4 class="lh">${monthYear(parse(g + "-01"))}</h4><div class="chron">${groups[g].map(m => `<div class="chron-item mem ${m.type}"><button class="docedit" data-act="editMoment" data-id="${m.id}">${dateBlock(parse(m.date))}
      <span class="dmain"><span class="t">${mIcon(m)} ${esc(tx(m.t))}</span><span class="m">${tk.mtypes[m.type]}${m.a ? " · " + tx(AREAS[m.a]) : ""} · ${tk.by(PEOPLE[m.by]?.name || "")}</span></span></button>${extLink(m.link, "Foto")}</div>`).join("")}</div>`).join("")
    : `<p class="empty">${tk.noMoments}</p>`}`;
}
function vKidArea(kid, a) {
  const tk = TK[lang], k = KIDS[kid], list = k.topics.filter(x => x.a === a), ideas = ideasFor(kid)[a];
  return hero(k.name[0], k.c, tx(AREAS[a]), `${k.name} · ${ageStr(k.born)}`, true) + `
    ${a === "langs" ? `<section class="sec" style="margin-bottom:16px"><div class="fhead"><b>${tk.languages}</b><button class="linkbtn" style="margin-left:auto" data-act="addLang" data-id="${kid}">${tk.addLang}</button></div>
      ${(KD.languages[kid] || []).map(x => `<button class="planitem" data-act="editLang" data-id="${kid}|${x.id}"><span class="t">${esc(x.l)}</span><span class="m">${esc(tx(x.level))} · ${esc(tx(x.src))}</span></button>`).join("") || `<p class="empty">${tk.langNone}</p>`}</section>` : ""}
    <div class="toolbar"><h4 class="lh">${tk.topics}</h4><button class="btn" data-act="addTopic" data-id="${kid}" data-area="${a}">${tk.addTopic}</button></div>
    <div class="cols">${list.map(topicCard).join("") || `<p class="empty gap">${tk.gap}</p>`}</div>
    ${ideas.length ? `<div class="ideas"><h3><span class="emo">💡 </span>${tk.ideasFor(ageStr(k.born))}</h3><div class="idea-list">${ideas.map(i => `<div class="idea-row">${ideaBtn(kid, i)}<span class="m">${esc(lang === "de" ? i.tip_de : i.tip_en)}</span></div>`).join("")}</div></div>` : ""}
    <h4 class="lh" style="margin-top:24px">${tk.moments}</h4>${vKidMoments(kid, a)}`;
}
function vKidCheck(kid) {
  const tk = TK[lang], list = KD.checks.filter(c => c.kid === kid).sort((a, b) => b.date.localeCompare(a.date)), due = kidCheckDue(kid);
  return `<section class="nextcard ${due ? "checkdue" : ""}"><div class="nc-main"><p class="eyebrow">${due ? tk.checkDue : tk.check}</p>
      <p class="big">${due ? KIDS[kid].name : tk.checkNext(fmt(nextKidCheck(kid)) + " " + nextKidCheck(kid).getFullYear())}</p><p class="m">${tk.every3}</p></div>
      <div class="nc-actions"><a class="btn ${due ? "primary" : ""}" href="#/kids/${kid}/checkrun">${tk.startCheck}</a></div></section>
    <h4 class="lh">${tk.history}</h4>
    ${list.length ? `<div class="chron">${list.map(c => `<a class="chron-item" href="#/kids/${kid}/checklog/${c.id}">${dateBlock(parse(c.date))}<span class="dmain">
      <span class="t">${tk.check} · ${tk.by(PEOPLE[c.by].name)}</span><span class="ratingdots">${Object.keys(AREAS).map(a => c.ratings[a] ? `<span title="${tx(AREAS[a])}: ${tk.ratings[c.ratings[a]]}">${tk.rIcon[c.ratings[a]]}</span>` : "").join("")}</span>
      ${tx(c.overall) ? `<span class="peek"><b>${tk.decisions}:</b> ${esc(tx(c.overall))}</span>` : ""}</span></a>`).join("")}</div>` : `<p class="empty">${tk.noChecks}</p>`}`;
}
function vKidCheckRun(kid) {
  const tk = TK[lang], k = KIDS[kid], l = lastKidCheck(kid), since = KD.moments.filter(m => m.kid === kid && (!l || m.date > l.date));
  return `<div class="detail wide"><p class="eyebrow">${tk.check} · ${k.name}, ${ageStr(k.born)}</p><h1 class="dtitle">${tk.check} – ${fmt(TODAY)} ${TODAY.getFullYear()}</h1>
    ${since.length ? `<section class="ctx"><b>${tk.since(since.length)}</b>${since.slice(0, 6).map(m => `<div>${mIcon(m)} ${esc(tx(m.t))}</div>`).join("")}</section>` : ""}
    <form id="checkform">${Object.keys(AREAS).map(a => { const tops = k.topics.filter(x => x.a === a && x.s !== "paused"), prev = l?.ratings?.[a];
      return `<section class="runcard"><div class="runhead"><div style="flex:1"><b>${tx(AREAS[a])}</b><div class="m">${tops.map(x => esc(tx(x.t))).join(" · ") || tk.gap}</div></div>
        ${prev ? `<span class="m">${tk.rIcon[prev]}</span>` : ""}</div>
        <div class="seg rate">${Object.entries(tk.ratings).map(([r, lab]) => `<label><input type="radio" name="r_${a}" value="${r}" ${r === (prev || "ok") ? "checked" : ""}><span>${tk.rIcon[r]} ${lab}</span></label>`).join("")}</div>
        <input class="cnote" name="n_${a}" placeholder="${tk.notePh}" autocomplete="off"></section>`; }).join("")}
      <section class="runcard"><b>${tk.overall}</b><textarea name="overall" rows="3" placeholder="${tk.overallPh}"></textarea></section>
      <div class="actions"><a class="btn" href="#/kids/${kid}/check">${TA[lang].cancel}</a><button class="btn primary">${tk.finish}</button></div></form></div>`;
}
function vKidCheckLog(kid, id) {
  const tk = TK[lang], c = KD.checks.find(x => x.id === id);
  if (!c) return `<p class="empty">–</p>`;
  return `<div class="detail wide"><p class="eyebrow">${KIDS[kid].name} · ${tk.by(PEOPLE[c.by].name)}</p><h1 class="dtitle">${tk.check} – ${fmt(parse(c.date))} ${parse(c.date).getFullYear()}</h1>
    <dl class="dl">${Object.keys(AREAS).filter(a => c.ratings[a]).map(a => `<dt>${tx(AREAS[a])}</dt><dd><span class="rating r-${c.ratings[a]}">${tk.rIcon[c.ratings[a]]} ${tk.ratings[c.ratings[a]]}</span>${tx(c.notes?.[a]) ? `<div class="m">${esc(tx(c.notes[a]))}</div>` : ""}</dd>`).join("")}
      <dt>${tk.decisions}</dt><dd>${esc(tx(c.overall)) || "–"}</dd></dl>
    <div class="actions"><button class="btn danger" data-act="delCheck" data-id="${c.id}" data-kid="${kid}">${TA[lang].del}</button></div></div>`;
}
function vKita() {
  const tk = TK[lang], K = KD.kita;
  return hero(ic("kids"), DOM.kids.c, tx(DOM.kids.name), tx(DOM.kids.desc)) + `<nav class="tabs"><a href="#/kids">${tk.kids}</a><a href="#/kids/catalog">${tk.catalog}</a><a href="#/kids/kita" class="on">${tk.kita}</a></nav>
    <div class="toolbar"><h4 class="lh">${tk.talks}</h4><button class="btn primary" data-act="addTalk">${tk.addTalk}</button></div>
    <div class="chron">${K.talks.slice().sort((a, b) => b.date.localeCompare(a.date)).map(g => `<div class="chron-item mem"><button class="docedit" data-act="editTalk" data-id="${g.id}">${dateBlock(parse(g.date))}<span class="dmain">
      <span class="t">${KIDS[g.kid].name} · ${esc(g.with)}</span><span class="peek">${esc(tx(g.notes))}</span>${tx(g.agree) ? `<span class="m"><b>${tk.agreements}:</b> ${esc(tx(g.agree))}</span>` : ""}</span></button></div>`).join("")}</div>
    <div class="cols" style="margin-top:24px">
      <section class="sec"><div class="fhead"><b>${tk.contacts}</b><button class="linkbtn" style="margin-left:auto" data-act="addContact">${tk.addContact}</button></div>
        ${K.contacts.map(c => `<div class="drow docline"><button class="docedit" data-act="editContact" data-id="${c.id}"><span class="dmain"><span class="t">${esc(c.name)}</span><span class="m">${esc(tx(c.role))} · ${KIDS[c.kid]?.name || ""}</span></span></button>${telLink(c.phone, tk.call)}</div>`).join("")}</section>
      <section class="sec"><div class="fhead"><b>${tk.care}</b><button class="linkbtn" style="margin-left:auto" data-act="addCare">${tk.addCare}</button></div>
        ${K.care.map(c => `<div class="drow docline"><button class="docedit" data-act="editCare" data-id="${c.id}"><span class="dmain"><span class="t">${esc(c.name)}</span><span class="m">${esc(tx(c.role))} · ${esc(tx(c.when))}</span></span></button>${telLink(c.phone, tk.call)}</div>`).join("")}</section>
    </div><p class="hint">${tk.hint} <button class="linkbtn" data-act="resetKids">${TA[lang].reset}</button></p>`;
}

let catKid = "nara";
function vCatalog(mArg) {
  const tk = TK[lang], km = id => ageMonths(KIDS[id].born), m = Math.max(0, Math.min(71, mArg !== undefined && mArg !== "" ? +mArg : km(catKid)));
  const y = Math.floor(m / 12), per = ideasAt(m, 4), total = catalogIdeas().length;
  const have = new Set(KD.topics.filter(t => t.kid === catKid).map(t => norm(tx(t.t))));  // already a topic for the selected child
  return hero(ic("kids"), DOM.kids.c, tx(DOM.kids.name), tx(DOM.kids.desc)) + `<nav class="tabs"><a href="#/kids">${tk.kids}</a><a href="#/kids/catalog" class="on">${tk.catalog}</a><a href="#/kids/kita">${tk.kita}</a></nav>
    <section class="sec catnav"><div class="fhead"><b>${tk.catMonth(y, m % 12)}</b><span class="m">${tk.catTotal(total)}</span></div>
      <div class="cat-row"><span class="m">${tk.catJump}</span>${Object.entries(KIDS).map(([id, k]) => `<a class="btn" href="#/kids/catalog/${km(id)}">${k.name} · ${ageStr(k.born)}</a>`).join("")}</div>
      <div class="cat-row years">${Array.from({length: 6}, (_, i) => `<a class="${i === y ? "on" : ""}" href="#/kids/catalog/${i * 12 + (m % 12)}">${tk.catYear(i + 1)}</a>`).join("")}</div>
      <div class="cat-row months">${Array.from({length: 12}, (_, i) => `<a class="${i === m % 12 ? "on" : ""}" href="#/kids/catalog/${y * 12 + i}">${y * 12 + i}</a>`).join("")}</div>
      <div class="cat-row"><span class="m">${tk.catFor}</span><div class="seg mini">${Object.entries(KIDS).map(([id, k]) => `<button class="${catKid === id ? "on" : ""}" data-act="catKid" data-id="${id}">${k.name}</button>`).join("")}</div></div>
      <p class="m">${tk.catHint}</p></section>
    <div class="cols">${Object.keys(AREAS).map(a => `<section class="sec"><h3>${tx(AREAS[a])}</h3>${per[a].map(i => `<div class="cat-idea">
      ${have.has(norm(i.de)) || have.has(norm(i.en)) ? `<button class="taken" disabled title="${KIDS[catKid].name}">✓</button>` : `<button data-act="takeIdea" data-id="${catKid}|${i.area}|${i.de}|${i.en}">+</button>`}<div><div class="t">${lang === "de" ? i.de : i.en}${i.from === m ? ` <span class="chip" style="--k:var(--active)">${tk.catNew}</span>` : ""}</div>
      <div class="m">${esc(lang === "de" ? i.tip_de : i.tip_en)} · ${i.from}–${i.to - 1} ${lang === "de" ? "Mon." : "mo"}</div></div></div>`).join("") || `<p class="empty">–</p>`}</section>`).join("")}</div>`;
}
function bindKids(v, r) {
  const tk = TK[lang], f = tk.f, kidOpts = Object.fromEntries(Object.entries(KIDS).map(([id, k]) => [id, k.name]));
  const days = {"": "–", ...Object.fromEntries(TW[lang].days.map((d, i) => [i, d]))}, areas = Object.fromEntries(Object.entries(AREAS).map(([k, l]) => [k, tx(l)]));
  const topicForm = () => [{k: "t", label: f.t, req: true}, {k: "a", label: f.a, type: "select", options: areas}, {k: "s", label: f.s, type: "select", options: {active: tk.status.active, planned: tk.status.planned, idea: tk.status.idea, paused: tk.status.paused}},
    {k: "why", label: f.why}, {k: "o", label: f.o, type: "select", options: {"": "–", ...TA[lang].owners}}, {k: "day", label: f.day, type: "select", options: days}, {k: "time", label: f.time, type: "time"},
    {k: "cost", label: f.cost, type: "number"}, {k: "note", label: f.note}];
  const momentForm = () => [{k: "date", label: f.date, type: "date", req: true}, {k: "type", label: f.type, type: "select", options: tk.mtypes}, {k: "t", label: f.text, req: true},
    {k: "a", label: f.a, type: "select", options: {"": "–", ...areas}}, {k: "link", label: f.link, type: "url"}];
  const strip = x => Object.fromEntries(Object.entries(x).map(([k, val]) => [k, val && typeof val === "object" && "de" in val ? plain(val) : val]));
  const num = x => x === "" || x == null ? "" : +x;
  v.querySelectorAll("[data-act]").forEach(b => b.onclick = e => {
    const act = b.dataset.act, id = b.dataset.id;
    if (act !== "resetKids") e.preventDefault();
    switch (act) {
      case "addTopic": return openForm(tk.newTopic, topicForm(), {a: b.dataset.area || "motor", s: "idea", o: me(), day: "", cost: ""}, val => KD.topics.push({id: "u" + Date.now(), kid: id, ...val, cost: num(val.cost)}));
      case "editTopic": { const x = KD.topics.find(y => y.id === id);
        return openForm(TA[lang].edit, topicForm(), strip(x), val => Object.assign(x, val, {cost: num(val.cost)}), () => KD.topics.splice(KD.topics.indexOf(x), 1)); }
      case "takeIdea": { const [kid, a, de, en] = id.split("|"); KD.topics.push({id: "u" + Date.now(), kid, a, s: "idea", t: L(de, en), why: "", o: me(), day: "", time: "", cost: ""}); saveKids(); return render(); }
      case "catKid": catKid = id; return render();
      case "editMoment": { const m = KD.moments.find(y => y.id === id);
        return openForm(tk.newMoment, momentForm(), strip(m), val => Object.assign(m, val), () => KD.moments.splice(KD.moments.indexOf(m), 1)); }
      case "delCheck": KD.checks = KD.checks.filter(c => c.id !== id); saveKids(); return go(`#/kids/${b.dataset.kid}/check`);
      case "addLang": return openForm(tk.newLang, [{k: "l", label: f.l, req: true}, {k: "src", label: f.src}, {k: "level", label: f.level}], {}, val => (KD.languages[id] = KD.languages[id] || []).push({id: "u" + Date.now(), ...val}));
      case "editLang": { const [kid, lid] = id.split("|"), list = KD.languages[kid], x = list.find(y => y.id === lid);
        return openForm(TA[lang].edit, [{k: "l", label: f.l, req: true}, {k: "src", label: f.src}, {k: "level", label: f.level}], strip(x), val => Object.assign(x, val), () => list.splice(list.indexOf(x), 1)); }
      case "addTalk": case "editTalk": { const x = act === "editTalk" ? KD.kita.talks.find(y => y.id === id) : null;
        const fields = [{k: "kid", label: f.kid, type: "select", options: kidOpts}, {k: "date", label: f.date, type: "date", req: true}, {k: "with", label: f.with}, {k: "notes", label: f.notes}, {k: "agree", label: f.agree}];
        return openForm(x ? TA[lang].edit : tk.newTalk, fields, x ? strip(x) : {kid: "nara", date: iso(TODAY)}, val => x ? Object.assign(x, val) : KD.kita.talks.push({id: "u" + Date.now(), ...val}), x ? () => KD.kita.talks.splice(KD.kita.talks.indexOf(x), 1) : null); }
      case "addContact": case "editContact": { const x = act === "editContact" ? KD.kita.contacts.find(y => y.id === id) : null;
        const fields = [{k: "name", label: f.name, req: true}, {k: "role", label: f.role}, {k: "kid", label: f.kid, type: "select", options: kidOpts}, {k: "phone", label: f.phone, type: "tel"}];
        return openForm(x ? TA[lang].edit : tk.newContact, fields, x ? strip(x) : {kid: "nara"}, val => x ? Object.assign(x, val) : KD.kita.contacts.push({id: "u" + Date.now(), ...val}), x ? () => KD.kita.contacts.splice(KD.kita.contacts.indexOf(x), 1) : null); }
      case "addCare": case "editCare": { const x = act === "editCare" ? KD.kita.care.find(y => y.id === id) : null;
        const fields = [{k: "name", label: f.name, req: true}, {k: "role", label: f.role}, {k: "when", label: f.when}, {k: "phone", label: f.phone, type: "tel"}];
        return openForm(x ? TA[lang].edit : tk.newCare, fields, x ? strip(x) : {}, val => x ? Object.assign(x, val) : KD.kita.care.push({id: "u" + Date.now(), ...val}), x ? () => KD.kita.care.splice(KD.kita.care.indexOf(x), 1) : null); }
      case "resetKids": if (confirm(TA[lang].resetQ)) { KD = KIDS_EXAMPLES(); saveKids(); render(); } return;
    }
  });
  const cf = v.querySelector("#capture");
  if (cf) cf.onsubmit = e => { e.preventDefault(); const fd = new FormData(cf), t = (fd.get("t") || "").trim(); if (!t) return;
    KD.moments.push({id: "u" + Date.now(), kid: fd.get("kid"), date: iso(TODAY), type: fd.get("type"), a: fd.get("a") || "", t, by: me(), link: ""}); saveKids(); render();
    const ok = v.querySelector(".capwrap h3"); if (ok) { ok.textContent = "✓ " + ok.textContent; } };
  const chk = v.querySelector("#checkform");
  if (chk) chk.onsubmit = e => { e.preventDefault(); const fd = new FormData(chk), kid = r[1], id = "u" + Date.now();
    KD.checks.push({id, kid, date: iso(TODAY), by: me(), ratings: Object.fromEntries(Object.keys(AREAS).map(a => [a, fd.get("r_" + a)])),
      notes: Object.fromEntries(Object.keys(AREAS).map(a => [a, (fd.get("n_" + a) || "").trim()]).filter(([, n]) => n)), overall: (fd.get("overall") || "").trim()});
    saveKids(); go(`#/kids/${kid}/checklog/${id}`); };
}

/* ---------- Router: internal state (works on file://, http and in data: previews) ---------- */
let cur = location.hash || "#/";
function route() { return cur.replace(/^#\/?/, "").split("/").filter(Boolean); }
function go(h) { cur = h; try { history.pushState(null, "", h); } catch (e) {} onRoute(); }
document.addEventListener("click", e => { const a = e.target.closest('a[href^="#/"]'); if (a) { e.preventDefault(); go(a.getAttribute("href")); } });
window.addEventListener("popstate", () => { cur = location.hash || "#/"; onRoute(); });

function render() {
  if (route()[0] === "money") { location.href = "/kasse/"; return; }
  const r = route(), t = T[lang], v = document.getElementById("view");
  document.documentElement.lang = lang;
  seg("user", [["André", "André"], ["Natalia", "Natalia"]], user, x => { user = x; try { localStorage.setItem("fom.pref.user", x); } catch (e) {} render(); });
  seg("lang", [["de", "DE"], ["en", "EN"]], lang, x => { lang = x; try { localStorage.setItem("fom.pref.lang", x); } catch (e) {} render(); });
  if (!r[0]) {
    document.getElementById("title").innerHTML = `<h1 class="greet">${t.hello(new Date().getHours())}, ${user}<span class="emo"> ☀️</span><small>${t.today}</small></h1>`;
  } else {
    const crumbs = [[t.center, "#/"], [tx(DOM[r[0]].short), `#/${r[0]}`]];
    if (r[0] === "kids") {
      const tk = TK[lang];
      if (r[1] === "kita") crumbs.push([tk.kita, ""]);
      else if (r[1] === "catalog") crumbs.push([tk.catalog, ""]);
      else if (r[1]) { crumbs.push([KIDS[r[1]].name, `#/kids/${r[1]}`]);
        if (AREAS[r[2]]) crumbs.push([tx(AREAS[r[2]]), ""]);
        else if (r[2] === "checkrun" || r[2] === "checklog") crumbs.push([tk.check, `#/kids/${r[1]}/check`], [r[2] === "checkrun" ? tk.startCheck : fmt(parse(KD.checks.find(c => c.id === r[3])?.date || iso(TODAY))), ""]);
        else if (r[2]) crumbs.push([tk[r[2]], ""]); }
    } else if (r[0] === "admin" && r[1]) {
      const ta = TA[lang];
      if (r[1] === "d") { const i = radarItems().find(x => x.id === r[2]); crumbs.push([ta.radar, "#/admin"], [i ? esc(tx(i.t)) : "–", ""]); }
      else if (r[1] === "c" && r[2]) { const c = ADMIN.contracts.find(x => x.id === r[2]); crumbs.push([ta.contracts, "#/admin/contracts"], [c ? esc(tx(c.name)) : "–", ""]); }
      else crumbs.push([ta[r[1]], ""]);
    } else if (r[0] === "money" && r[1]) {
      crumbs.push([TF[lang][r[1]], ""]);
    } else if (r[0] === "week" && r[1]) {
      crumbs.push([TW[lang][r[1]], ""]);
    } else if (r[0] === "goals" && r[1]) {
      if (r[1] === "g") { const g = GOALS.goals.find(x => x.id === r[2]); crumbs.push([TZ[lang].goals, "#/goals"], [g ? esc(tx(g.t)) : "–", ""]); }
      else crumbs.push([TZ[lang][r[1]], ""]);
    } else if (r[0] === "health" && r[1]) {
      crumbs.push([TG[lang][r[1]], ""]);
    } else if (r[0] === "home" && r[1]) {
      crumbs.push([TH[lang][r[1]], ""]);
    } else if (r[0] === "team" && r[1]) {
      const tt = TT[lang];
      if (["run", "log", "setup"].includes(r[1])) crumbs.push([tt.checkin, "#/team"], [r[1] === "run" ? tt.start : r[1] === "setup" ? tt.setupTitle : tt.chronicle, ""]);
      else crumbs.push([tt[r[1]], ""]);
    }
    document.getElementById("title").innerHTML = `<nav class="crumbs">${crumbs.map((c, i) => i === crumbs.length - 1 ? `<b>${c[0]}</b>` : `<a href="${c[1]}">${i === 0 ? '<span class="emo">☀️ </span>' : ""}${c[0]}</a>`).join("")}</nav>`;
  }
  v.innerHTML = !r[0] ? vCenter() : r[0] === "admin" ? vAdmin(r) : r[0] === "team" ? vTeam(r) : r[0] === "home" ? vHome(r) : r[0] === "health" ? vHealth(r) : r[0] === "goals" ? vGoals(r) : r[0] === "week" ? vWeek(r) : r[0] === "money" ? vMoney(r) : r[0] === "kids" ? vKidsRoute(r) : vDomain(r[0]);
  document.getElementById("note").textContent = t.note;
  bindOrbit(v);
  v.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { if (Date.now() - dragEnded < 300) return; const rc = b.getBoundingClientRect(), vr = v.getBoundingClientRect();
    zoomFrom = `${rc.left + rc.width / 2 - vr.left}px ${rc.top + rc.height / 2 - vr.top}px`; go(b.dataset.go); });
  if (r[0] === "admin") bindAdmin(v);
  if (r[0] === "team") bindTeam(v);
  if (r[0] === "home") bindHome(v);
  if (r[0] === "health") bindHealth(v);
  if (r[0] === "goals") bindGoals(v);
  if (r[0] === "week") bindWeek(v);
  if (r[0] === "money") bindMoney(v);
  if (r[0] === "kids") bindKids(v, r);
}
function seg(id, opts, curV, fn) {
  const e = document.getElementById(id);
  e.innerHTML = opts.map(o => `<button class="${o[0] === curV ? "on" : ""}" data-v="${o[0]}">${o[1]}</button>`).join("");
  e.querySelectorAll("button").forEach(b => b.onclick = () => fn(b.dataset.v));
}
function onRoute() {
  const depth = route().length, v = document.getElementById("view");
  if (depth < 2) kidFilter = null;
  render(); window.scrollTo(0, 0);
  const zoomIn = depth > prevDepth;
  v.style.transformOrigin = zoomIn && zoomFrom ? zoomFrom : "50% 0";
  v.animate(zoomIn ? [{transform: "scale(.3)", opacity: 0}, {transform: "scale(1)", opacity: 1}]
                   : [{transform: "scale(1.15)", opacity: 0}, {transform: "scale(1)", opacity: 1}],
            {duration: 380, easing: "cubic-bezier(.2,.9,.25,1.05)"});
  prevDepth = depth; zoomFrom = null;
}
prevDepth = route().length;
render();
