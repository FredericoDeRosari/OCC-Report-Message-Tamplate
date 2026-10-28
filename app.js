// =====================================================================
//  Format Lab — app.js
//  • Variabel & format: tersimpan di browser masing-masing (localStorage)
//  • Masukkan: tersimpan di Firebase Realtime Database (realtime untuk semua)
// =====================================================================
import { SLIDES, COMMON_VARS, nowWIB } from './templates.js';

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
for (const s of SLIDES) {
  if (s.type === 'request') continue;
  s.keys = extractKeys(s.tpl).filter(k => !(s.computed && k in s.computed));
  s.metaMap = {}; s.defaults = {};
  for (const k of s.keys) {
    const m = metaFor(k, s.vars);
    s.metaMap[k] = m;
    s.defaults[k] = typeof m.def === 'function' ? m.def() : (m.def ?? '');
  }
  if (s.type === 'group') {
    s.itemKeys = [...s.itemExtra, ...extractKeys(s.itemTpl).filter(k => k !== 'No' && !s.itemExtra.includes(k))];
    s.itemMeta = {};
    for (const k of s.itemKeys) s.itemMeta[k] = metaFor(k, s.itemVars);
  }
}

// ------------------------------------------------------------ nilai variabel (lokal)
const valsCache = {};
function getVals(s) {
  if (valsCache[s.id]) return valsCache[s.id];
  let v = LS.get('vals:' + s.id, null);
  if (!v || typeof v !== 'object') v = {};
  if (s.type === 'group') {
    if (!v.g || typeof v.g !== 'object') v.g = {};
    if (!Array.isArray(v.items)) v.items = clone(s.defaultItems);
  }
  return (valsCache[s.id] = v);
}
let saveTimer;
function saveVals(s) { clearTimeout(saveTimer); saveTimer = setTimeout(() => LS.set('vals:' + s.id, valsCache[s.id]), 250); }
function val(s, scope, key) {
  const v = getVals(s);
  if (s.type === 'group') {
    if (scope === 'c') return s.computed[key](v.items);
    if (scope === 'g') return v.g[key] ?? s.defaults[key] ?? '';
    return v.items[+scope]?.[key] ?? '';
  }
  return v[key] ?? s.defaults[key] ?? '';
}
function defaultOf(s, scope, key) {
  if (scope === 'g') return s.defaults[key] ?? '';
  return s.defaultItems?.[+scope]?.[key] ?? '';
}
function setVal(s, scope, key, value) {
  const v = getVals(s);
  if (s.type === 'group') {
    if (scope === 'g') v.g[key] = value;
    else if (v.items[+scope]) v.items[+scope][key] = value;
  } else v[key] = value;
  saveVals(s);
}

// ------------------------------------------------------------ mesin template
/**
 * mode: 'raw' (template dgn {var}), 'filled' (sudah terisi, dgn penanda), 'plain' (teks final utk WA)
 * opt.hl: tampilkan penanda "kosong" utk var kosong; opt.noMark: tanpa penanda (utk salin template)
 */
function build(s, mode, opt = {}) {
  const refs = [];
  const v = getVals(s);
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
    const items = v.items;
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
  const ph = meta.ph || defaultOf(s, scope, key) || (scope !== 'g' ? (s.defaultItems?.[0]?.[key] || '') : '') || meta.hint || '';
  const id = 'v' + (++uid);
  return `<div class="var" data-scope="${scope}" data-k="${esc(key)}">
    <div class="var-top">
      <label class="var-label" for="${id}">${esc(meta.label)}</label>
      <div class="var-actions">
        ${meta.now ? '<button type="button" class="ic" data-act="now" title="Isi waktu sekarang">🕒</button>' : ''}
        <button type="button" class="ic" data-act="reset" title="Kembalikan ke contoh">↺</button>
        <button type="button" class="ic" data-act="clear" title="Kosongkan">✕</button>
      </div>
    </div>
    <code class="var-key">{${esc(key)}}</code>
    <textarea id="${id}" rows="1" class="var-input" spellcheck="false" placeholder="${esc(ph)}">${esc(value)}</textarea>
    ${meta.hint ? `<div class="var-hint">${esc(meta.hint)}</div>` : ''}
  </div>`;
}
function varsHTML(s) {
  if (s.type !== 'group') return s.keys.map(k => varRow(s, 'g', k)).join('');
  const v = getVals(s);
  let h = `<div class="var-group"><div class="vg-title">Umum</div>${s.keys.map(k => varRow(s, 'g', k)).join('')}</div>`;
  h += `<div class="var-group computed"><div class="vg-title">Otomatis dari daftar lokasi</div>${Object.keys(s.computed).map(k => `
    <div class="var comp" data-scope="c" data-k="${esc(k)}">
      <div class="var-top"><span class="var-label">${esc(s.computedLabels[k] || k)}</span><span class="tag">auto</span></div>
      <code class="var-key">{${esc(k)}}</code>
      <div class="computed-val" data-k="${esc(k)}"></div>
    </div>`).join('')}</div>`;
  h += v.items.map((it, i) => `<div class="var-group item">
      <div class="vg-title">📍 Lokasi ${i + 1}<button type="button" class="btn sm ghost danger" data-act="del-item" data-i="${i}">Hapus</button></div>
      ${s.itemKeys.map(k => varRow(s, String(i), k)).join('')}
    </div>`).join('');
  h += '<button type="button" class="btn add-item" data-act="add-item">＋ Tambah lokasi</button>';
  return h;
}
const varCount = s => s.type === 'group' ? `${s.keys.length} umum · ${getVals(s).items.length} lokasi` : `${s.keys.length} variabel`;

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
    <section class="panel p-raw">
      <div class="panel-head"><span class="pdot"></span><h2>Template Format</h2>
        <div class="head-actions"><button type="button" class="btn sm" data-act="copy-raw">⧉ Salin</button></div></div>
      <div class="panel-body"><pre id="raw" class="raw"></pre>
        <p class="legend">Klik <span class="ph">{variabel}</span> untuk langsung mengisinya di panel kanan.</p></div>
    </section>
    <section class="panel p-vars">
      <div class="panel-head"><span class="pdot"></span><h2>Input Variabel</h2><span class="sub" id="varCount">${varCount(s)}</span>
        <div class="head-actions"><button type="button" class="btn sm ghost" data-act="reset-all" title="Kembalikan semua ke contoh">↺ Contoh</button><button type="button" class="btn sm ghost" data-act="clear-all" title="Kosongkan semua">✕ Kosongkan</button></div></div>
      <div class="panel-body"><p class="note">💾 Tersimpan di browser kamu saja. Semua isian berupa teks.</p><div id="vars" class="vars">${varsHTML(s)}</div></div>
    </section>
  </div>
  ${feedbackHTML(s)}`;
}

function mobileFormatHTML(s) {
  const real = state.mmode === 'real';
  return `<section class="card m-format">
    <div class="card-head">
      <div><h2>${real ? 'Contoh / Realcase' : 'Format'}</h2><small>${real ? 'Pesan WA setelah variabel diisi' : 'Template dengan {variabel}'}</small></div>
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
        : '<span class="sub">Ketuk <span class="ph">{variabel}</span> untuk mengisinya</span><span class="grow"></span><button type="button" class="btn sm" data-act="copy-raw">⧉ Salin</button>'}
    </div>
  </section>`;
}
function mobileBody(s) {
  return `${mobileFormatHTML(s)}
  <section class="card m-vars">
    <div class="card-head">
      <div><h2>Variabel <span class="sub" id="varCount">${varCount(s)}</span></h2><small>Semua isian teks · tersimpan di HP ini saja</small></div>
      <div class="head-actions"><button type="button" class="btn sm ghost" data-act="reset-all">↺ Contoh</button><button type="button" class="btn sm ghost" data-act="clear-all">✕</button></div>
    </div>
    <div id="vars" class="vars">${varsHTML(s)}</div>
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
  if (s.type !== 'request') { renderPreviews(); growAll(); }
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
  growAll(); renderPreviews();
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

// ------------------------------------------------------------ event (delegasi)
app.addEventListener('click', e => {
  const goBtn = e.target.closest('[data-go]');
  if (goBtn && !goBtn.disabled) { go(+goBtn.dataset.go); return; }

  const mm = e.target.closest('[data-mmode]');
  if (mm) {
    state.mmode = mm.dataset.mmode; LS.set('mmode', state.mmode);
    const card = $('.m-format'); if (card) { card.outerHTML = mobileFormatHTML(cur()); renderPreviews(); }
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
    case 'reset': case 'clear': case 'now': {
      if (!row) return;
      const ta = $('textarea', row);
      ta.value = act === 'clear' ? '' : act === 'now' ? nowWIB() : defaultOf(s, row.dataset.scope, row.dataset.k);
      setVal(s, row.dataset.scope, row.dataset.k, ta.value); grow(ta); schedule(); ta.focus();
      return;
    }
    case 'reset-all':
      if (!confirm('Kembalikan semua variabel di slide ini ke contoh?')) return;
      delete valsCache[s.id]; LS.del('vals:' + s.id); rerenderVars(); toast('Dikembalikan ke contoh'); return;
    case 'clear-all': {
      const v = getVals(s);
      if (s.type === 'group') { s.keys.forEach(k => { v.g[k] = ''; }); v.items.forEach(it => s.itemKeys.forEach(k => { it[k] = ''; })); }
      else s.keys.forEach(k => { v[k] = ''; });
      saveVals(s); rerenderVars(); toast('Semua variabel dikosongkan'); return;
    }
    case 'add-item': {
      const v = getVals(s); v.items.push({}); saveVals(s); rerenderVars();
      const groups = $$('.var-group.item'); const last = groups[groups.length - 1];
      if (last) { last.scrollIntoView({ block: 'start', behavior: 'smooth' }); $('textarea', last)?.focus({ preventScroll: true }); }
      return;
    }
    case 'del-item': {
      const i = +b.dataset.i; const v = getVals(s);
      if (!confirm(`Hapus Lokasi ${i + 1}?`)) return;
      v.items.splice(i, 1); saveVals(s); rerenderVars(); return;
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
  if (t.matches('.var-input')) {
    const row = t.closest('.var');
    setVal(cur(), row.dataset.scope, row.dataset.k, t.value);
    grow(t); schedule(); return;
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
});
document.addEventListener('keydown', e => {
  if (!state.view || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.target.closest('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'ArrowLeft') go(state.idx - 1);
  if (e.key === 'ArrowRight') go(state.idx + 1);
});
window.addEventListener('hashchange', route);

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
    if (FB.want) subscribe(FB.want);
  } catch (e) { return fbFail('Gagal memuat Firebase: ' + e.message); }
  refreshFbUI();
}
function fbFail(msg) { FB.status = 'error'; FB.error = msg; refreshFbUI(); }
function refreshFbUI() { updateConn(); renderFb(); }
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
    '*Aset Terdekat:* {Nearest Facility Information[0]} (± {Nearest Facility Distance} km/m)', '',
    '👤 *Pegawai:* {Employee Status}', '🏢 *Aset:* {Asset Status}', '⚙️ *Operasional:* {Operational Status}', '',
    '*Penanganan:* {Penanganan}', '*Next Step:* {Next Step}', '',
    'Demikian kami laporkan, terima kasih.', '*BCM Command Center*', '', '> `{Incident ID}`',
  ].join('\n');
  draftEl.innerHTML = plainPH(FB.draft);
}

setInterval(() => { $$('time[data-ts]').forEach(t => { const ts = +t.dataset.ts; if (ts) t.textContent = relTime(ts); }); }, 60000);

// ------------------------------------------------------------ mulai
route();
initFirebase();
