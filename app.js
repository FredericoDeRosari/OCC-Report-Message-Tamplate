// =====================================================================
//  Format Lab — app.js
//  • Variabel & format: tersimpan di browser masing-masing (localStorage)
//  • Masukkan: tersimpan di Firebase Realtime Database (realtime untuk semua)
// =====================================================================
import { SLIDES, COMMON_VARS, nowWIB, TEMPLATE_VERSION } from './templates.js?v=4';

const FIREBASE_VERSION = '10.12.2';
const M0 = '', M1 = '', M2 = '', ME = ''; // penanda variabel internal
const PH = /\{([^{}\n]+)\}/g;
const MAX_TEXT = 1000;

const app = document.getElementById('app');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const LS = {
  get(k, d) { try { const v = localStorage.getItem('fmtlab:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('fmtlab:' + k, JSON.stringify(v)); } catch { /* storage diblokir */ } },
  del(k) { try { localStorage.removeItem('fmtlab:' + k); } catch { /* */ } },
};
const isPhone = () => matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1024px)').matches;

const state = {
  view: null,           // 'desktop' | 'mobile'
  idx: -1,              // index slide aktif
  hl: LS.get('hl', true),
  mmode: LS.get('mmode', 'format'), // mobile: 'format' | 'real'
  active: null,         // {scope,key} variabel yang sedang difokus
  edit: null,           // { sid, init, draft, last } saat mode Edit Template
};
let uid = 0;

// ------------------------------------------------------------ persiapan slide
function autoMeta(key) {
  let m = key.match(/^(.*?)\s*\((Contoh:[^)]*)\)\s*$/);
  if (m) return { label: m[1], hint: m[2] };
  m = key.match(/^([^:]+):\s*(.+)$/);
  if (m) return { label: m[1], hint: 'Format: ' + m[2] };
  return { label: key, hint: '' };
}
function metaFor(key, own = {}) {
  const a = autoMeta(key);
  return { def: '', ...a, ...(COMMON_VARS[key] || COMMON_VARS[a.label] || {}), ...(own[key] || own[a.label] || {}) };
}
function extractKeys(tpl) {
  const out = [];
  for (const m of tpl.matchAll(PH)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}
const isComp = (s, k) => !!(s.computed && k in s.computed);
const uniqArr = a => [...new Set(a)];
for (const s of SLIDES) {
  if (s.type === 'request') continue;
  s.baseTpl = s.tpl; s.baseItemTpl = s.itemTpl;
  s.baseVars = extractKeys(s.tpl).filter(k => !isComp(s, k));
  s.baseItemVars = s.type === 'group' ? extractKeys(s.itemTpl).filter(k => k !== 'No') : [];
  s.metaMap = {}; s.defaults = {}; s.itemMeta = {};
}

// ------------------------------------------------------------ template (bisa diedit)
//  urutan: draf (sedang diedit) > tempTpl (sudah Save, sementara) > default Firebase > bawaan
const tempTpl = {};
const sameTpl = (a, b) => a.tpl === b.tpl && (a.itemTpl ?? '') === (b.itemTpl ?? '') && a.cv.join('\n') === b.cv.join('\n') && a.cvi.join('\n') === b.cvi.join('\n');
function defTpl(s) {
  const sh = shared[s.id];
  return { tpl: sh?.tpl ?? s.baseTpl, itemTpl: sh?.itemTpl ?? s.baseItemTpl, cv: sh?.cv ?? [], cvi: sh?.cvi ?? [] };
}
function effTpl(s) {
  if (state.edit?.sid === s.id) return state.edit.draft;
  return tempTpl[s.id] || defTpl(s);
}
function knownVars(s, e = effTpl(s)) {
  const g = uniqArr([...s.baseVars, ...e.cv, ...extractKeys(e.tpl).filter(k => !isComp(s, k))]);
  const i = s.type === 'group' ? uniqArr([...s.itemExtra, ...s.baseItemVars, ...e.cvi, ...extractKeys(e.itemTpl).filter(k => k !== 'No')]) : [];
  return { g, i };
}
/** Hitung ulang daftar variabel slide dari template yang berlaku */
function refreshSlide(s) {
  if (!s || s.type === 'request') return;
  const e = effTpl(s);
  s.tpl = e.tpl;
  s.keys = extractKeys(e.tpl).filter(k => !isComp(s, k));
  const kv = knownVars(s, e);
  for (const k of kv.g) {
    if (s.metaMap[k]) continue;
    const m = metaFor(k, s.vars);
    s.metaMap[k] = m;
    s.defaults[k] = typeof m.def === 'function' ? m.def() : (m.def ?? '');
  }
  if (s.type === 'group') {
    s.itemTpl = e.itemTpl;
    s.itemKeys = [...s.itemExtra, ...extractKeys(e.itemTpl).filter(k => k !== 'No' && !s.itemExtra.includes(k))];
    for (const k of kv.i) if (!s.itemMeta[k]) s.itemMeta[k] = metaFor(k, s.itemVars);
  }
}
const keySig = s => (s?.keys || []).join('|') + '#' + (s?.itemKeys || []).join('|');

// ------------------------------------------------------------ nilai variabel
//  default  = milik bersama, tersimpan di Firebase (path: defaults/<slide>)
//  temp     = perubahan sementara milik orang ini (hilang saat refresh)
const temp = {};
const shared = {};          // hasil decode dari Firebase: { v | g, items, ts, by }
let sharedLoaded = false;
const T = s => temp[s.id] || (temp[s.id] = s.type === 'group' ? { g: {}, items: null } : {});
const bagOf = s => (s.type === 'group' ? T(s).g : T(s));
const defaultItems = s => shared[s.id]?.items || s.defaultItems;
const itemsOf = s => T(s).items || defaultItems(s);
function defaultOf(s, scope, key) {
  if (scope === 'g') {
    const sh = shared[s.id]; const bag = sh && (s.type === 'group' ? sh.g : sh.v);
    if (bag && key in bag) return bag[key];
    return s.defaults[key] ?? '';
  }
  return defaultItems(s)[+scope]?.[key] ?? '';
}
const builtinOf = (s, scope, key) => (scope === 'g' ? (s.defaults[key] ?? '') : (s.defaultItems?.[+scope]?.[key] ?? ''));
function val(s, scope, key) {
  if (scope === 'c') return s.computed[key](itemsOf(s));
  if (scope === 'g') return bagOf(s)[key] ?? defaultOf(s, 'g', key);
  return itemsOf(s)[+scope]?.[key] ?? '';
}
function setVal(s, scope, key, value) {
  if (scope === 'g') {
    const bag = bagOf(s);
    if (value === defaultOf(s, 'g', key)) delete bag[key]; else bag[key] = value;
    return;
  }
  const t = T(s);
  if (!t.items) t.items = clone(defaultItems(s));
  if (t.items[+scope]) t.items[+scope][key] = value;
  normalizeItems(s);
}
const flatItems = (s, arr) => JSON.stringify(arr.map(it => s.itemKeys.map(k => it?.[k] ?? '')));
function normalizeItems(s) {
  const t = T(s);
  if (t.items && flatItems(s, t.items) === flatItems(s, defaultItems(s))) t.items = null;
}
function isDirty(s, scope, key) {
  if (scope === 'c') return false;
  if (scope === 'g') { const bag = bagOf(s); return key in bag && bag[key] !== defaultOf(s, 'g', key); }
  const t = T(s); if (!t.items) return false;
  return (t.items[+scope]?.[key] ?? '') !== (defaultItems(s)[+scope]?.[key] ?? '');
}
function changeCount(s) {
  if (!s || s.type === 'request') return 0;
  let n = s.keys.filter(k => isDirty(s, 'g', k)).length;
  const t = T(s);
  if (s.type === 'group' && t.items) {
    t.items.forEach((it, i) => s.itemKeys.forEach(k => { if (isDirty(s, String(i), k)) n++; }));
    n += Math.abs(t.items.length - defaultItems(s).length);
  }
  if (tempTpl[s.id]) n++; // template diubah (sementara)
  return n;
}
// Setelah default bersama berubah: buang perubahan sementara yang ternyata sudah sama
function pruneTemp(s) {
  if (tempTpl[s.id] && sameTpl(tempTpl[s.id], defTpl(s))) delete tempTpl[s.id];
  if (!temp[s.id]) return;
  const bag = bagOf(s);
  for (const k of Object.keys(bag)) if (bag[k] === defaultOf(s, 'g', k)) delete bag[k];
  if (s.type === 'group') normalizeItems(s);
}
// Key Firebase tidak boleh berisi . # $ [ ] /
const encKey = k => k.replace(/[.#$[\]/%]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const decKey = k => k.replace(/%([0-9A-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
const encObj = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [encKey(k), String(v ?? '')]));
const decObj = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [decKey(k), String(v ?? '')]));
function decodeShared(s, raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.ver !== TEMPLATE_VERSION) return null; // default dari versi format lama → abaikan
  const out = { ts: raw.ts, by: raw.by || '' };
  const lines = v => (typeof v === 'string' ? v.split('\n').filter(Boolean) : undefined);
  if (typeof raw.tpl === 'string') out.tpl = raw.tpl;
  if (typeof raw.itemTpl === 'string') out.itemTpl = raw.itemTpl;
  out.cv = lines(raw.cv); out.cvi = lines(raw.cvi);
  if (s.type === 'group') {
    out.g = decObj(raw.g);
    const n = typeof raw.n === 'number' ? raw.n : 0;
    out.items = Array.from({ length: n }, (_, i) => decObj(raw.items?.[i]));
  } else out.v = decObj(raw.v);
  return out;
}
function defaultPayload(s) {
  const sh = shared[s.id]; const shBag = sh && (s.type === 'group' ? sh.g : sh.v);
  const g = {};
  for (const k of s.keys) {
    // var waktu otomatis (Current Date) tidak dibekukan kecuali memang diubah
    if (s.metaMap[k].now && !isDirty(s, 'g', k) && !(shBag && k in shBag)) continue;
    g[k] = val(s, 'g', k);
  }
  // template + variabel tambahan (hanya disimpan kalau beda dari bawaan)
  const e = effTpl(s), tp = {};
  if (e.tpl !== s.baseTpl) tp.tpl = e.tpl;
  if (s.type === 'group' && e.itemTpl !== s.baseItemTpl) tp.itemTpl = e.itemTpl;
  if (e.cv.length) tp.cv = e.cv.join('\n');
  if (e.cvi.length) tp.cvi = e.cvi.join('\n');
  if (s.type !== 'group') return { v: encObj(g), ...tp };
  const items = itemsOf(s).map(it => encObj(Object.fromEntries(s.itemKeys.map(k => [k, it?.[k] ?? '']))));
  return { g: encObj(g), items, n: items.length, ...tp };
}

// ------------------------------------------------------------ mesin template
/**
 * mode: 'raw' (template dgn {var}), 'filled' (sudah terisi, dgn penanda), 'plain' (teks final utk WA)
 * opt.hl: tampilkan penanda "kosong" utk var kosong; opt.noMark: tanpa penanda (utk salin template)
 */
function build(s, mode, opt = {}) {
  const refs = [];
  const noMark = mode === 'plain' || opt.noMark;
  const mark = (scope, key, text) => {
    if (noMark) return text;
    const n = refs.push({ scope: String(scope), key }) - 1;
    const showEmpty = text === '' && opt.hl && mode === 'filled' && !metaOf(String(scope), key)?.optional;
    return M0 + n + M2 + (showEmpty ? ME : text) + M1;
  };
  const isComputed = k => !!(s.computed && k in s.computed);
  const metaOf = (scope, k) => (scope === 'c' ? null : scope === 'g' ? s.metaMap[k] : s.itemMeta?.[k]);
  const sub = (scope, k) => {
    const sc = isComputed(k) ? 'c' : scope;
    return mark(sc, k, mode === 'raw' ? `{${k}}` : String(val(s, sc, k)));
  };
  const fill = (tpl, scope) => {
    // "LAPORAN / UPDATE {n}" → "LAPORAN" (n kosong) atau "UPDATE n"
    if (mode !== 'raw') {
      tpl = tpl.replace(/LAPORAN \/ UPDATE \{([^{}\n]+)\}( -)?/g, (m, k, dash) => {
        const sc = isComputed(k) ? 'c' : scope;
        const n = String(val(s, sc, k)).trim();
        return n && !/^0+([.,]0+)?$/.test(n) ? `UPDATE {${k}}${dash || ''}` : 'LAPORAN';
      });
    }
    const out = [];
    for (const line of tpl.split('\n')) {
      if (mode !== 'raw') {
        const lk = [...line.matchAll(PH)].map(m => m[1]).find(k => metaOf(scope, k)?.list);
        if (lk) { // satu baris template diulang per baris isian
          const rows = String(val(s, scope, lk)).split('\n').map(x => x.trim()).filter(Boolean);
          if (!rows.length) { if (mode === 'filled' && opt.hl) out.push(mark(scope, lk, '')); continue; }
          for (const r of rows) out.push(line.replace(PH, (m, k) => (k === lk ? mark(scope, k, r) : sub(scope, k))));
          continue;
        }
      }
      out.push(line.replace(PH, (m, k) => sub(scope, k)));
    }
    return out.join('\n');
  };

  let text = fill(s.tpl, 'g');
  if (s.type === 'group') {
    const items = itemsOf(s);
    let block, ids;
    if (mode === 'raw') {
      block = [0, 1].map(i => fill(s.itemTpl.replace('{No}', i + 1), String(i))).join('\n\n') + '\n\n3. ...';
      ids = [0, 1].map(i => '> `' + mark(i, 'Incident ID', `{Incident ID ${i + 1}}`) + '`').concat('> `...`').join('\n');
    } else {
      block = items.map((it, i) => fill(s.itemTpl.replace('{No}', i + 1), String(i))).join('\n\n');
      ids = items.map((it, i) => {
        const id = String(val(s, String(i), 'Incident ID'));
        if (!id && !(mode === 'filled' && opt.hl)) return null;
        return '> `' + mark(i, 'Incident ID', id) + '`';
      }).filter(x => x !== null).join('\n');
    }
    text = text.replace('[[ITEMS]]', () => block).replace('[[IDS]]', () => ids);
  }
  if (mode !== 'raw') text = tidy(text);
  return { text, refs };
}
const EMPTY_MARK_SPACES = new RegExp(' (' + M0 + '\\d+' + M2 + M1 + ') ', 'g');
function tidy(t) {
  return t.split('\n')
    .map(l => l.replace(/(\S) {2,}(?=\S)/g, '$1 ').replace(EMPTY_MARK_SPACES, ' $1').replace(/[ \t]+$/, ''))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Penanda yang terbuka di akhir baris ditutup & dibuka lagi di baris berikutnya
function balanceLines(s) {
  let open = null;
  return s.split('\n').map(line => {
    const l = (open != null ? M0 + open + M2 : '') + line;
    const re = new RegExp(M0 + '(\\d+)' + M2 + '|' + M1, 'g');
    let m, cur = null;
    while ((m = re.exec(l))) cur = m[1] != null ? m[1] : null;
    open = cur;
    return cur != null ? l + M1 : l;
  }).join('\n');
}

/** Render teks ala WhatsApp: *bold*, _italic_, ~coret~, `kode`, ```mono```, > kutipan */
function waHTML(text) {
  let h = esc(balanceLines(text));
  const toks = [];
  const tok = html => '' + (toks.push(html) - 1) + '';
  h = h.replace(/```([\s\S]+?)```/g, (m, c) => tok(`<span class="wa-pre">${c}</span>`));
  h = h.replace(/`([^`\n]+)`/g, (m, c) => tok(`<code class="wa-code">${c}</code>`));
  const style = (ch, tag) => {
    const e = ch === '*' ? '\\*' : ch;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}${e}])${e}(?=[^\\s${e}])([^\\n]*?[^\\s${e}])${e}(?=$|[^\\p{L}\\p{N}${e}])`, 'gmu');
    h = h.replace(re, (m, p, c) => `${p}<${tag}>${c}</${tag}>`);
  };
  style('*', 'b'); style('_', 'i'); style('~', 's');
  let out = '', inQ = false;
  for (const ln of h.split('\n')) {
    const q = /^&gt; ?/.test(ln);
    const body = q ? ln.replace(/^&gt; ?/, '') : ln;
    if (q && !inQ) { out += '<div class="wa-quote">'; inQ = true; }
    if (!q && inQ) { out += '</div>'; inQ = false; }
    out += `<div class="ln">${body}</div>`;
  }
  if (inQ) out += '</div>';
  return markersToHTML(out.replace(/(\d+)/g, (m, i) => toks[i]), 'v');
}
function markersToHTML(h, cls) {
  return h.replace(new RegExp(M0 + '(\\d+)' + M2, 'g'), (m, n) => `<span class="${cls}" data-r="${n}">`)
    .replace(new RegExp(M1, 'g'), '</span>')
    .replace(new RegExp(ME, 'g'), '<span class="empty">kosong</span>');
}
const rawHTML = text => markersToHTML(esc(text), 'ph');
const plainPH = text => esc(text).replace(/\{([^{}\n]+)\}/g, '<span class="ph">{$1}</span>');

// ------------------------------------------------------------ router (URL per slide)
function parseHash() {
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { view: p[0], sid: p[1] };
}
function route() {
  curHash = location.hash;
  const { view, sid } = parseHash();
  if (view !== 'desktop' && view !== 'mobile') { state.view = null; state.idx = -1; renderLanding(); return; }
  const idx = SLIDES.findIndex(s => s.id === sid);
  if (idx < 0) { location.replace(`#/${view}/${SLIDES[0].id}`); return; }
  const dir = state.view === view && state.idx >= 0 ? Math.sign(idx - state.idx) : 0;
  state.view = view; state.idx = idx; state.active = null;
  LS.set('view', view); LS.set('slide', SLIDES[idx].id);
  renderSlide(dir);
}
function go(i) {
  if (i < 0 || i >= SLIDES.length || !state.view) return;
  location.hash = `#/${state.view}/${SLIDES[i].id}`;
}
const cur = () => SLIDES[state.idx];

// ------------------------------------------------------------ landing
function renderLanding() {
  document.title = 'Format Lab · Laporan Situasi';
  const last = LS.get('slide', SLIDES[0].id);
  const sid = SLIDES.some(s => s.id === last) ? last : SLIDES[0].id;
  const phone = isPhone();
  const rec = '<span class="rec">Disarankan</span>';
  app.innerHTML = `
  <div class="landing">
    <div class="land-inner">
      <div class="badge"><span class="logo">◆</span> Format Lab</div>
      <h1>Uji format laporan <span class="grad">WhatsApp</span> secara realtime</h1>
      <p class="lead">Isi variabel, lihat hasil pesan WA langsung berubah, lalu kirim masukkan supaya tim bisa ikut melihat.</p>
      <div class="choices">
        <a class="choice" href="#/desktop/${sid}">
          ${!phone ? rec : ''}
          <span class="c-ico">💻</span>
          <b>Desktop / Laptop</b>
          <span>3 panel berdampingan: hasil format WA, template, dan input variabel.</span>
          <span class="c-go">Masuk →</span>
        </a>
        <a class="choice" href="#/mobile/${sid}">
          ${phone ? rec : ''}
          <span class="c-ico">📱</span>
          <b>Mobile Phone</b>
          <span>1 kotak format + tombol <i>Format ⇄ Realcase</i>, input variabel di bawahnya.</span>
          <span class="c-go">Masuk →</span>
        </a>
      </div>
      <div class="land-list">
        <small>${SLIDES.length} slide tersedia</small>
        <div>${SLIDES.map(s => `<a class="mini" style="--c:${s.accent}" href="#/${phone ? 'mobile' : 'desktop'}/${s.id}">${s.icon} ${esc(s.title)}</a>`).join('')}</div>
      </div>
    </div>
  </div>`;
}

// ------------------------------------------------------------ potongan UI
const connHTML = () => '<span class="conn" data-conn><i></i><span>…</span></span>';
const hlToggle = () => `<button type="button" class="btn sm toggle ${state.hl ? 'on' : ''}" data-act="hl" aria-pressed="${state.hl}" title="Tandai bagian hasil yang berasal dari variabel">◐ Tandai var</button>`;
const timeNow = () => { const d = new Date(Date.now() + 7 * 3600e3); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
function viewSwitch(s, compact) {
  const d = state.view === 'desktop';
  return `<div class="vswitch" role="group" aria-label="Pilih tampilan">
    <a href="#/desktop/${s.id}" class="${d ? 'on' : ''}" title="Tampilan Desktop">💻${compact ? '' : ' Desktop'}</a>
    <a href="#/mobile/${s.id}" class="${d ? '' : 'on'}" title="Tampilan Mobile">📱${compact ? '' : ' Mobile'}</a></div>`;
}

function varRow(s, scope, key) {
  const meta = scope === 'g' ? s.metaMap[key] : s.itemMeta[key];
  const value = val(s, scope, key);
  const ph = meta.ph || builtinOf(s, scope, key) || (scope !== 'g' ? (s.defaultItems?.[0]?.[key] || '') : '') || meta.hint || '';
  const id = 'v' + (++uid);
  return `<div class="var ${isDirty(s, scope, key) ? 'dirty' : ''}" data-scope="${scope}" data-k="${esc(key)}">
    <div class="var-top">
      <label class="var-label" for="${id}">${esc(meta.label)}</label>
      <div class="var-actions">
        ${meta.now ? '<button type="button" class="ic" data-act="now" title="Isi waktu sekarang">🕒</button>' : ''}
        <button type="button" class="ic" data-act="reset" title="Kembalikan ke default">↺</button>
        ${meta.strict ? '' : '<button type="button" class="ic" data-act="clear" title="Kosongkan">✕</button>'}
      </div>
    </div>
    <code class="var-key">{${esc(key)}}</code>
    <div class="var-field">
      <textarea id="${id}" rows="1" class="var-input${meta.strict ? ' strict' : ''}" spellcheck="false" placeholder="${esc(meta.strict ? 'Pilih salah satu di bawah' : ph)}"${meta.strict ? ' readonly' : ''}>${esc(value)}</textarea>
      <button type="button" class="dirty-ic" data-act="dirty-info" title="Perubahan sementara" aria-label="Perubahan sementara — ketuk untuk info">!</button>
    </div>
    ${meta.options ? `<div class="var-opts">${meta.options.map(o => `<button type="button" class="opt ${String(value) === o ? 'on' : ''}" data-act="opt" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}
    ${meta.hint ? `<div class="var-hint">${esc(meta.hint)}</div>` : ''}
  </div>`;
}
function varsHTML(s) {
  if (s.type !== 'group') return s.keys.map(k => varRow(s, 'g', k)).join('');
  const items = itemsOf(s), nDef = defaultItems(s).length;
  let h = `<div class="var-group"><div class="vg-title">Umum</div>${s.keys.map(k => varRow(s, 'g', k)).join('')}</div>`;
  h += `<div class="var-group computed"><div class="vg-title">Otomatis dari daftar lokasi</div>${Object.keys(s.computed).map(k => `
    <div class="var comp" data-scope="c" data-k="${esc(k)}">
      <div class="var-top"><span class="var-label">${esc(s.computedLabels[k] || k)}</span><span class="tag">auto</span></div>
      <code class="var-key">{${esc(k)}}</code>
      <div class="computed-val" data-k="${esc(k)}"></div>
    </div>`).join('')}</div>`;
  h += items.map((it, i) => `<div class="var-group item">
      <div class="vg-title"><span>📍 Lokasi ${i + 1}${i >= nDef ? ' <span class="tag warn">baru · sementara</span>' : ''}</span><button type="button" class="btn sm ghost danger" data-act="del-item" data-i="${i}">Hapus</button></div>
      ${s.itemKeys.map(k => varRow(s, String(i), k)).join('')}
    </div>`).join('');
  h += '<button type="button" class="btn add-item" data-act="add-item">＋ Tambah lokasi</button>';
  return h;
}
const varCount = s => s.type === 'group' ? `${s.keys.length} umum · ${itemsOf(s).length} lokasi` : `${s.keys.length} variabel`;
const varsFootHTML = () => `<div class="vars-foot" id="varsFoot">
    <div class="vf-info"><span class="vf-count"></span><small class="vf-meta"></small></div>
    <div class="vf-btns">
      <button type="button" class="btn sm ghost" data-act="load-builtin" title="Isi semua dengan contoh bawaan (sementara)">Contoh bawaan</button>
      <button type="button" class="btn primary vf-save" data-act="set-default" title="Simpan isian sekarang sebagai default untuk semua orang">💾 Set to Default</button>
    </div>
  </div>`;
const varsNote = '<p class="note">✏️ Perubahan bersifat <b>sementara</b> (ditandai <span class="dirty-ic demo">!</span>). Tekan <b>Set to Default</b> di bawah untuk menyimpan sebagai default bersama.</p>';

// ---- Edit Template: tombol, editor, palet variabel
const editing = s => state.edit?.sid === s.id;
const BLOCKS = { ITEMS: '📍 Daftar Lokasi', IDS: '🆔 Daftar Incident ID' };
function tplBtns(s) {
  return editing(s)
    ? '<button type="button" class="btn sm ghost" data-act="tpl-cancel">Batal</button><button type="button" class="btn sm tpl-btn save" data-act="tpl-save">💾 Save</button>'
    : '<button type="button" class="btn sm tpl-btn" data-act="tpl-edit">✏️ Edit Template</button>';
}
const tplFlag = s => (tempTpl[s.id] && !editing(s) ? '<span class="tpl-flag-wrap"><button type="button" class="dirty-ic tpl-flag" data-act="tpl-info" title="Template diubah (sementara)" aria-label="Template diubah sementara — ketuk untuk info">!</button></span>' : '');
function tokLabel(s, ed, k, kind) {
  if (kind === 'blk') return BLOCKS[k] || k;
  if (kind === 'no') return 'No.';
  if (kind === 'c') return (s.computedLabels?.[k] || k).replace(/\s*\(.*$/, '') + ' ·auto';
  const m = ed === 'item' ? s.itemMeta[k] : s.metaMap[k];
  return m?.label || autoMeta(k).label;
}
function tokHTML(s, ed, k, kind) {
  return `<span class="tk tk-${kind}" contenteditable="false" draggable="false" data-ed="${ed}" data-kind="${kind}" data-k="${esc(k)}" title="${esc(kind === 'blk' ? `[[${k}]]` : `{${k}}`)}">${esc(tokLabel(s, ed, k, kind))}<span class="tk-x" data-act="tk-del" title="Keluarkan dari template">×</span></span>`;
}
const TOKEN_RE = /\{([^{}\n]+)\}|\[\[(ITEMS|IDS)\]\]/g;
function edHTML(s, text, ed) {
  let h = '', last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    h += esc(text.slice(last, m.index));
    const kind = m[2] ? 'blk' : ed === 'item' ? (m[1] === 'No' ? 'no' : 'v') : (isComp(s, m[1]) ? 'c' : 'v');
    h += tokHTML(s, ed, m[2] || m[1], kind);
    last = m.index + m[0].length;
  }
  return h + esc(text.slice(last)) + '\n'; // "\n" penjaga supaya Enter di baris terakhir terlihat
}
function editorsHTML(s) {
  const d = state.edit.draft, grp = s.type === 'group';
  return `<p class="note ed-note">✏️ <b>Mode edit.</b> Ketik untuk mengubah teks · <b>seret</b> variabel untuk memindah · seret ke daftar variabel atau klik <b>×</b> untuk mengeluarkan.</p>
    ${grp ? '<div class="ed-label">Template utama</div>' : ''}
    <div class="tpl-ed" contenteditable="true" spellcheck="false" data-ed="main" aria-label="Editor template">${edHTML(s, d.tpl, 'main')}</div>
    ${grp ? `<div class="ed-label">Template per lokasi <small>diulang untuk setiap lokasi di ${BLOCKS.ITEMS}</small></div>
    <div class="tpl-ed" contenteditable="true" spellcheck="false" data-ed="item" aria-label="Editor template per lokasi">${edHTML(s, d.itemTpl, 'item')}</div>` : ''}`;
}
function countTok(text, tok) { return text.split(tok).length - 1; }
function palChipsHTML(s) {
  const d = state.edit.draft, kv = knownVars(s, d), grp = s.type === 'group';
  const chip = (ed, k, kind, src) => {
    const n = countTok(ed === 'item' ? d.itemTpl : d.tpl, kind === 'blk' ? `[[${k}]]` : `{${k}}`);
    const custom = (ed === 'item' ? d.cvi : d.cv).includes(k);
    return `<span class="pal-chip ${n ? 'used' : 'unused'} pk-${kind}" draggable="false" data-ed="${ed}" data-kind="${kind}" data-k="${esc(k)}" title="${esc(kind === 'blk' ? `[[${k}]]` : `{${k}}`)}">${esc(tokLabel(s, ed, k, kind))}${n ? `<em>${n}×</em>` : ''}${custom && !n ? `<span class="tk-x" data-act="tpl-delvar" title="Hapus variabel tambahan">×</span>` : ''}</span>`;
  };
  let h = `<div class="pal-group"><div class="pal-title">${grp ? 'Variabel umum' : 'Variabel'}</div><div class="pal-list">`;
  if (grp) h += Object.keys(BLOCKS).map(k => chip('main', k, 'blk')).join('') + Object.keys(s.computed).map(k => chip('main', k, 'c')).join('');
  h += kv.g.map(k => chip('main', k, 'v')).join('') + '</div></div>';
  if (grp) h += `<div class="pal-group"><div class="pal-title">Variabel per lokasi</div><div class="pal-list">${chip('item', 'No', 'no')}${kv.i.map(k => chip('item', k, 'v')).join('')}</div></div>`;
  return h;
}
function paletteHTML(s) {
  const grp = s.type === 'group';
  return `<div class="pal" data-drop="out">
    <div class="pal-head"><b>Daftar variabel</b><small>Seret ke template · ketuk untuk menyisipkan di posisi kursor · <span class="pal-legend"><i class="lg used"></i>terpakai <i class="lg unused"></i>belum dipakai</span></small></div>
    <div class="pal-chips">${palChipsHTML(s)}</div>
    <div class="pal-new">
      <input class="pal-input" maxlength="60" placeholder="Nama variabel baru, mis. Korban Jiwa" aria-label="Nama variabel baru">
      ${grp ? '<select class="pal-scope" aria-label="Jenis variabel"><option value="main">Umum</option><option value="item">Per lokasi</option></select>' : ''}
      <button type="button" class="btn sm" data-act="tpl-addvar">＋ Tambah variabel</button>
    </div>
    <div class="pal-foot"><button type="button" class="btn sm ghost" data-act="tpl-builtin" title="Kembalikan isi editor ke template bawaan">↺ Template bawaan</button></div>
  </div>`;
}
function rawPanelHTML(s) {
  const ed = editing(s);
  return `<section class="panel p-raw ${ed ? 'editing' : ''}">
      <div class="panel-head"><span class="pdot"></span><h2>Template Format</h2>${tplFlag(s)}
        <div class="head-actions">${ed ? '' : '<button type="button" class="btn sm" data-act="copy-raw">⧉ Salin</button>'}${tplBtns(s)}</div></div>
      <div class="panel-body">${ed ? editorsHTML(s) : `<pre id="raw" class="raw"></pre>
        <p class="legend">Klik <span class="ph">{variabel}</span> untuk langsung mengisinya di panel kanan.</p>`}</div>
      ${ed ? paletteHTML(s) : ''}
    </section>`;
}

function formHTML(s) {
  const req = s.type === 'request';
  return `<form class="fb-form" autocomplete="off" novalidate>
    <div class="fb-field">
      <textarea class="fb-text" name="teks" maxlength="${MAX_TEXT}" rows="2" placeholder="${req ? 'waktu kejadian, area kejadian, ...' : 'Tulis masukkan untuk format ini…'}"></textarea>
      <span class="fb-count">0/${MAX_TEXT}</span>
    </div>
    <input class="fb-name" name="nama" maxlength="40" placeholder="Nama (opsional)" value="${esc(LS.get('nama', ''))}">
    <button class="btn primary fb-submit" type="submit">Kirim <span aria-hidden="true">➤</span></button>
  </form>
  <p class="helper">👉 Setelah menulis ${req ? 'field' : 'masukkan'}, <b>tekan tombol Kirim</b> supaya tersimpan &amp; terlihat semua orang. <span class="kbd">Ctrl</span>+<span class="kbd">Enter</span> juga bisa.</p>`;
}
function feedbackHTML(s) {
  return `<section class="feedback card" id="feedback">
    <div class="fb-head">
      <div><h3>💬 Masukkan untuk format ${esc(s.title)} <span class="count" id="fbCount"></span></h3>
      <p class="sub">Hanya kotak ini yang disimpan ke database — perubahan variabel di atas tidak dikirim.</p></div>
      <div class="fb-tools">${connHTML()}<button type="button" class="btn sm ghost" data-act="refresh" title="Ambil ulang dari database">⟳ Refresh</button></div>
    </div>
    ${formHTML(s)}
    <div id="fbStatus"></div>
    <ul class="fb-list" id="fbList"></ul>
  </section>`;
}

function desktopBody(s) {
  return `<div class="grid3">
    <section class="panel p-filled">
      <div class="panel-head"><span class="pdot ok"></span><h2>Hasil · Realcase</h2><span class="sub" id="charCount"></span>
        <div class="head-actions">${hlToggle()}<button type="button" class="btn sm" data-act="copy-filled">⧉ Salin</button><a class="btn sm wa" data-act="wa" target="_blank" rel="noopener" href="#">WA ↗</a></div></div>
      <div class="panel-body wa-chat"><div class="wa-bubble"><div id="filled" class="wa-text"></div><div class="wa-meta">${timeNow()} <span class="ticks">✓✓</span></div></div></div>
    </section>
    ${rawPanelHTML(s)}
    <section class="panel p-vars">
      <div class="panel-head"><span class="pdot"></span><h2>Input Variabel</h2><span class="sub" id="varCount">${varCount(s)}</span>
        <div class="head-actions"><button type="button" class="btn sm ghost" data-act="reset-all" title="Batalkan semua perubahan sementara">↺ Batalkan</button><button type="button" class="btn sm ghost" data-act="clear-all" title="Kosongkan semua">✕ Kosongkan</button></div></div>
      <div class="panel-body">${varsNote}<div id="vars" class="vars">${varsHTML(s)}</div></div>
      ${varsFootHTML()}
    </section>
  </div>
  ${feedbackHTML(s)}`;
}

function mobileFormatHTML(s) {
  const real = state.mmode === 'real' && !editing(s);
  if (editing(s)) {
    return `<section class="card m-format editing">
    <div class="card-head"><div><h2>Edit Template</h2><small>Ubah teks & susun ulang variabel</small></div>
      <div class="head-actions">${tplBtns(s)}</div></div>
    ${editorsHTML(s)}
    ${paletteHTML(s)}
  </section>`;
  }
  return `<section class="card m-format">
    <div class="card-head">
      <div><h2>${real ? 'Contoh / Realcase' : 'Format'}${tplFlag(s)}</h2><small>${real ? 'Pesan WA setelah variabel diisi' : 'Template dengan {variabel}'}</small></div>
      <div class="seg" role="group" aria-label="Mode tampilan">
        <button type="button" data-mmode="format" class="${real ? '' : 'on'}" aria-pressed="${!real}">Format</button>
        <button type="button" data-mmode="real" class="${real ? 'on' : ''}" aria-pressed="${real}">Realcase</button>
      </div>
    </div>
    ${real
      ? `<div class="wa-chat m"><div class="wa-bubble"><div id="filled" class="wa-text"></div><div class="wa-meta">${timeNow()} <span class="ticks">✓✓</span></div></div></div>`
      : '<div class="m-raw"><pre id="raw" class="raw"></pre></div>'}
    <div class="card-actions">
      ${real
        ? `${hlToggle()}<span class="sub" id="charCount"></span><span class="grow"></span><button type="button" class="btn sm" data-act="copy-filled">⧉ Salin</button><a class="btn sm wa" data-act="wa" target="_blank" rel="noopener" href="#">WA ↗</a>`
        : `${tplBtns(s)}<span class="grow"></span><button type="button" class="btn sm" data-act="copy-raw">⧉ Salin</button>`}
    </div>
  </section>`;
}
function mobileBody(s) {
  return `${mobileFormatHTML(s)}
  <section class="card m-vars">
    <div class="card-head">
      <div><h2>Variabel <span class="sub" id="varCount">${varCount(s)}</span></h2><small>Semua isian berupa teks</small></div>
      <div class="head-actions"><button type="button" class="btn sm ghost" data-act="reset-all" title="Batalkan semua perubahan">↺ Batalkan</button><button type="button" class="btn sm ghost" data-act="clear-all" title="Kosongkan semua">✕</button></div>
    </div>
    ${varsNote}
    <div id="vars" class="vars">${varsHTML(s)}</div>
    ${varsFootHTML()}
  </section>
  ${feedbackHTML(s)}`;
}

function requestHTML(s) {
  return `<div class="req">
    <section class="card req-hero">
      <div class="req-top"><span class="big-ico">${s.icon}</span>
        <div><span class="tag warn">Format belum ada</span><h2>Bantu susun format laporan Tanah Longsor</h2>
        <p>Field apa saja yang perlu ada di laporannya? Tulis nama field, <b>pisahkan dengan koma</b>.</p></div></div>
      <div class="ex">Contoh: <code>waktu kejadian, area kejadian, penyebab longsor, ...</code></div>
      <div class="ex-chips"><small>Ketuk untuk menambahkan:</small>${s.examples.map(e => `<button type="button" class="chip-add" data-act="add-field" data-f="${esc(e)}">＋ ${esc(e)}</button>`).join('')}</div>
      ${formHTML(s)}
    </section>
    <div class="req-grid">
      <section class="card"><div class="card-head"><div><h3>📊 Rekap field</h3><small>Dihitung dari semua masukkan yang masuk</small></div></div><div id="tally" class="tally"></div></section>
      <section class="card"><div class="card-head"><div><h3>📝 Draf format otomatis</h3><small>Disusun dari field yang paling banyak diusulkan</small></div><button type="button" class="btn sm" data-act="copy-draft">⧉ Salin</button></div><pre id="draft" class="raw"></pre></section>
    </div>
    <section class="card feedback" id="feedback">
      <div class="fb-head"><div><h3>🗂️ Semua masukkan <span class="count" id="fbCount"></span></h3><p class="sub">Realtime dari Firebase.</p></div>
        <div class="fb-tools">${connHTML()}<button type="button" class="btn sm ghost" data-act="refresh">⟳ Refresh</button></div></div>
      <div id="fbStatus"></div>
      <ul class="fb-list" id="fbList"></ul>
    </section>
  </div>`;
}

function desktopShell(s, prev, next, body, anim) {
  return `<div class="shell desktop" style="--accent:${s.accent}">
    <header class="topbar">
      <a class="brand" href="#/" title="Kembali ke pilihan tampilan"><span class="logo">◆</span><span class="b-txt">Format Lab</span></a>
      <div class="nav">
        <button type="button" class="navbtn" data-go="${state.idx - 1}" ${prev ? '' : 'disabled'} title="Sebelumnya (←)"><span class="arr">‹</span><span class="nb-txt">${prev ? esc(prev.title) : 'Awal'}</span></button>
        <div class="slide-title"><span class="s-ico">${s.icon}</span><div><h1>${esc(s.title)}</h1><small>Slide ${state.idx + 1} dari ${SLIDES.length}${s.note ? ' · ' + esc(s.note) : ''}</small></div></div>
        <button type="button" class="navbtn" data-go="${state.idx + 1}" ${next ? '' : 'disabled'} title="Berikutnya (→)"><span class="nb-txt">${next ? esc(next.title) : 'Akhir'}</span><span class="arr">›</span></button>
      </div>
      <div class="top-right">${connHTML()}${viewSwitch(s)}</div>
    </header>
    <nav class="chips" aria-label="Daftar slide">${SLIDES.map((x, i) => `<button type="button" class="chip ${i === state.idx ? 'on' : ''}" data-go="${i}" style="--c:${x.accent}">${x.icon} ${esc(x.title)}</button>`).join('')}</nav>
    <main class="stage ${anim}">${body}</main>
    <footer class="foot">Tekan <span class="kbd">←</span> <span class="kbd">→</span> untuk pindah slide · URL slide ini bisa langsung dibagikan &amp; tetap di slide yang sama saat di-refresh.</footer>
  </div>`;
}
function mobileShell(s, prev, next, body, anim) {
  return `<div class="shell mobile" style="--accent:${s.accent}">
    <header class="m-top"><a class="brand" href="#/"><span class="logo">◆</span><span class="b-txt">Format Lab</span></a><div class="top-right">${connHTML()}${viewSwitch(s, true)}</div></header>
    <div class="m-title"><span class="s-ico">${s.icon}</span><div><h1>${esc(s.title)}</h1><small>Slide ${state.idx + 1} dari ${SLIDES.length}${s.note ? ' · ' + esc(s.note) : ''}</small></div></div>
    <main class="stage ${anim}">${body}</main>
    <div id="peek" class="peek" hidden><div class="peek-label">Pratinjau langsung</div><div class="peek-body wa-text"></div></div>
    <nav class="m-bottom" aria-label="Navigasi slide">
      <button type="button" class="m-nav" data-go="${state.idx - 1}" ${prev ? '' : 'disabled'} aria-label="Slide sebelumnya">‹</button>
      <label class="m-select-wrap"><span>${s.icon} ${esc(s.short || s.title)} <em>${state.idx + 1}/${SLIDES.length}</em> ▾</span>
        <select class="m-select" aria-label="Pilih slide">${SLIDES.map((x, i) => `<option value="${i}" ${i === state.idx ? 'selected' : ''}>${x.icon} ${esc(x.title)}</option>`).join('')}</select></label>
      <button type="button" class="m-nav" data-go="${state.idx + 1}" ${next ? '' : 'disabled'} aria-label="Slide berikutnya">›</button>
    </nav>
  </div>`;
}

// ------------------------------------------------------------ render slide
function renderSlide(dir) {
  const s = cur();
  document.title = `${s.title} · Format Lab`;
  const prev = SLIDES[state.idx - 1], next = SLIDES[state.idx + 1];
  const anim = dir > 0 ? 'anim-next' : dir < 0 ? 'anim-prev' : 'anim-fade';
  const body = s.type === 'request' ? requestHTML(s) : (state.view === 'desktop' ? desktopBody(s) : mobileBody(s));
  app.innerHTML = state.view === 'desktop' ? desktopShell(s, prev, next, body, anim) : mobileShell(s, prev, next, body, anim);
  if (s.type !== 'request') { renderPreviews(); growAll(); updateVarsFoot(); }
  subscribe(s.id);
  renderFb(); updateConn();
  window.scrollTo(0, 0);
  const chip = $('.chip.on'); chip && chip.scrollIntoView({ block: 'nearest', inline: 'center' });
}

let rafId = 0;
function schedule() { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(() => { renderPreviews(); updatePeek(); }); }

function renderPreviews() {
  const s = cur(); if (!s || s.type === 'request') return;
  const fEl = $('#filled'), rEl = $('#raw');
  if (fEl) { const b = build(s, 'filled', { hl: state.hl }); fEl.innerHTML = waHTML(b.text); fEl._refs = b.refs; fEl.classList.toggle('nohl', !state.hl); }
  if (rEl) { const b = build(s, 'raw'); rEl.innerHTML = rawHTML(b.text); rEl._refs = b.refs; }
  const plain = build(s, 'plain').text;
  const cc = $('#charCount'); if (cc) cc.textContent = plain.length.toLocaleString('id-ID') + ' karakter';
  $$('a[data-act="wa"]').forEach(a => { a.href = 'https://wa.me/?text=' + encodeURIComponent(plain); });
  $$('.computed-val').forEach(el => { el.textContent = val(s, 'c', el.dataset.k) || '—'; });
  applyActive();
}
const sameRef = (r, a) => r && a && r.scope === a.scope && r.key === a.key;
function applyActive() {
  for (const box of [$('#filled'), $('#raw')]) {
    if (!box || !box._refs) continue;
    $$('[data-r]', box).forEach(el => el.classList.toggle('active', sameRef(box._refs[el.dataset.r], state.active)));
  }
}
function revealInPreview() {
  if (state.view !== 'desktop') return;
  for (const box of [$('#filled'), $('#raw')]) {
    const sp = box && $('.active', box); if (!sp) continue;
    const body = sp.closest('.panel-body'); if (!body) continue;
    const r = sp.getBoundingClientRect(), br = body.getBoundingClientRect();
    if (r.top < br.top + 12 || r.bottom > br.bottom - 12) body.scrollTo({ top: body.scrollTop + (r.top - br.top) - br.height / 3, behavior: 'smooth' });
  }
}
// Mobile: saat mengetik, tampilkan baris hasil yang memuat variabel tsb di atas layar
function updatePeek() {
  const pk = $('#peek'); if (!pk) return;
  const s = cur();
  if (!state.active || state.view !== 'mobile' || s.type === 'request') { pk.hidden = true; return; }
  const b = build(s, 'filled', { hl: true });
  const tmp = document.createElement('div'); tmp.innerHTML = waHTML(b.text);
  const lines = [];
  $$('.v', tmp).forEach(sp => {
    if (!sameRef(b.refs[sp.dataset.r], state.active)) return;
    sp.classList.add('active');
    const ln = sp.closest('.ln'); if (ln && !lines.includes(ln)) lines.push(ln);
  });
  if (!lines.length) { pk.hidden = true; return; }
  $('.peek-body', pk).innerHTML = lines.slice(0, 4).map(l => l.outerHTML).join('') + (lines.length > 4 ? `<div class="ln more">+${lines.length - 4} baris lain</div>` : '');
  pk.hidden = false;
}
function grow(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; }
function growAll() { $$('.var-input').forEach(grow); }
function rerenderVars() {
  const s = cur(), box = $('#vars'); if (!box) return;
  box.innerHTML = varsHTML(s);
  const vc = $('#varCount'); if (vc) vc.textContent = varCount(s);
  growAll(); renderPreviews(); updateVarsFoot();
}
function markRow(row) {
  const d = isDirty(cur(), row.dataset.scope, row.dataset.k);
  row.classList.toggle('dirty', d);
  if (!d) $('.dirty-pop', row)?.remove();
  const ta = $('textarea', row);
  if (ta) $$('.opt', row).forEach(o => o.classList.toggle('on', o.dataset.v === ta.value));
}
function markAllRows() { $$('#vars .var').forEach(markRow); updateVarsFoot(); }
// Default bersama berubah (dari orang lain / setelah Set to Default)
function syncInputs() {
  const s = cur(); if (!s || s.type === 'request' || !$('#vars')) return;
  if (s.type === 'group' && $$('#vars .var-group.item').length !== itemsOf(s).length) { rerenderVars(); return; }
  $$('#vars .var').forEach(row => {
    if (row.dataset.scope === 'c') return;
    const ta = $('textarea', row);
    if (ta && document.activeElement !== ta) {
      const v = String(val(s, row.dataset.scope, row.dataset.k));
      if (ta.value !== v) { ta.value = v; grow(ta); }
    }
    markRow(row);
  });
  renderPreviews(); updateVarsFoot();
}
function updateVarsFoot() {
  const el = $('#varsFoot'); const s = cur(); if (!el || !s || s.type === 'request') return;
  const n = changeCount(s);
  $('.vf-count', el).innerHTML = n ? `<span class="dirty-ic demo">!</span> <b>${n}</b> perubahan sementara` : '✓ Sesuai default';
  el.classList.toggle('has-changes', n > 0);
  const sh = shared[s.id];
  let meta;
  if (FB.status === 'unconfigured') meta = 'Default bawaan · Firebase belum disetel';
  else if (FB.status !== 'ready') meta = FB.status === 'error' ? 'Default bawaan · Firebase error' : 'Menghubungkan…';
  else if (FB.defErr) meta = '⚠️ Tidak bisa membaca default — perbarui Rules Firebase';
  else if (!sharedLoaded) meta = 'Memuat default bersama…';
  else if (sh?.ts) meta = `Default terakhir disimpan${sh.by ? ' oleh ' + sh.by : ''} · ${relTime(sh.ts)}`;
  else meta = 'Masih contoh bawaan (belum pernah di-set)';
  $('.vf-meta', el).textContent = meta;
}
function findRow(scope, key) { return $$('#vars .var').find(r => r.dataset.scope === scope && r.dataset.k === key); }
function focusVar(ref) {
  const row = findRow(ref.scope, ref.key);
  if (!row) return;
  row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  const ta = $('textarea', row);
  if (ta) { ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); }
}

// ------------------------------------------------------------ salin
async function copyText(t, msg = 'Tersalin ✓') {
  try { await navigator.clipboard.writeText(t); }
  catch {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch { /* */ } ta.remove();
  }
  toast(msg);
}
let toastT;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200);
}

// =====================================================================
//  EDIT TEMPLATE
// =====================================================================
function renderTplArea() {
  const s = cur(); if (!s || s.type === 'request') return;
  const old = state.view === 'desktop' ? $('.p-raw') : $('.m-format');
  if (old) old.outerHTML = state.view === 'desktop' ? rawPanelHTML(s) : mobileFormatHTML(s);
  renderPreviews();
}
function afterTplChange(s) {
  const sig = keySig(s); refreshSlide(s);
  if (keySig(s) !== sig) rerenderVars(); else { renderPreviews(); updateVarsFoot(); }
}
function startEdit() {
  const s = cur(); if (!s || s.type === 'request' || state.edit) return;
  const e = clone(effTpl(s));
  state.edit = { sid: s.id, init: clone(e), draft: e, last: null };
  if (state.view === 'mobile') state.mmode = 'format';
  renderTplArea();
  const ed = $('.tpl-ed'); ed?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function serializeEd(el) {
  let out = '';
  const walk = n => {
    for (const c of n.childNodes) {
      if (c.nodeType === 3) out += c.nodeValue;
      else if (c.nodeType !== 1) continue;
      else if (c.classList.contains('tk')) out += c.dataset.kind === 'blk' ? `[[${c.dataset.k}]]` : `{${c.dataset.k}}`;
      else if (c.tagName === 'BR') out += '\n';
      else {
        if (/^(DIV|P)$/.test(c.tagName) && out && !out.endsWith('\n')) out += '\n';
        walk(c);
      }
    }
  };
  walk(el);
  return out.replace(/​/g, '').replace(/\s+$/, '');
}
function readDraft() {
  if (!state.edit) return;
  const d = state.edit.draft, m = $('.tpl-ed[data-ed="main"]'), it = $('.tpl-ed[data-ed="item"]');
  if (m) d.tpl = serializeEd(m);
  if (it) d.itemTpl = serializeEd(it);
}
const editDirty = () => { if (!state.edit) return false; readDraft(); return !sameTpl(state.edit.draft, state.edit.init); };
let edT;
function edChanged() {
  clearTimeout(edT);
  edT = setTimeout(() => {
    if (!state.edit) return;
    readDraft(); afterTplChange(cur());
    const pc = $('.pal-chips'); if (pc) pc.innerHTML = palChipsHTML(cur());
  }, 120);
}
/** Selesai mengedit. save=true → simpan sebagai perubahan sementara */
function endEdit(save, render = true) {
  if (!state.edit) return;
  const s = SLIDES.find(x => x.id === state.edit.sid);
  if (save) {
    readDraft();
    const d = state.edit.draft;
    // {Nama} yang diketik manual → otomatis jadi variabel baru
    const kv = knownVars(s, { ...d, cv: [], cvi: [] });
    const base = knownVars(s, { tpl: s.baseTpl, itemTpl: s.baseItemTpl, cv: [], cvi: [] });
    d.cv = uniqArr([...d.cv, ...kv.g.filter(k => !base.g.includes(k))]);
    if (s.type === 'group') d.cvi = uniqArr([...d.cvi, ...kv.i.filter(k => !base.i.includes(k))]);
    if (sameTpl(d, defTpl(s))) delete tempTpl[s.id]; else tempTpl[s.id] = clone(d);
  }
  const changed = save && !sameTpl(state.edit.draft, state.edit.init);
  state.edit = null;
  const sig = keySig(s);
  refreshSlide(s);
  if (cur() === s) {
    if (render) { renderTplArea(); rerenderVars(); }
    else if (keySig(s) !== sig) rerenderVars();
  }
  if (save) toast(changed ? 'Template tersimpan (sementara) ✓ Tekan Set to Default supaya dipakai semua orang' : 'Tidak ada perubahan template');
}

// ---- Popup: perubahan template belum disimpan
let guardCont = null;
function guard(cont) {
  if (!state.edit) { cont(); return; }
  if (!editDirty()) { endEdit(false, false); cont(); return; }
  guardCont = cont;
  document.getElementById('guard')?.remove();
  const s = SLIDES.find(x => x.id === state.edit.sid);
  document.body.insertAdjacentHTML('beforeend', `<div class="modal-bg" id="guard">
    <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="guardT">
      <div class="modal-ico">⚠️</div>
      <h3 id="guardT">Template belum disimpan</h3>
      <p>Kamu masih mengedit template <b>${esc(s.title)}</b> dan ada perubahan yang belum di-<b>Save</b>. Kalau lanjut tanpa menyimpan, perubahan itu akan hilang.</p>
      <div class="modal-act">
        <button type="button" class="btn ghost danger" data-g="discard">Buang perubahan</button>
        <button type="button" class="btn" data-g="stay">Lanjut edit</button>
        <button type="button" class="btn primary" data-g="save">💾 Save & lanjutkan</button>
      </div>
    </div></div>`);
  $('#guard [data-g="save"]').focus();
}
function closeGuard(choice) {
  const cont = guardCont; guardCont = null;
  document.getElementById('guard')?.remove();
  if (choice === 'stay' || !cont) { $('.tpl-ed')?.focus(); return; }
  endEdit(choice === 'save', false);
  cont();
}
document.addEventListener('click', e => {
  const g = e.target.closest('#guard [data-g]');
  if (g) closeGuard(g.dataset.g);
  else if (e.target.id === 'guard') closeGuard('stay');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('guard')) closeGuard('stay'); });

// ---- Sisipkan / pindah / keluarkan token
function caretRange(x, y, ed) {
  let r = null;
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (p?.offsetNode) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); }
  } else if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(x, y);
  if (!r || !ed.contains(r.startContainer)) r = endRange(ed);
  const node = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
  const tk = node?.closest('.tk');
  if (tk && ed.contains(tk)) {
    const b = tk.getBoundingClientRect(); r = document.createRange();
    if (x < b.left + b.width / 2) r.setStartBefore(tk); else r.setStartAfter(tk);
  }
  r.collapse(true); return r;
}
function endRange(ed) {
  const r = document.createRange(), last = ed.lastChild;
  if (last?.nodeType === 3 && last.nodeValue.endsWith('\n')) r.setStart(last, last.nodeValue.length - 1);
  else if (last) r.setStartAfter(last); else r.setStart(ed, 0);
  r.collapse(true); return r;
}
function insertTok(ed, range, node) {
  range.insertNode(node);
  const r = document.createRange(); r.setStartAfter(node); r.collapse(true);
  if (document.activeElement === ed) { const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
  state.edit.last = { ed: ed.dataset.ed, range: r };
  node.classList.add('tk-pop');
  edChanged();
}
function newTokNode(chip) {
  const w = document.createElement('span');
  w.innerHTML = tokHTML(cur(), chip.dataset.ed, chip.dataset.k, chip.dataset.kind);
  return w.firstChild;
}
// Ingat posisi kursor terakhir di editor (untuk menyisipkan variabel dari palet)
function saveEdRange() {
  if (!state.edit) return;
  const sel = getSelection(); if (!sel.rangeCount) return;
  const r = sel.getRangeAt(0);
  const n = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement;
  const ed = n?.closest?.('.tpl-ed');
  if (ed) { const c = r.cloneRange(); c.collapse(false); state.edit.last = { ed: ed.dataset.ed, range: c }; }
}
document.addEventListener('selectionchange', saveEdRange);
['keyup', 'mouseup', 'input', 'focusout'].forEach(ev => app.addEventListener(ev, e => { if (e.target.closest?.('.tpl-ed')) saveEdRange(); }, true));

// Drag & drop berbasis pointer (jalan di mouse & layar sentuh)
let drag = null;
function dragTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  return { ed: el?.closest('.tpl-ed'), pal: el?.closest('.pal') };
}
function clearDragUI() {
  $$('.drag-ghost, .drop-caret').forEach(n => n.remove());
  $$('.dragging').forEach(n => n.classList.remove('dragging'));
  $$('.drop-ok, .drop-bad, .drop-out').forEach(n => n.classList.remove('drop-ok', 'drop-bad', 'drop-out'));
  document.body.classList.remove('dragging-tk');
}
document.addEventListener('pointerdown', e => {
  if (!state.edit || e.button > 0) return;
  const el = e.target.closest('.tpl-ed .tk, .pal-chip');
  if (!el || e.target.closest('.tk-x')) return;
  drag = { el, from: el.classList.contains('tk') ? 'ed' : 'pal', x: e.clientX, y: e.clientY, started: false };
  if (drag.from === 'ed') e.preventDefault();
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    drag.started = true;
    drag.el.classList.add('dragging');
    document.body.classList.add('dragging-tk');
    const gh = document.createElement('div');
    gh.className = 'drag-ghost tk tk-' + drag.el.dataset.kind;
    gh.textContent = tokLabel(cur(), drag.el.dataset.ed, drag.el.dataset.k, drag.el.dataset.kind);
    document.body.appendChild(gh);
    const ca = document.createElement('div'); ca.className = 'drop-caret'; ca.hidden = true;
    document.body.appendChild(ca);
  }
  e.preventDefault();
  drag.cx = e.clientX; drag.cy = e.clientY;
  if (!drag.raf) drag.raf = requestAnimationFrame(autoScroll);
  const gh = $('.drag-ghost'), ca = $('.drop-caret');
  gh.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`;
  const { ed, pal } = dragTarget(e.clientX, e.clientY);
  $$('.drop-ok, .drop-bad, .drop-out').forEach(n => n.classList.remove('drop-ok', 'drop-bad', 'drop-out'));
  ca.hidden = true;
  if (ed) {
    const ok = ed.dataset.ed === drag.el.dataset.ed;
    ed.classList.add(ok ? 'drop-ok' : 'drop-bad');
    if (ok) {
      const r = caretRange(e.clientX, e.clientY, ed);
      const probe = document.createElement('span'); probe.textContent = '​';
      r.insertNode(probe);
      const b = probe.getBoundingClientRect(); probe.remove();
      Object.assign(ca.style, { left: b.left - 1 + 'px', top: b.top + 'px', height: (b.height || 18) + 'px' });
      ca.hidden = false;
    }
  } else if (pal && drag.from === 'ed') pal.classList.add('drop-out');
}, { passive: false });
// Geser otomatis saat menyeret dekat tepi atas/bawah area editor
function autoScroll() {
  if (!drag?.started) return;
  const y = drag.cy, EDGE = 48, SPEED = 14;
  const body = state.view === 'desktop' ? $('.p-raw .panel-body') : null;
  if (body) {
    const r = body.getBoundingClientRect();
    if (y < r.top + EDGE && y > r.top - 60) body.scrollTop -= SPEED;
    else if (y > r.bottom - EDGE && y < r.bottom + 20) body.scrollTop += SPEED;
  } else {
    const pal = $('.m-format .pal'), bottom = pal ? pal.getBoundingClientRect().top : innerHeight;
    if (y < EDGE + 20) scrollBy(0, -SPEED);
    else if (y > bottom - EDGE && y < bottom + 10) scrollBy(0, SPEED);
  }
  drag.raf = requestAnimationFrame(autoScroll);
}
function endDrag(e, cancelled) {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.raf) cancelAnimationFrame(d.raf);
  if (!d.started) {
    clearDragUI();
    // ketuk chip palet → sisipkan di posisi kursor terakhir
    if (d.from === 'pal' && !cancelled) {
      const want = d.el.dataset.ed, ed = $(`.tpl-ed[data-ed="${want}"]`); if (!ed) return;
      const last = state.edit.last;
      const r = last && last.ed === want && ed.contains(last.range.startContainer) ? last.range : endRange(ed);
      insertTok(ed, r, newTokNode(d.el));
      toast('Variabel disisipkan ✓');
    }
    return;
  }
  const { ed, pal } = cancelled ? {} : dragTarget(e.clientX, e.clientY);
  clearDragUI();
  $$('.tpl-ed').forEach(x => x.normalize());
  if (ed) {
    if (ed.dataset.ed !== d.el.dataset.ed) { toast(d.el.dataset.ed === 'item' ? 'Variabel per lokasi hanya untuk Template per lokasi' : 'Variabel umum hanya untuk Template utama'); return; }
    const r = caretRange(e.clientX, e.clientY, ed);
    insertTok(ed, r, d.from === 'ed' ? d.el : newTokNode(d.el));
  } else if (pal && d.from === 'ed') {
    d.el.remove(); edChanged(); toast('Variabel dikeluarkan dari template');
  }
}
document.addEventListener('pointerup', e => endDrag(e, false));
document.addEventListener('pointercancel', e => endDrag(e, true));
document.addEventListener('dragstart', e => { if (e.target.closest?.('.tk, .pal-chip')) e.preventDefault(); });

function addCustomVar() {
  const s = cur(), inp = $('.pal-input'); if (!inp || !state.edit) return;
  const name = inp.value.replace(/\s+/g, ' ').trim();
  const where = $('.pal-scope')?.value || 'main';
  if (!name) { inp.focus(); toast('Tulis nama variabelnya dulu'); return; }
  if (/[{}\n]/.test(name) || /^\[\[/.test(name) || (where === 'item' && name === 'No')) { toast('Nama tidak boleh berisi { } atau [[ ]]'); return; }
  readDraft();
  const d = state.edit.draft, kv = knownVars(s, d), list = where === 'item' ? kv.i : kv.g;
  if (list.some(k => k.toLowerCase() === name.toLowerCase())) { toast('Variabel itu sudah ada di daftar'); return; }
  (where === 'item' ? d.cvi : d.cv).push(name);
  refreshSlide(s);
  inp.value = '';
  const ed = $(`.tpl-ed[data-ed="${where}"]`), last = state.edit.last;
  if (ed && last && last.ed === where && ed.contains(last.range.startContainer)) {
    insertTok(ed, last.range, newTokNode({ dataset: { ed: where, k: name, kind: 'v' } }));
    toast(`Variabel "${name}" ditambahkan di posisi kursor ✓`);
  } else {
    edChanged();
    toast(`Variabel "${name}" ditambahkan — seret ke template`);
  }
}

// ------------------------------------------------------------ event (delegasi)
app.addEventListener('click', e => {
  const goBtn = e.target.closest('[data-go]');
  if (goBtn && !goBtn.disabled) { go(+goBtn.dataset.go); return; }

  const mm = e.target.closest('[data-mmode]');
  if (mm) {
    guard(() => {
      state.mmode = mm.dataset.mmode; LS.set('mmode', state.mmode);
      const card = $('.m-format'); if (card) { card.outerHTML = mobileFormatHTML(cur()); renderPreviews(); }
    });
    return;
  }

  const span = e.target.closest('#raw [data-r], #filled [data-r]');
  if (span) { const box = span.closest('#raw, #filled'); const ref = box._refs?.[span.dataset.r]; if (ref) focusVar(ref); return; }

  const b = e.target.closest('[data-act]'); if (!b) return;
  const s = cur(); const act = b.dataset.act;
  const row = b.closest('.var');
  switch (act) {
    case 'wa': if (b.getAttribute('href') === '#') e.preventDefault(); return;
    case 'copy-filled': copyText(build(s, 'plain').text, 'Pesan WA tersalin ✓'); return;
    case 'copy-raw': copyText(build(s, 'raw', { noMark: true }).text, 'Template tersalin ✓'); return;
    case 'copy-draft': copyText(FB.draft || '', 'Draf tersalin ✓'); return;
    case 'hl':
      state.hl = !state.hl; LS.set('hl', state.hl);
      $$('[data-act="hl"]').forEach(x => { x.classList.toggle('on', state.hl); x.setAttribute('aria-pressed', state.hl); });
      renderPreviews(); return;
    case 'reset': case 'clear': case 'now': case 'opt': {
      if (!row) return;
      const ta = $('textarea', row);
      ta.value = act === 'clear' ? '' : act === 'now' ? nowWIB() : act === 'opt' ? b.dataset.v : defaultOf(s, row.dataset.scope, row.dataset.k);
      setVal(s, row.dataset.scope, row.dataset.k, ta.value); grow(ta); markAllRows(); schedule(); ta.focus();
      return;
    }
    case 'dirty-info': {
      if (!row) return;
      const open = $('.dirty-pop', row);
      $$('.dirty-pop').forEach(p => p.remove());
      if (open) return;
      const d = String(defaultOf(s, row.dataset.scope, row.dataset.k));
      $('.var-field', row).insertAdjacentHTML('beforeend', `<div class="dirty-pop" role="dialog">
        <div class="dp-msg"><b>Perubahan sementara</b>, <b>Set to Default</b> jika ingin menyimpan.</div>
        <div class="dp-def">Default saat ini: <span>${d ? esc(d) : '<i>(kosong)</i>'}</span></div>
        <div class="dp-act"><button type="button" class="btn sm ghost" data-act="reset">↺ Batalkan</button><button type="button" class="btn sm primary" data-act="set-default">💾 Set to Default</button></div>
      </div>`);
      $('.dirty-pop', row).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    case 'set-default': guard(() => { renderTplArea(); setDefault(); }); return;
    case 'reset-all':
      guard(() => {
        if (!changeCount(s)) { renderTplArea(); toast('Tidak ada perubahan — sudah sesuai default'); return; }
        if (!confirm('Batalkan semua perubahan sementara di slide ini (termasuk template)?')) { renderTplArea(); return; }
        delete temp[s.id]; delete tempTpl[s.id]; refreshSlide(s); renderTplArea(); rerenderVars(); toast('Kembali ke default');
      });
      return;
    case 'load-builtin':
      guard(() => {
        const b0 = { tpl: s.baseTpl, itemTpl: s.baseItemTpl, cv: [], cvi: [] };
        if (sameTpl(b0, defTpl(s))) delete tempTpl[s.id]; else tempTpl[s.id] = b0;
        refreshSlide(s);
        s.keys.forEach(k => setVal(s, 'g', k, builtinOf(s, 'g', k)));
        if (s.type === 'group') { T(s).items = clone(s.defaultItems); normalizeItems(s); }
        renderTplArea(); rerenderVars();
        toast(changeCount(s) ? 'Contoh bawaan dimuat (sementara) — tekan Set to Default untuk menyimpan' : 'Default sudah sama dengan contoh bawaan');
      });
      return;
    // ---- Edit Template
    case 'tpl-edit': startEdit(); return;
    case 'tpl-save': endEdit(true); return;
    case 'tpl-cancel':
      if (editDirty() && !confirm('Buang perubahan template yang belum di-Save?')) return;
      endEdit(false); return;
    case 'tk-del': {
      const tk = b.closest('.tk'); if (!tk || !state.edit) return;
      tk.remove(); edChanged(); toast('Variabel dikeluarkan dari template'); return;
    }
    case 'tpl-addvar': addCustomVar(); return;
    case 'tpl-delvar': {
      const c = b.closest('.pal-chip'); if (!c || !state.edit) return;
      const d = state.edit.draft, list = c.dataset.ed === 'item' ? 'cvi' : 'cv';
      d[list] = d[list].filter(k => k !== c.dataset.k);
      edChanged(); return;
    }
    case 'tpl-builtin': {
      if (!state.edit || !confirm('Ganti isi editor dengan template bawaan? (belum tersimpan sampai kamu tekan Save)')) return;
      Object.assign(state.edit.draft, { tpl: s.baseTpl, itemTpl: s.baseItemTpl, cv: [], cvi: [] });
      $$('.tpl-ed').forEach(ed => { ed.innerHTML = edHTML(s, ed.dataset.ed === 'item' ? s.baseItemTpl : s.baseTpl, ed.dataset.ed); });
      state.edit.last = null; edChanged(); return;
    }
    case 'tpl-info': {
      const wrap = b.closest('.tpl-flag-wrap'); const open = $('.dirty-pop', wrap);
      $$('.dirty-pop').forEach(p => p.remove());
      if (open) return;
      wrap.insertAdjacentHTML('beforeend', `<div class="dirty-pop tpl-pop" role="dialog">
        <div class="dp-msg"><b>Template diubah (sementara)</b>, <b>Set to Default</b> jika ingin menyimpan untuk semua orang.</div>
        <div class="dp-act"><button type="button" class="btn sm ghost" data-act="tpl-revert">↺ Kembalikan</button><button type="button" class="btn sm primary" data-act="set-default">💾 Set to Default</button></div>
      </div>`);
      return;
    }
    case 'tpl-revert':
      delete tempTpl[s.id]; refreshSlide(s); renderTplArea(); rerenderVars(); toast('Template dikembalikan ke default'); return;
    case 'clear-all': {
      s.keys.forEach(k => { if (!s.metaMap[k].strict) setVal(s, 'g', k, ''); });
      if (s.type === 'group') {
        T(s).items = itemsOf(s).map(it => Object.fromEntries(s.itemKeys.filter(k => s.itemMeta[k].strict).map(k => [k, it?.[k] ?? ''])));
        normalizeItems(s);
      }
      rerenderVars(); toast('Semua dikosongkan (sementara)'); return;
    }
    case 'add-item': {
      const t = T(s); if (!t.items) t.items = clone(defaultItems(s));
      t.items.push(Object.fromEntries(s.itemKeys.filter(k => s.itemMeta[k].strict).map(k => [k, String(s.itemMeta[k].def || '')])));
      rerenderVars();
      const groups = $$('.var-group.item'); const last = groups[groups.length - 1];
      if (last) { last.scrollIntoView({ block: 'start', behavior: 'smooth' }); $('textarea', last)?.focus({ preventScroll: true }); }
      return;
    }
    case 'del-item': {
      const i = +b.dataset.i;
      if (!confirm(`Hapus Lokasi ${i + 1}? (sementara, sampai Set to Default)`)) return;
      const t = T(s); if (!t.items) t.items = clone(defaultItems(s));
      t.items.splice(i, 1); normalizeItems(s); rerenderVars(); return;
    }
    case 'refresh': refreshFb(); return;
    case 'add-field': {
      const ta = $('.fb-text'); if (!ta) return;
      const f = b.dataset.f; const curv = ta.value.trim().replace(/,\s*$/, '');
      const exists = curv.split(',').map(x => x.trim().toLowerCase()).includes(f.toLowerCase());
      if (!exists) ta.value = curv ? `${curv}, ${f}` : f;
      ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
      return;
    }
  }
});

app.addEventListener('input', e => {
  const t = e.target;
  if (t.closest('.tpl-ed')) { edChanged(); return; }
  if (t.matches('.var-input')) {
    const row = t.closest('.var');
    setVal(cur(), row.dataset.scope, row.dataset.k, t.value);
    grow(t); markAllRows(); schedule(); return;
  }
  if (t.matches('.fb-text')) {
    const c = t.parentElement.querySelector('.fb-count'); if (c) c.textContent = `${t.value.length}/${MAX_TEXT}`;
    t.closest('form')?.classList.toggle('has-text', t.value.trim().length > 0);
  }
});
app.addEventListener('change', e => { if (e.target.matches('.m-select')) go(+e.target.value); });
app.addEventListener('focusin', e => {
  if (!e.target.matches('.var-input')) return;
  const row = e.target.closest('.var');
  state.active = { scope: row.dataset.scope, key: row.dataset.k };
  applyActive(); updatePeek(); revealInPreview();
});
app.addEventListener('focusout', e => {
  if (!e.target.matches('.var-input')) return;
  setTimeout(() => {
    if (document.activeElement?.matches?.('.var-input')) return;
    state.active = null; applyActive(); updatePeek();
  }, 150);
});
app.addEventListener('submit', e => { if (e.target.matches('.fb-form')) { e.preventDefault(); submitFb(e.target); } });
app.addEventListener('keydown', e => {
  if (e.target.matches('.fb-text') && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.target.form.requestSubmit(); }
  if (e.target.matches('.pal-input') && e.key === 'Enter') { e.preventDefault(); addCustomVar(); }
  if (e.target.closest('.tpl-ed')) {
    if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); }
    if ((e.ctrlKey || e.metaKey) && /^[biu]$/i.test(e.key)) e.preventDefault(); // tanpa format tebal/miring HTML
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); endEdit(true); }
  }
});
// tempel sebagai teks biasa
app.addEventListener('paste', e => {
  if (!e.target.closest?.('.tpl-ed')) return;
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
});
document.addEventListener('keydown', e => {
  if (!state.view || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.target.closest('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'ArrowLeft') go(state.idx - 1);
  if (e.key === 'ArrowRight') go(state.idx + 1);
});
// Pindah slide / tampilan saat masih mengedit template → tanya dulu
let curHash = location.hash;
window.addEventListener('hashchange', () => {
  if (state.edit && location.hash !== curHash) {
    const target = location.hash;
    history.replaceState(null, '', curHash || '#/');
    guard(() => { location.hash = target; });
    return;
  }
  route();
});
let resizeT;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(growAll, 120); });
// tutup kotak info "Perubahan sementara" saat klik di luar
document.addEventListener('click', e => {
  if (!e.target.closest('.dirty-pop, .dirty-ic')) $$('.dirty-pop').forEach(p => p.remove());
});

// =====================================================================
//  FIREBASE — hanya untuk "masukkan"
// =====================================================================
const FB = { status: 'init', error: '', mod: null, db: null, connected: false, want: null, slideId: null, unsub: null, items: [], loading: false, draft: '' };

async function initFirebase() {
  let cfg;
  try { cfg = (await import('./firebase-config.js')).firebaseConfig; }
  catch (e) { return fbFail('File firebase-config.js tidak valid — cek lagi isinya. (' + e.message + ')'); }
  const str = JSON.stringify(cfg || {});
  if (!cfg || !cfg.apiKey || /ISI_/.test(str)) { FB.status = 'unconfigured'; return refreshFbUI(); }
  if (!cfg.databaseURL) return fbFail('"databaseURL" belum ada di firebase-config.js. Buat Realtime Database dulu, lalu salin ulang config-nya.');
  try {
    const [appMod, dbMod] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-database.js`),
    ]);
    FB.db = dbMod.getDatabase(appMod.initializeApp(cfg));
    FB.mod = dbMod; FB.status = 'ready';
    dbMod.onValue(dbMod.ref(FB.db, '.info/connected'), snap => { FB.connected = snap.val() === true; updateConn(); });
    listenDefaults();
    if (FB.want) subscribe(FB.want);
  } catch (e) { return fbFail('Gagal memuat Firebase: ' + e.message); }
  refreshFbUI();
}
function fbFail(msg) { FB.status = 'error'; FB.error = msg; refreshFbUI(); }
function refreshFbUI() { updateConn(); renderFb(); updateVarsFoot(); }

// ---- Default variabel bersama (path: defaults/<slide>)
function listenDefaults() {
  FB.mod.onValue(FB.mod.ref(FB.db, 'defaults'), snap => {
    const all = snap.val() || {};
    const c = cur(), sig = keySig(c), tplBefore = c?.tpl;
    for (const s of SLIDES) {
      if (s.type === 'request') continue;
      shared[s.id] = decodeShared(s, all[s.id]);
      pruneTemp(s);
      refreshSlide(s);
    }
    sharedLoaded = true; FB.defErr = '';
    if (c && c.type !== 'request' && !state.edit && (c.tpl !== tplBefore || keySig(c) !== sig)) renderTplArea();
    if (c && keySig(c) !== sig) rerenderVars(); else syncInputs();
  }, err => { sharedLoaded = true; FB.defErr = err.message; updateVarsFoot(); });
}
async function setDefault() {
  const s = cur(); if (!s || s.type === 'request') return;
  if (FB.status !== 'ready') { toast(FB.status === 'unconfigured' ? 'Firebase belum disambungkan (lihat README.md)' : 'Belum terhubung ke Firebase'); return; }
  const n = changeCount(s);
  if (!n) { toast('Belum ada perubahan — semua sudah sesuai default'); return; }
  if (!confirm(`Simpan ${n} perubahan di slide "${s.title}" sebagai default untuk SEMUA orang?`)) return;
  const btns = $$('[data-act="set-default"]'); btns.forEach(b => { b.disabled = true; });
  try {
    await FB.mod.set(FB.mod.ref(FB.db, 'defaults/' + s.id), {
      ...defaultPayload(s), ver: TEMPLATE_VERSION, ts: FB.mod.serverTimestamp(), by: String(LS.get('nama', '') || '').slice(0, 40),
    });
    delete temp[s.id]; delete tempTpl[s.id]; refreshSlide(s);
    $$('.dirty-pop').forEach(p => p.remove());
    if (cur() === s) { renderTplArea(); rerenderVars(); }
    toast('Tersimpan sebagai default ✓ Semua orang akan melihatnya');
  } catch (e) {
    toast('Gagal menyimpan: ' + (e.code === 'PERMISSION_DENIED' || /permission/i.test(e.message) ? 'ditolak oleh Rules Firebase (perbarui Rules)' : (e.code || e.message)));
  } finally { btns.forEach(b => { b.disabled = false; }); }
}
const fbQuery = id => FB.mod.query(FB.mod.ref(FB.db, 'masukan/' + id), FB.mod.limitToLast(200));
function toArr(snap) { const a = []; snap.forEach(c => { a.push({ id: c.key, ...c.val() }); }); return a.reverse(); }

function subscribe(id) {
  FB.want = id;
  if (FB.status !== 'ready') return;
  if (FB.slideId === id && FB.unsub) return;
  if (FB.unsub) FB.unsub();
  FB.slideId = id; FB.items = []; FB.loading = true; FB.listenErr = '';
  renderFb();
  FB.unsub = FB.mod.onValue(fbQuery(id), snap => {
    FB.loading = false; FB.items = toArr(snap); FB.listenErr = ''; renderFb();
  }, err => {
    FB.loading = false; FB.unsub = null; FB.listenErr = err.message; renderFb();
  });
}
async function refreshFb() {
  if (FB.status !== 'ready') { toast(FB.status === 'unconfigured' ? 'Firebase belum disambungkan (lihat README)' : 'Firebase belum terhubung'); return; }
  const id = cur().id;
  try {
    const snap = await FB.mod.get(fbQuery(id));
    FB.slideId = id; FB.items = toArr(snap); FB.listenErr = '';
    if (!FB.unsub) subscribe(id);
    renderFb(); toast('Masukkan diperbarui ✓');
  } catch (e) { toast('Gagal refresh: ' + (e.code || e.message)); }
}
async function submitFb(form) {
  const s = cur();
  const ta = $('.fb-text', form), nm = $('.fb-name', form), btn = $('.fb-submit', form);
  const teks = ta.value.trim().slice(0, MAX_TEXT);
  const nama = nm.value.trim().slice(0, 40);
  if (!teks) {
    form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
    ta.focus(); toast('Tulis masukkan dulu ya ✍️'); return;
  }
  if (FB.status !== 'ready') { toast(FB.status === 'unconfigured' ? 'Firebase belum disambungkan (lihat README.md)' : 'Belum terhubung ke Firebase'); return; }
  LS.set('nama', nama);
  btn.disabled = true; btn.innerHTML = 'Mengirim…';
  const slow = setTimeout(() => { btn.innerHTML = 'Menunggu koneksi…'; }, 6000);
  try {
    await FB.mod.push(FB.mod.ref(FB.db, 'masukan/' + s.id), { teks, nama, view: state.view, ts: FB.mod.serverTimestamp() });
    ta.value = ''; ta.dispatchEvent(new Event('input', { bubbles: true }));
    toast('Masukkan terkirim ✓');
  } catch (e) {
    toast('Gagal mengirim: ' + (e.code === 'PERMISSION_DENIED' || /permission/i.test(e.message) ? 'ditolak oleh Rules Firebase' : (e.code || e.message)));
  } finally {
    clearTimeout(slow); btn.disabled = false; btn.innerHTML = 'Kirim <span aria-hidden="true">➤</span>';
  }
}

function updateConn() {
  let cls = 'wait', txt = 'Menghubungkan…';
  if (FB.status === 'unconfigured') { cls = 'off'; txt = 'Firebase belum disetel'; }
  else if (FB.status === 'error') { cls = 'bad'; txt = 'Firebase error'; }
  else if (FB.status === 'ready') { cls = FB.connected ? 'live' : 'wait'; txt = FB.connected ? 'Live' : 'Offline'; }
  $$('[data-conn]').forEach(el => { el.className = 'conn ' + cls; $('span', el).textContent = txt; el.title = txt; });
}

function relTime(ts) {
  if (!ts) return 'baru saja';
  const d = (Date.now() - ts) / 1000;
  if (d < 45) return 'baru saja';
  if (d < 3600) return Math.round(d / 60) + ' mnt lalu';
  if (d < 86400) return Math.round(d / 3600) + ' jam lalu';
  return new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
}
function fbItemHTML(it) {
  const nama = (it.nama || '').trim() || 'Anonim';
  const view = it.view === 'mobile' ? '📱' : it.view === 'desktop' ? '💻' : '';
  return `<li class="fb-item">
    <div class="fb-meta"><span class="av">${esc(nama[0].toUpperCase())}</span><b>${esc(nama)}</b><span class="dot">·</span><time data-ts="${it.ts || ''}">${relTime(it.ts)}</time>${view ? `<span class="vtag">${view}</span>` : ''}</div>
    <div class="fb-teks">${esc(it.teks)}</div></li>`;
}
function renderFb() {
  const list = $('#fbList'), status = $('#fbStatus'); if (!list || !status) return;
  const s = cur();
  let st = '';
  if (FB.status === 'unconfigured') st = '<div class="alert">⚙️ <b>Firebase belum disambungkan.</b> Isi <code>firebase-config.js</code> dengan config dari Firebase Console (ikuti <b>README.md</b>). Format &amp; variabel tetap bisa dipakai.</div>';
  else if (FB.status === 'error') st = `<div class="alert bad">⚠️ ${esc(FB.error)}</div>`;
  else if (FB.listenErr) st = `<div class="alert bad">⚠️ Tidak bisa membaca masukkan: ${esc(FB.listenErr)}. Cek Rules di Firebase (lihat README).</div>`;
  else if (FB.status === 'init' || FB.loading) st = '<div class="muted loading">Memuat masukkan…</div>';
  status.innerHTML = st;
  const items = FB.slideId === s.id ? FB.items : [];
  const ready = FB.status === 'ready' && !FB.loading && !FB.listenErr;
  list.innerHTML = items.length ? items.map(fbItemHTML).join('') : (ready ? `<li class="empty-list">Belum ada masukkan. Jadilah yang pertama ✍️</li>` : '');
  const cnt = $('#fbCount'); if (cnt) cnt.textContent = items.length ? `(${items.length})` : '';
  $$('.fb-submit').forEach(b => b.classList.toggle('disabled-look', FB.status !== 'ready'));
  if (s.type === 'request') renderRequestAgg(items);
}

// ---- Tanah Longsor: rekap field + draf format otomatis
const titleCase = t => t.replace(/(^|[\s/(-])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
function renderRequestAgg(items) {
  const tallyEl = $('#tally'), draftEl = $('#draft'); if (!tallyEl || !draftEl) return;
  const map = new Map();
  [...items].reverse().forEach((it, order) => {
    const seenInThis = new Set();
    String(it.teks || '').split(/[,;\n]+/).forEach(raw => {
      const label = raw.replace(/\s+/g, ' ').replace(/^[\s\-•*.]+|[\s.]+$/g, '').trim();
      if (!label || label.length > 60) return;
      const key = label.toLowerCase();
      if (seenInThis.has(key)) return; seenInThis.add(key);
      const e = map.get(key) || { label: titleCase(label), count: 0, order };
      e.count++; map.set(key, e);
    });
  });
  const fields = [...map.values()].sort((a, b) => b.count - a.count || a.order - b.order);
  const max = fields[0]?.count || 1;
  tallyEl.innerHTML = fields.length
    ? fields.map(f => `<span class="tchip" style="--w:${Math.round(f.count / max * 100)}%"><b>${esc(f.label)}</b><em>${f.count}</em></span>`).join('')
    : `<p class="muted">${FB.status === 'ready' ? 'Belum ada field yang diusulkan.' : 'Rekap muncul setelah Firebase tersambung.'}</p>`;
  const info = fields.length ? fields.map(f => `- *${f.label}:* {LDS ${f.label}}`) : ['_(belum ada field — kirim usulan di atas)_'];
  FB.draft = [
    '*LAPORAN / UPDATE {Update Number} Situasi Tanah Longsor | {Alert}*', '{Current Date}', '',
    '*Informasi:*', ...info, '',
    '*Aset Terdekat:* {Nearest Facility Information[0]} (± {Nearest Facility Distance: angka + km/m})', '',
    '👤 *Pegawai:* {Employee Status}', '🏢 *Aset:* {Asset Status}', '⚙️ *Operasional:* {Operational Status}', '',
    '*Penanganan:* {Penanganan}', '*Next Step:* {Next Step}', '',
    'Demikian kami laporkan, terima kasih.', '*BCM Command Center*', '', '> `{Incident ID}`',
  ].join('\n');
  draftEl.innerHTML = plainPH(FB.draft);
}

setInterval(() => { $$('time[data-ts]').forEach(t => { const ts = +t.dataset.ts; if (ts) t.textContent = relTime(ts); }); updateVarsFoot(); }, 60000);
window.addEventListener('beforeunload', e => {
  if (editDirty() || SLIDES.some(s => s.type !== 'request' && changeCount(s))) { e.preventDefault(); e.returnValue = ''; }
});
SLIDES.forEach(refreshSlide);

// ------------------------------------------------------------ mulai
route();
initFirebase();
