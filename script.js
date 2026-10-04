// ===== LOGIC-START =====
const DEFAULT_RULES = { maxSub: 100, maxInt: 100, subPass: 33, overPass: 40, minAtt: 75 };
const GRADE_BANDS = [[90, 'A+'], [80, 'A'], [70, 'B'], [60, 'C'], [50, 'D'], [40, 'E']];
const ALL_GRADES = ['A+', 'A', 'B', 'C', 'D', 'E', 'F'];
// Subjects badalne ya add karne ke liye sirf ye list edit karo (key chhota aur bina space ke rakho).
const SUBJECTS = [
  { key: 'python', short: 'Python', label: 'Python Programming' },
  { key: 'daa', short: 'DAA', label: 'Design and Analysis of Algorithms' },
  { key: 'mfai', short: 'MFAI', label: 'Mathematical Foundation for AI' },
  { key: 'aip', short: 'AIP', label: 'Advanced Internet Programming' },
  { key: 'adbms', short: 'ADBMS', label: 'Advanced Database Management System' }
];
const SUBJECT_KEYS = SUBJECTS.map(s => s.key);
const MARK_KEYS = SUBJECT_KEYS.concat(['internal']);
const NUM_KEYS = MARK_KEYS.concat(['attendance']);
const LABELS = { internal: 'Internal marks', attendance: 'Attendance' };
SUBJECTS.forEach(s => { LABELS[s.key] = s.short + ' marks'; });
function maxTotalFor(rules) { return SUBJECTS.length * rules.maxSub + rules.maxInt; }
// id, name, class, [marks in SUBJECTS order], internal, attendance
const SAMPLE = [
  ['101', 'Aman Sharma', 'BCA-3', [88, 79, 92, 85, 81], 85, 91],
  ['102', 'Riya Verma', 'BCA-3', [72, 65, 58, 70, 66], 70, 82],
  ['103', 'Karan Singh', 'BCA-3', [45, 38, 30, 41, 36], 40, 60],
  ['104', 'Neha Gupta', 'BCA-2', [95, 91, 89, 93, 90], 93, 96],
  ['105', 'Rohit Kumar', 'BCA-2', [55, 62, 48, 52, 58], 52, 73],
  ['106', 'Simran Kaur', 'BCA-2', [67, 70, 75, 68, 72], 68, 88],
  ['107', 'Vikas Jain', 'BCA-3', [80, 84, null, 76, 79], 76, 79]
].map(r => {
  const s = { id: r[0], name: r[1], cls: r[2], internal: r[4], attendance: r[5] };
  SUBJECT_KEYS.forEach((k, i) => { s[k] = r[3][i]; });
  return s;
});

function gradeFor(pct) {
  for (const [limit, g] of GRADE_BANDS) if (pct >= limit) return g;
  return 'F';
}
function maxFor(key, rules) {
  if (key === 'internal') return rules.maxInt;
  if (key === 'attendance') return 100;
  return rules.maxSub;
}
function compute(s, rules) {
  const marks = MARK_KEYS.map(k => s[k]);
  const att = s.attendance;
  const attStatus = att == null ? 'Missing' : (att >= rules.minAtt ? 'OK' : 'Low');
  if (marks.some(m => m == null)) {
    return { total: null, pct: null, grade: '-', result: 'Incomplete', attStatus };
  }
  const total = marks.reduce((a, b) => a + b, 0);
  const maxTotal = maxTotalFor(rules);
  const pct = total / maxTotal * 100;
  const subjectsOk = SUBJECT_KEYS.every(k => s[k] >= rules.subPass);
  const result = (subjectsOk && pct >= rules.overPass) ? 'Pass' : 'Fail';
  return { total, pct, grade: result === 'Pass' ? gradeFor(pct) : 'F', result, attStatus };
}
function fmt(n) {
  if (n == null) return '';
  return String(Number(n.toFixed(2)));
}
function toNumber(text) {
  const t = String(text == null ? '' : text).trim();
  if (t === '') return { blank: true };
  const v = Number(t);
  if (!isFinite(v)) return { bad: true };
  return { value: v };
}
function summarize(students, rules) {
  const rows = students.map(s => ({ s, c: compute(s, rules) }));
  const complete = rows.filter(r => r.c.result !== 'Incomplete');
  const out = {
    total: students.length, complete: complete.length, incomplete: students.length - complete.length,
    passed: complete.filter(r => r.c.result === 'Pass').length,
    failed: complete.filter(r => r.c.result === 'Fail').length,
    low: rows.filter(r => r.c.attStatus === 'Low').length,
    avgTotal: null, avgPct: null, topper: null
  };
  if (complete.length) {
    out.avgTotal = complete.reduce((a, r) => a + r.c.total, 0) / complete.length;
    out.avgPct = complete.reduce((a, r) => a + r.c.pct, 0) / complete.length;
    const top = complete.reduce((a, r) => (r.c.pct > a.c.pct ? r : a));
    out.topper = { name: top.s.name, pct: top.c.pct };
  }
  return out;
}
function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; rows.push(row); row = []; }
    else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
function csvCell(v) {
  const t = v == null ? '' : String(v);
  return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}
function buildCSV(students, rules) {
  const head = ['id', 'name', 'class'].concat(NUM_KEYS, ['total', 'percentage', 'grade', 'result', 'attendance_status']);
  const lines = [head.join(',')];
  for (const s of students) {
    const c = compute(s, rules);
    lines.push([s.id, s.name, s.cls].concat(NUM_KEYS.map(k => s[k]), [
      c.total, c.pct == null ? '' : fmt(c.pct), c.grade, c.result, c.attStatus]).map(csvCell).join(','));
  }
  return lines.join('\n');
}
function importCSV(text, existing, rules) {
  const rows = parseCSV(text);
  if (rows.length < 2) return { error: 'The CSV needs a header row and at least one student row.' };
  const head = rows[0].map(h => h.trim().toLowerCase().replace(/[\s_-]+/g, ''));
  const col = n => head.indexOf(n);
  const idx = { id: col('id') >= 0 ? col('id') : col('studentid'), name: col('name'), cls: col('class'),
    internal: col('internal'), attendance: col('attendance') };
  SUBJECTS.forEach(sub => {
    const names = [sub.key, sub.short, sub.label].map(n => n.toLowerCase().replace(/[\s_-]+/g, ''));
    const found = names.map(n => col(n)).find(i => i >= 0);
    idx[sub.key] = found === undefined ? -1 : found;
  });
  if (idx.id < 0) return { error: 'The first row must have an "id" column.' };
  const seen = new Set(existing.map(s => s.id));
  const added = []; let noId = 0, dup = 0, cleared = 0;
  for (const r of rows.slice(1)) {
    const id = (r[idx.id] || '').trim();
    if (!id) { noId++; continue; }
    if (seen.has(id)) { dup++; continue; }
    seen.add(id);
    const s = { id, name: ((idx.name >= 0 && r[idx.name]) || '').trim() || 'Unknown', cls: ((idx.cls >= 0 && r[idx.cls]) || '').trim() || '-' };
    for (const k of NUM_KEYS) {
      const t = idx[k] >= 0 ? toNumber(r[idx[k]]) : { blank: true };
      if (t.blank) s[k] = null;
      else if (t.bad || t.value < 0 || t.value > maxFor(k, rules)) { s[k] = null; cleared++; }
      else s[k] = t.value;
    }
    added.push(s);
  }
  return { added, noId, dup, cleared };
}
// ===== LOGIC-END =====

(function () {
  const $ = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STORE_KEY = 'sps.v2';
  const FIELD_IDS = ['id', 'name', 'class'].concat(NUM_KEYS).map(k => 'f-' + k);
  const normalizeStudent = s => { const o = Object.assign({ id: '', name: 'Unknown', cls: '-' }, s); NUM_KEYS.forEach(k => { if (o[k] === undefined) o[k] = null; }); return o; };

  const state = { students: [], rules: Object.assign({}, DEFAULT_RULES), sample: false, editing: null,
    sort: { key: 'id', dir: 1 } };

  // ---------- storage (per-browser convenience, page works without it) ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.students)) {
          state.students = d.students.map(normalizeStudent);
          state.rules = Object.assign({}, DEFAULT_RULES, d.rules || {});
          state.sample = !!d.sample;
          return;
        }
      }
    } catch (e) { /* ignore */ }
    state.students = SAMPLE.map(s => Object.assign({}, s));
    state.sample = true;
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ students: state.students, rules: state.rules, sample: state.sample })); } catch (e) { /* ignore */ }
  }
  function changed() { state.sample = false; save(); renderAll(); }

  // ---------- helpers ----------
  function setMsg(el, text, kind) { el.textContent = text || ''; el.className = 'msg' + (kind ? ' ' + kind : ''); }
  function armConfirm(btn, armedText, action) {
    if (btn.dataset.armed === '1') { btn.dataset.armed = ''; btn.classList.remove('armed'); btn.textContent = btn.dataset.label; clearTimeout(btn._t); action(); return; }
    btn.dataset.label = btn.textContent; btn.dataset.armed = '1'; btn.classList.add('armed'); btn.textContent = armedText;
    btn._t = setTimeout(() => { btn.dataset.armed = ''; btn.classList.remove('armed'); btn.textContent = btn.dataset.label; }, 3500);
  }
  const formEl = k => $('f-' + (k === 'cls' ? 'class' : k));

  // ---------- summary ----------
  function renderSummary() {
    const m = summarize(state.students, state.rules);
    const tile = (cls, label, val, extra) => `<div class="${cls}"><dt>${label}</dt><dd>${val}${extra || ''}</dd></div>`;
    $('summary').innerHTML =
      tile('', 'Students', m.total) +
      tile('t-pass', 'Pass', m.passed) +
      tile('t-fail', 'Fail', m.failed) +
      tile('t-warn', 'Incomplete', m.incomplete) +
      tile('t-fail', 'Low attendance', m.low) +
      tile('', 'Average %', m.avgPct == null ? '—' : fmt(m.avgPct), m.avgPct == null ? '' : ' <small>%</small>') +
      tile('', 'Average marks', m.avgTotal == null ? '—' : fmt(m.avgTotal), m.avgTotal == null ? '' : ' <small>/ ' + maxTotalFor(state.rules) + '</small>') +
      tile('wide', 'Topper', m.topper ? esc(m.topper.name) + ' <small>' + fmt(m.topper.pct) + '%</small>' : '—');
    $('sampleBanner').hidden = !state.sample;
  }

  // ---------- table ----------
  const COLS = [
    { key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }, { key: 'cls', label: 'Class' },
    ...SUBJECTS.map(s => ({ key: s.key, label: s.short, title: s.label, num: true })),
    { key: 'internal', label: 'Internal', num: true }, { key: 'attendance', label: 'Attendance', num: true },
    { key: 'total', label: 'Total', num: true }, { key: 'pct', label: 'Percent', num: true },
    { key: 'grade', label: 'Grade' }, { key: 'result', label: 'Result' }
  ];
  function renderHead() {
    $('thead').innerHTML = COLS.map(c => {
      const active = state.sort.key === c.key;
      const arrow = active ? (state.sort.dir === 1 ? '▲' : '▼') : '';
      return `<th class="${c.num ? 'num' : ''}" aria-sort="${active ? (state.sort.dir === 1 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="th" data-key="${c.key}" title="${esc(c.title || c.label)}">${c.label} <span class="arrow">${arrow}</span></button></th>`;
    }).join('');
  }
  function sortValue(row, key) {
    const { s, c } = row;
    if (key === 'total') return c.total;
    if (key === 'pct' || key === 'grade') return c.pct;
    if (key === 'result') return c.result;
    return s[key];
  }
  function visibleRows() {
    const q = $('q').value.trim().toLowerCase();
    const cls = $('fClass').value, res = $('fResult').value, gr = $('fGrade').value, low = $('fLow').checked;
    const rows = state.students.map(s => ({ s, c: compute(s, state.rules) })).filter(r => {
      if (q && !r.s.id.toLowerCase().includes(q) && !r.s.name.toLowerCase().includes(q)) return false;
      if (cls && r.s.cls !== cls) return false;
      if (res && r.c.result !== res) return false;
      if (gr && r.c.grade !== gr) return false;
      if (low && r.c.attStatus !== 'Low') return false;
      return true;
    });
    const { key, dir } = state.sort;
    rows.sort((a, b) => {
      const x = sortValue(a, key), y = sortValue(b, key);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * dir;
    });
    return rows;
  }
  function fillFilterOptions() {
    const cur = $('fClass').value;
    const classes = [...new Set(state.students.map(s => s.cls))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    $('fClass').innerHTML = '<option value="">All</option>' + classes.map(c => `<option>${esc(c)}</option>`).join('');
    $('fClass').value = classes.includes(cur) ? cur : '';
    if (!$('fGrade').options.length) $('fGrade').innerHTML = '<option value="">All</option>' + ALL_GRADES.map(g => `<option>${g}</option>`).join('');
  }
  function renderTable() {
    fillFilterOptions();
    renderHead();
    const rows = visibleRows();
    const cell = v => v == null ? '<span class="miss" title="Missing">—</span>' : fmt(v);
    $('tbody').innerHTML = rows.map(({ s, c }) => {
      const pill = c.result === 'Pass' ? 'pass' : c.result === 'Fail' ? 'fail' : 'inc';
      const att = s.attendance == null ? '<span class="miss" title="Missing">—</span>' : fmt(s.attendance) + '%';
      const lowTag = c.attStatus === 'Low' ? '<span class="tag-low">Low</span>' : '';
      return `<tr data-id="${esc(s.id)}" tabindex="0" class="${state.editing === s.id ? 'is-editing' : ''}">
        <td class="mono">${esc(s.id)}</td><td class="name">${esc(s.name)}</td><td>${esc(s.cls)}</td>
        ${SUBJECT_KEYS.map(k => `<td class="num">${cell(s[k])}</td>`).join('')}<td class="num">${cell(s.internal)}</td>
        <td class="num">${att}${lowTag}</td>
        <td class="num">${c.total == null ? '<span class="miss">—</span>' : fmt(c.total)}</td>
        <td class="num">${c.pct == null ? '<span class="miss">—</span>' : fmt(c.pct) + '%'}</td>
        <td class="grade">${c.grade}</td><td><span class="pill ${pill}">${c.result}</span></td></tr>`;
    }).join('');
    $('count').textContent = `Showing ${rows.length} of ${state.students.length}`;
    const empty = $('emptyMsg');
    if (!rows.length) {
      empty.hidden = false;
      empty.textContent = state.students.length ? 'No students match these filters. Use Reset filters to see everyone.' : 'No students yet. Fill in the form to add the first one, or load the sample data.';
    } else empty.hidden = true;
  }

  // ---------- charts ----------
  function completeRows() { return state.students.map(s => ({ s, c: compute(s, state.rules) })).filter(r => r.c.result !== 'Incomplete'); }
  function vchart(items, axisMax, ticks) {
    const grid = ticks.map(t => `<div class="gridline" style="bottom:${t / axisMax * 100}%"></div>`).join('');
    const yt = ticks.map(t => `<span class="ytick" style="bottom:${t / axisMax * 100}%">${t}</span>`).join('');
    const cols = items.map(it => `<div class="col"><div class="bar" style="height:${Math.min(100, it.value / axisMax * 100)}%;background:${it.color}"></div><div class="bar-val" style="bottom:${Math.min(100, it.value / axisMax * 100)}%">${it.text}</div></div>`).join('');
    const xl = items.map(it => `<span>${it.label}</span>`).join('');
    return `<div class="vchart"><div class="yaxis">${yt}</div><div class="plot">${grid}<div class="cols">${cols}</div></div><div class="xlabels">${xl}</div></div>`;
  }
  function renderCharts() {
    const rows = completeRows();
    const none = '<p class="chart-empty">Add students with all four marks to see this graph.</p>';
    if (!rows.length) { ['chartSubjects', 'chartPass', 'chartGrades', 'chartTop'].forEach(id => $(id).innerHTML = none); return; }
    const r = state.rules;

    // 1. subject averages, drawn as share of each subject's maximum
    const subs = SUBJECTS.map((s, i) => [s.key, s.short, 's' + (i + 1)]).concat([['internal', 'Internal', 's6']]);
    const items = subs.map(([k, label, col]) => {
      const avg = rows.reduce((a, x) => a + x.s[k], 0) / rows.length;
      return { label, value: avg / maxFor(k, r) * 100, text: fmt(avg), color: `var(--${col})` };
    });
    $('chartSubjects').innerHTML = vchart(items, 100, [0, 25, 50, 75, 100]) +
      `<p class="hint" style="margin-top:8px">Bar height shows the average as a share of the maximum marks. The number on top is the average marks.</p>`;

    // 2. pass vs fail donut
    const pass = rows.filter(x => x.c.result === 'Pass').length, fail = rows.length - pass;
    const rate = pass / rows.length * 100;
    $('chartPass').innerHTML = `<div class="donut-row"><div class="donut" style="background:conic-gradient(var(--good) 0 ${rate}%, var(--bad) ${rate}% 100%)" role="img" aria-label="${fmt(rate)} percent passed"><div class="donut-hole"><strong>${fmt(rate)}%</strong><span>pass rate</span></div></div>
      <ul class="legend"><li><span class="swatch" style="background:var(--good)"></span>Pass <b>${pass}</b></li><li><span class="swatch" style="background:var(--bad)"></span>Fail <b>${fail}</b></li></ul></div>`;

    // 3. grade distribution
    const counts = ALL_GRADES.map(g => rows.filter(x => x.c.grade === g).length);
    const step = Math.max(1, Math.ceil(Math.max(...counts) / 4));
    const gMax = step * 4;
    const gItems = ALL_GRADES.map((g, i) => ({ label: g, value: counts[i], text: counts[i], color: g === 'F' ? 'var(--bad)' : 'var(--s1)' }));
    $('chartGrades').innerHTML = vchart(gItems, gMax, [0, step, step * 2, step * 3, gMax]);

    // 4. top 10
    const top = rows.slice().sort((a, b) => b.c.pct - a.c.pct).slice(0, 10);
    $('chartTop').innerHTML = '<div class="hbars">' + top.map(x =>
      `<div class="hrow"><span class="nm" title="${esc(x.s.name)}">${esc(x.s.name)}</span><div class="htrack"><div class="hfill" style="width:${x.c.pct}%"></div></div><span class="v">${fmt(x.c.pct)}%</span></div>`).join('') + '</div>' +
      '<p class="hint" style="margin-top:10px">Each full bar is 100%.</p>';
  }

  // ---------- form ----------
  function readRaw() {
    const o = { id: $('f-id').value.trim(), name: $('f-name').value.trim(), cls: $('f-class').value.trim() };
    NUM_KEYS.forEach(k => { o[k] = toNumber($('f-' + k).value); });
    return o;
  }
  function existingFor(id) { return id ? state.students.find(s => s.id === id) : null; }
  function updateMode() {
    const id = $('f-id').value.trim();
    const ex = existingFor(id);
    $('saveBtn').textContent = ex ? 'Update student' : 'Add student';
    $('modeHint').textContent = ex ? 'Editing ' + ex.name : 'New student';
    $('deleteBtn').hidden = !ex;
  }
  function updatePreview() {
    updateMode();
    const raw = readRaw();
    const s = { id: raw.id, name: raw.name, cls: raw.cls };
    let invalid = false;
    NUM_KEYS.forEach(k => {
      const t = raw[k];
      const el = $('f-' + k);
      const bad = !!t.bad || (t.value != null && (t.value < 0 || t.value > maxFor(k, state.rules)));
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) invalid = true;
      s[k] = (t.blank || bad) ? null : t.value;
    });
    const c = compute(s, state.rules);
    const dl = $('preview');
    if (c.result === 'Incomplete') {
      const missing = MARK_KEYS.filter(k => s[k] == null).map(k => LABELS[k].replace(' marks', ''));
      dl.innerHTML = `<div class="note">${invalid ? 'Fix the marked fields to see the result.' : 'Waiting for: ' + missing.join(', ') + '.'}</div>`;
      return;
    }
    dl.innerHTML = `<div><dt>Total</dt><dd>${fmt(c.total)} / ${maxTotalFor(state.rules)}</dd></div>
      <div><dt>Percentage</dt><dd>${fmt(c.pct)}%</dd></div>
      <div><dt>Grade</dt><dd>${c.grade}</dd></div>
      <div><dt>Result</dt><dd>${c.result}</dd></div>
      <div><dt>Attendance</dt><dd>${c.attStatus === 'Missing' ? 'Not entered' : c.attStatus === 'Low' ? 'Low (below ' + state.rules.minAtt + '%)' : 'OK'}</dd></div>`;
  }
  function clearForm() {
    FIELD_IDS.forEach(id => { $(id).value = ''; $(id).setAttribute('aria-invalid', 'false'); });
    state.editing = null;
    setMsg($('formMsg'), '');
    updatePreview();
    renderTable();
  }
  function fillForm(s) {
    $('f-id').value = s.id; $('f-name').value = s.name; $('f-class').value = s.cls;
    NUM_KEYS.forEach(k => { $('f-' + k).value = s[k] == null ? '' : s[k]; });
    state.editing = s.id;
    setMsg($('formMsg'), '');
    updatePreview();
    renderTable();
  }
  function submitForm(e) {
    e.preventDefault();
    const raw = readRaw();
    const errors = [];
    if (!raw.id) errors.push('Student ID is required.');
    if (!raw.name) errors.push('Name is required.');
    if (!raw.cls) errors.push('Class is required.');
    const s = { id: raw.id, name: raw.name, cls: raw.cls };
    const missing = [];
    NUM_KEYS.forEach(k => {
      const t = raw[k];
      if (t.blank) { s[k] = null; missing.push(LABELS[k]); return; }
      if (t.bad) { errors.push(LABELS[k] + ' must be a number.'); return; }
      const mx = maxFor(k, state.rules);
      if (t.value < 0 || t.value > mx) { errors.push(LABELS[k] + ' must be between 0 and ' + mx + '.'); return; }
      s[k] = t.value;
    });
    if (errors.length) { setMsg($('formMsg'), errors.join(' '), 'err'); return; }
    const i = state.students.findIndex(x => x.id === s.id);
    const verb = i >= 0 ? 'Updated' : 'Added';
    if (i >= 0) state.students[i] = s; else state.students.push(s);
    state.editing = s.id;
    changed();
    updateMode();
    if (missing.length) setMsg($('formMsg'), `${verb} ${s.name}. Not entered: ${missing.join(', ')}. The result shows Incomplete until these are filled.`, 'info');
    else setMsg($('formMsg'), `${verb} ${s.name}.`, 'ok');
  }

  // ---------- data tools ----------
  function csvText() { return buildCSV(state.students, state.rules); }
  function showBox(text) { const b = $('csvBox'); b.hidden = false; b.value = text; b.focus(); b.select(); }
  function bindTools() {
    $('loadSample').onclick = () => {
      let n = 0;
      SAMPLE.forEach(s => { if (!state.students.some(x => x.id === s.id)) { state.students.push(Object.assign({}, s)); n++; } });
      changed();
      setMsg($('toolMsg'), n ? n + ' sample students added.' : 'Sample students are already in the list.', n ? 'ok' : 'info');
    };
    $('importBtn').onclick = () => $('importFile').click();
    $('importFile').onchange = ev => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const res = importCSV(String(rd.result), state.students, state.rules);
        if (res.error) { setMsg($('toolMsg'), res.error, 'err'); return; }
        state.students.push(...res.added);
        changed();
        const bits = [res.added.length + ' imported'];
        if (res.dup) bits.push(res.dup + ' skipped (ID already exists)');
        if (res.noId) bits.push(res.noId + ' skipped (no ID)');
        if (res.cleared) bits.push(res.cleared + ' invalid marks left empty');
        setMsg($('toolMsg'), bits.join(', ') + '.', 'ok');
      };
      rd.onerror = () => setMsg($('toolMsg'), 'Could not read that file.', 'err');
      rd.readAsText(f);
      ev.target.value = '';
    };
    $('copyCsv').onclick = () => {
      if (!state.students.length) { setMsg($('toolMsg'), 'There is nothing to copy yet.', 'info'); return; }
      const text = csvText();
      const fallback = () => { showBox(text); setMsg($('toolMsg'), 'Select all and copy the text below.', 'info'); };
      try {
        navigator.clipboard.writeText(text).then(() => { $('csvBox').hidden = true; setMsg($('toolMsg'), 'CSV copied to the clipboard.', 'ok'); }, fallback);
      } catch (e) { fallback(); }
    };
    $('downloadCsv').onclick = () => {
      if (!state.students.length) { setMsg($('toolMsg'), 'There is nothing to download yet.', 'info'); return; }
      try {
        const url = URL.createObjectURL(new Blob([csvText()], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'student_report.csv';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMsg($('toolMsg'), 'Download started. If nothing downloads here, use Copy CSV instead.', 'info');
      } catch (e) { setMsg($('toolMsg'), 'Download is not available here. Use Copy CSV instead.', 'err'); }
    };
    $('clearAll').onclick = () => armConfirm($('clearAll'), 'Click again to delete all', () => {
      state.students = []; clearForm(); changed(); setMsg($('toolMsg'), 'All students deleted.', 'ok');
    });
    $('clearSample').onclick = () => { state.students = []; clearForm(); changed(); setMsg($('toolMsg'), 'Sample data cleared. Add your own students.', 'ok'); };
  }

  // ---------- rules ----------
  const RULE_FIELDS = { maxSub: 'r-maxSub', maxInt: 'r-maxInt', subPass: 'r-subPass', overPass: 'r-overPass', minAtt: 'r-minAtt' };
  function syncRuleInputs() { Object.keys(RULE_FIELDS).forEach(k => { $(RULE_FIELDS[k]).value = state.rules[k]; }); }
  function syncLabels() {
    SUBJECT_KEYS.forEach(k => { $('lbl-' + k).textContent = `out of ${state.rules.maxSub}`; $('f-' + k).max = state.rules.maxSub; });
    $('lbl-internal').textContent = `out of ${state.rules.maxInt}`;
    $('f-internal').max = state.rules.maxInt;
  }
  function bindRules() {
    Object.keys(RULE_FIELDS).forEach(k => {
      $(RULE_FIELDS[k]).addEventListener('input', () => {
        const v = Number($(RULE_FIELDS[k]).value);
        const lim = (k === 'overPass' || k === 'minAtt') ? 100 : Infinity;
        const lo = (k === 'maxSub' || k === 'maxInt') ? 1 : 0;
        if (!isFinite(v) || v < lo || v > lim || $(RULE_FIELDS[k]).value === '') { setMsg($('ruleMsg'), 'Enter a valid number for this rule.', 'err'); return; }
        state.rules[k] = v;
        const over = state.students.filter(s => MARK_KEYS.some(f => s[f] != null && s[f] > maxFor(f, state.rules))).length;
        setMsg($('ruleMsg'), over ? over + ' student(s) have marks above the new maximum. Their percentage can go over 100.' : '', 'info');
        save(); syncLabels(); renderAll();
      });
    });
    $('resetRules').onclick = () => { state.rules = Object.assign({}, DEFAULT_RULES); setMsg($('ruleMsg'), ''); save(); syncRuleInputs(); syncLabels(); renderAll(); };
  }

  // ---------- wiring ----------
  function renderAll() { renderSummary(); renderTable(); renderCharts(); updatePreview(); }

  function buildMarkFields() {
    const row = (key, name, extra) => `<div class="mark-row"><label for="f-${key}">${esc(name)} <small id="lbl-${key}">${extra || ''}</small></label><input type="number" id="f-${key}" step="any" min="0" inputmode="decimal"></div>`;
    $('markFields').innerHTML = SUBJECTS.map(s => row(s.key, s.label)).join('') + row('internal', 'Internal marks') +
      `<div class="mark-row"><label for="f-attendance">Attendance <small>% of classes attended</small></label><input type="number" id="f-attendance" step="any" min="0" max="100" inputmode="decimal"></div>`;
    $('subjectKey').textContent = SUBJECTS.filter(s => s.short !== s.label).map(s => s.short + ' = ' + s.label).join('   |   ');
  }

  function init() {
    buildMarkFields();
    load();
    syncRuleInputs(); syncLabels();
    $('entryForm').addEventListener('submit', submitForm);
    $('clearBtn').onclick = clearForm;
    $('deleteBtn').onclick = () => armConfirm($('deleteBtn'), 'Click again to delete', () => {
      const id = $('f-id').value.trim();
      const s = existingFor(id);
      if (!s) return;
      state.students = state.students.filter(x => x.id !== id);
      clearForm(); changed();
      setMsg($('formMsg'), 'Deleted ' + s.name + '.', 'ok');
    });
    FIELD_IDS.forEach(id => $(id).addEventListener('input', updatePreview));
    ['q', 'fClass', 'fResult', 'fGrade', 'fLow'].forEach(id => { $(id).addEventListener('input', renderTable); $(id).addEventListener('change', renderTable); });
    $('resetFilters').onclick = () => { $('q').value = ''; $('fClass').value = ''; $('fResult').value = ''; $('fGrade').value = ''; $('fLow').checked = false; renderTable(); };
    $('thead').addEventListener('click', e => {
      const b = e.target.closest('.th'); if (!b) return;
      const key = b.dataset.key;
      state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : 1 };
      renderTable();
    });
    const pick = e => {
      const tr = e.target.closest('tr[data-id]'); if (!tr) return;
      const s = existingFor(tr.dataset.id); if (s) { fillForm(s); $('f-name').focus({ preventScroll: false }); }
    };
    $('tbody').addEventListener('click', pick);
    $('tbody').addEventListener('keydown', e => { if (e.key === 'Enter') pick(e); });
    bindTools(); bindRules();
    renderAll();
  }
  init();
})();
