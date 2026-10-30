// Family OS: Anmeldung und gemeinsame Daten.
// Das Mockup (app.js) speichert jeden Bereich als ein Datenpaket. Statt im Browser liegen diese Pakete
// in Supabase (Tabelle fos_state im Familienkasse-Projekt), damit Natalia und André dasselbe sehen.
// Schutz vor gegenseitigem Überschreiben: Jedes Paket hat eine Versionsnummer. Hat die andere Person
// zwischendurch gespeichert, wird nichts überschrieben, sondern um Neuladen gebeten.
(() => {
  const $ = (id) => document.getElementById(id);
  const cfg = window.FOS || {};
  const cache = {};          // key -> {data, version}
  const pending = {};        // key -> timer
  let sb = null, me = '', conflict = false;

  const bar = (text, btn = 'Neu laden') => { $('synctext').textContent = text; $('syncbtn').textContent = btn; $('syncbar').hidden = !text; };
  $('syncbtn').addEventListener('click', () => location.reload());

  async function write(key) {
    delete pending[key];
    const c = cache[key];
    try {
      if (!c.version) {
        const { error } = await sb.from('fos_state').insert({ key, data: c.data, version: 1, updated_by: me });
        if (error) { if (error.code === '23505') return clash(); throw error; }
        c.version = 1;
      } else {
        const { data, error } = await sb.from('fos_state').update({ data: c.data, version: c.version + 1, updated_at: new Date().toISOString(), updated_by: me })
          .eq('key', key).eq('version', c.version).select('version');
        if (error) throw error;
        if (!data.length) return clash();
        c.version = data[0].version;
      }
      if (!conflict && !Object.keys(pending).length) bar('');
    } catch (e) {
      bar('Speichern hat nicht geklappt (' + (e.message || e) + '). Verbindung prüfen.', 'Neu laden');
    }
  }
  function clash() {
    conflict = true;
    bar('Jemand anderes hat diesen Bereich gerade geändert. Bitte neu laden und die letzte Änderung wiederholen.');
  }

  // Wird von app.js statt localStorage benutzt
  window.FOMStore = {
    getItem: (key) => (cache[key] ? JSON.stringify(cache[key].data) : null),
    setItem: (key, value) => {
      if (conflict) { clash(); return; }
      cache[key] = { data: JSON.parse(value), version: cache[key] ? cache[key].version : 0 };
      clearTimeout(pending[key]);
      pending[key] = setTimeout(() => write(key), 600);
    },
  };
  window.addEventListener('beforeunload', (e) => { if (Object.keys(pending).length) { Object.keys(pending).forEach((k) => { clearTimeout(pending[k]); write(k); }); e.preventDefault(); } });

  // Änderungen der anderen Person: beim Zurückkehren zur Seite und jede Minute prüfen
  async function checkRemote() {
    if (!sb || conflict || Object.keys(pending).length || document.querySelector('dialog[open]')) return;
    const { data } = await sb.from('fos_state').select('key, version, updated_by');
    const changed = (data || []).filter((r) => !cache[r.key] || r.version > cache[r.key].version);
    if (!changed.length) return;
    const who = changed.map((r) => r.updated_by).find((x) => x && x !== me) || '';
    if (document.visibilityState === 'hidden') { location.reload(); return; }
    bar(`${who ? who.split('@')[0] + ' hat' : 'Es gibt'} neue Änderungen.`);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkRemote(); });
  setInterval(checkRemote, 60000);

  // ---------------------------------------------------------------- Anmeldung
  function showLogin(title, text) {
    $('wrap').hidden = true; $('login').hidden = false;
    if (title) $('ltitle').textContent = title;
    if (text) $('ltext').textContent = text;
  }
  $('lform').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = $('lmail').value.trim();
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    $('ltext').textContent = error ? 'Das hat nicht geklappt: ' + error.message : `Link ist unterwegs an ${email}. Mail auf diesem Gerät öffnen und den Link antippen.`;
  });

  async function enter(session) {
    me = session.user.email || '';
    const member = await sb.rpc('fk_is_member');
    if (member.error || !member.data) { showLogin('Nicht freigeschaltet', 'Diese E-Mail-Adresse ist nicht freigeschaltet. Freigeben am Mac in der Familienkasse unter „Web-Version“.'); return; }
    const { data, error } = await sb.from('fos_state').select('key, data, version');
    if (error) { showLogin('Keine Verbindung', 'Daten konnten nicht geladen werden: ' + error.message); return; }
    data.forEach((r) => { cache[r.key] = { data: r.data, version: r.version }; });
    let prefUser = null, prefLang = null;
    try { prefUser = localStorage.getItem('fom.pref.user'); prefLang = localStorage.getItem('fom.pref.lang'); } catch (e) {}
    window.FOM_USER = prefUser || (/natalia/i.test(me) ? 'Natalia' : 'André');
    window.FOM_LANG = prefLang || 'de';
    $('login').hidden = true; $('wrap').hidden = false;
    const s = document.createElement('script'); s.src = 'app.js?v=' + (cfg.v || 1); document.body.appendChild(s);
    const out = document.createElement('a'); out.href = '#'; out.textContent = 'Abmelden';
    out.addEventListener('click', async (e) => { e.preventDefault(); await sb.auth.signOut(); location.hash = ''; location.reload(); });
    const note = $('note'); const tail = document.createElement('div'); tail.style.marginTop = '6px'; tail.append(`Angemeldet als ${me} · `, out); note.after(tail);
  }

  async function start() {
    if (!cfg.url) { showLogin('Nicht eingerichtet', 'config.js fehlt.'); return; }
    try {
      await new Promise((ok, fail) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js'; s.onload = ok; s.onerror = fail; document.head.appendChild(s); });
    } catch (e) { showLogin('Keine Verbindung', 'Supabase konnte nicht geladen werden. Bitte neu laden.'); return; }
    sb = window.supabase.createClient(cfg.url, cfg.key);
    let entered = false;
    const go = (session) => { if (!entered && session) { entered = true; enter(session); } };
    sb.auth.onAuthStateChange((ev, session) => { if (ev === 'SIGNED_IN') go(session); });
    const { data } = await sb.auth.getSession();
    if (data.session) go(data.session); else showLogin();
  }
  start();
})();
