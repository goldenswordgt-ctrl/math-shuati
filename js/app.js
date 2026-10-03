(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const KEY = 'shuati.v1';
  const SET_SIZE = 20;
  const SPRINT_MS = 180000;
  const byId = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

  const dkey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => dkey(new Date());
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tex = (t) => { try { return katex.renderToString(t, { throwOnError: false }); } catch (e) { return esc(t); } };
  const md = (s) => s.split('$').map((seg, i) => (i % 2 ? tex(seg) : seg)).join('');
  const pct = (c, n) => (n ? Math.round((100 * c) / n) : 0);
  const fmtTime = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  // ── storage
  const fresh = () => ({ topics: {}, days: {}, mistakes: [], bestSprint: 0, goal: 30, sel: TOPICS.map((t) => t.id), diff: 'mix', mode: 'endless' });
  let S = fresh();
  try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw) S = Object.assign(fresh(), raw); } catch (e) { /* private mode etc. */ }
  S.sel = S.sel.filter((id) => byId[id]);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };

  // ── views
  function show(v) {
    $$('.view').forEach((el) => el.classList.toggle('on', el.id === 'v-' + v));
    const navV = v === 'drill' || v === 'summary' ? 'home' : v;
    $$('.nav [data-go]').forEach((b) => b.classList.toggle('on', b.dataset.go === navV));
    if (v === 'home') renderHome();
    if (v === 'mistakes') renderMistakes();
    if (v === 'stats') renderStats();
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (!go) return;
    e.preventDefault();
    if (sess && !sess.done) finish(true);
    show(go.dataset.go);
  });

  // ── home
  function streak() {
    let n = 0;
    const d = new Date();
    if (!(S.days[dkey(d)] || {}).n) d.setDate(d.getDate() - 1);
    while ((S.days[dkey(d)] || {}).n) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function renderHome() {
    const t = (S.days[today()] || {}).n || 0;
    $('#todayN').textContent = t;
    $('#goalN').textContent = S.goal;
    $('#goalSel').value = String(S.goal);
    const C = 2 * Math.PI * 27;
    const fg = $('#ringFg');
    fg.style.strokeDasharray = C;
    fg.style.strokeDashoffset = C * (1 - Math.min(1, t / S.goal));
    const st = streak();
    $('#streakTxt').textContent = t >= S.goal ? `Goal hit 🎯 · ${st}-day streak` : st ? `${st}-day streak 连续 · keep it alive` : 'Start a streak today';
    $('#topics').innerHTML = TOPICS.map((tp) => {
      const s = S.topics[tp.id];
      const acc = s && s.n ? `${pct(s.c, s.n)}% · ${s.n} done` : 'not tried yet';
      return `<button class="topic${S.sel.includes(tp.id) ? ' on' : ''}" data-id="${tp.id}"><span class="t-name">${tp.name}</span><span class="t-zh">${tp.zh}</span><span class="t-acc">${acc}</span></button>`;
    }).join('');
    $$('#diffSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(S.diff)));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === S.mode));
    $('#startBtn').disabled = !S.sel.length;
    updateBadge();
  }
  $('#topics').addEventListener('click', (e) => {
    const b = e.target.closest('.topic');
    if (!b) return;
    const id = b.dataset.id;
    S.sel = S.sel.includes(id) ? S.sel.filter((x) => x !== id) : [...S.sel, id];
    save(); renderHome();
  });
  $('#allT').onclick = () => { S.sel = TOPICS.map((t) => t.id); save(); renderHome(); };
  $('#noneT').onclick = () => { S.sel = []; save(); renderHome(); };
  $('#diffSeg').onclick = (e) => { const b = e.target.closest('button'); if (b) { S.diff = b.dataset.v === 'mix' ? 'mix' : +b.dataset.v; save(); renderHome(); } };
  $('#modeSeg').onclick = (e) => { const b = e.target.closest('button'); if (b) { S.mode = b.dataset.v; save(); renderHome(); } };
  $('#goalSel').onchange = (e) => { S.goal = +e.target.value; save(); renderHome(); };
  $('#startBtn').onclick = () => start({ mode: S.mode });

  function updateBadge() { $('#mBadge').textContent = S.mistakes.length || ''; }

  // ── drill
  let sess = null;
  let timer = null;

  function start({ mode, review }) {
    if (!review && !S.sel.length) return;
    sess = {
      mode: review ? 'review' : mode,
      review: review ? review.map((m) => ({ ...m })) : null,
      sel: [...S.sel], diff: S.diff,
      idx: 0, n: 0, ok: 0, combo: 0, best: 0, hist: [], t0: Date.now(),
      end: mode === 'sprint' && !review ? Date.now() + SPRINT_MS : null,
      cur: null, answered: false, done: false,
    };
    show('drill');
    clearInterval(timer);
    if (sess.end) timer = setInterval(tick, 250);
    next();
  }

  function make() {
    if (sess.review) return sess.review[sess.idx++];
    const id = sess.sel[Math.floor(Math.random() * sess.sel.length)];
    const d = sess.diff === 'mix' ? 1 + Math.floor(Math.random() * 3) : sess.diff;
    let p;
    for (let i = 0; i < 6; i++) {
      p = byId[id].gen(d);
      if (!sess.cur || p.q !== sess.cur.q) break;
    }
    return { ...p, topic: id, d };
  }

  function next() {
    if (sess.done) return;
    if (sess.mode === 'set' && sess.n >= SET_SIZE) return finish();
    if (sess.review && sess.idx >= sess.review.length) return finish();
    const p = make();
    sess.cur = p; sess.answered = false; sess.qt = Date.now();
    $('#qTag').textContent = `${byId[p.topic].name} · ${byId[p.topic].zh}`;
    $('#qPips').innerHTML = [1, 2, 3].map((i) => `<i class="${i <= p.d ? 'f' : ''}"></i>`).join('');
    $('#qText').innerHTML = md(p.q);
    const inp = $('#ans');
    inp.value = ''; inp.readOnly = false; inp.className = '';
    $('#reads').textContent = '';
    $('#fb').innerHTML = '';
    $('#subBtn').textContent = 'Check';
    $('#skipBtn').hidden = false;
    hud();
    inp.focus({ preventScroll: true });
  }

  function hud() {
    const pr = $('#dProg');
    pr.classList.remove('low');
    let fill = 0;
    if (sess.mode === 'set') { pr.textContent = `${Math.min(sess.n + 1, SET_SIZE)} / ${SET_SIZE}`; fill = sess.n / SET_SIZE; }
    else if (sess.review) { pr.textContent = `Review ${Math.min(sess.idx, sess.review.length)} / ${sess.review.length}`; fill = sess.n / sess.review.length; }
    else if (sess.end) { const left = sess.end - Date.now(); pr.textContent = fmtTime(left); pr.classList.toggle('low', left < 30000); fill = 1 - left / SPRINT_MS; }
    else { pr.textContent = `#${sess.n + 1}`; fill = 0; }
    $('#pFill').style.width = `${Math.max(0, Math.min(1, fill)) * 100}%`;
    $('#dScore').textContent = `✓ ${sess.ok} / ${sess.n}`;
    $('#dCombo').textContent = sess.combo >= 3 ? `×${sess.combo}` : '';
  }

  function tick() {
    if (!sess || sess.done) return clearInterval(timer);
    if (Date.now() >= sess.end) return finish();
    hud();
  }

  function submit() {
    if (!sess || sess.done) return;
    if (sess.answered) return next();
    const inp = $('#ans');
    const v = inp.value.trim();
    if (!v) { inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); return; }
    const r = MathAns.check(v, sess.cur.ans);
    if (!r.valid) {
      $('#reads').textContent = "can't read that — see “How to type answers”";
      inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
      return;
    }
    record(r.ok, v);
  }

  function record(ok, user) {
    const p = sess.cur, ms = Date.now() - sess.qt;
    sess.answered = true;
    sess.n++;
    if (ok) { sess.ok++; sess.combo++; sess.best = Math.max(sess.best, sess.combo); } else sess.combo = 0;
    sess.hist.push({ p, user, ok, ms });

    const ts = (S.topics[p.topic] ||= { n: 0, c: 0, ms: 0 });
    ts.n++; ts.ms += Math.min(ms, 600000); if (ok) ts.c++;
    const day = (S.days[today()] ||= { n: 0, c: 0 });
    day.n++; if (ok) day.c++;

    const key = p.topic + '|' + p.q;
    const i = S.mistakes.findIndex((m) => m.key === key);
    if (ok && sess.review && i >= 0) S.mistakes.splice(i, 1);
    if (!ok) {
      if (i >= 0) { S.mistakes[i].miss++; S.mistakes[i].user = user; S.mistakes[i].at = Date.now(); }
      else S.mistakes.unshift({ key, topic: p.topic, d: p.d, q: p.q, ans: p.ans, sol: p.sol, user, at: Date.now(), miss: 1 });
      S.mistakes = S.mistakes.slice(0, 300);
    }
    save(); updateBadge();

    const inp = $('#ans');
    inp.readOnly = true;
    inp.className = ok ? 'right' : 'wrong';
    $('#reads').textContent = '';
    $('#skipBtn').hidden = true;
    $('#subBtn').textContent = 'Next';
    const steps = `<ol class="steps">${p.sol.map((s) => `<li>${md(s)}</li>`).join('')}</ol>`;
    const nextBtn = `<button class="btn next" id="nextBtn">Next <kbd>↵</kbd></button>`;
    $('#fb').innerHTML = ok
      ? `<div class="verdict ok"><span class="mark">✓</span><b>Correct</b><span class="t">${(ms / 1000).toFixed(1)}s${sess.combo >= 3 ? ` · combo ×${sess.combo}` : ''}</span>${nextBtn}</div><details class="sol"><summary>Solution</summary>${steps}</details>`
      : `<div class="verdict bad"><span class="mark">✗</span><span>Answer: ${tex(p.ans.tex)}</span>${nextBtn}</div>${steps}`;
    $('#nextBtn').onclick = next;
    hud();
    if (ok && sess.mode === 'sprint') setTimeout(() => { if (sess && sess.answered && sess.cur === p) next(); }, 450);
  }

  $('#subBtn').onclick = submit;
  $('#skipBtn').onclick = () => { if (sess && !sess.answered && !sess.done) record(false, '(skipped)'); };
  $('#endBtn').onclick = () => finish();
  $('#ans').addEventListener('input', (e) => {
    const v = e.target.value.trim();
    e.target.classList.remove('shake');
    if (!v || sess.answered) { $('#reads').textContent = ''; return; }
    const r = MathAns.read(v);
    $('#reads').textContent = r ? '= ' + r.map((x) => +x.toFixed(4)).join(', ') : '…';
  });
  $('#keys').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ins]');
    if (!b || !sess || sess.answered) return;
    const inp = $('#ans');
    const s = inp.selectionStart ?? inp.value.length, en = inp.selectionEnd ?? s;
    inp.setRangeText(b.dataset.ins, s, en, 'end');
    inp.focus();
    inp.dispatchEvent(new Event('input'));
  });

  document.addEventListener('keydown', (e) => {
    const drill = $('#v-drill').classList.contains('on');
    if (drill && sess && !sess.done) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === 'Escape') finish();
      return;
    }
    if (e.key === 'Enter' && $('#v-home').classList.contains('on') && !e.target.closest('button,select,input')) $('#startBtn').click();
  });

  // ── summary
  function finish(silent) {
    if (!sess || sess.done) return;
    sess.done = true;
    clearInterval(timer);
    const isSprint = sess.mode === 'sprint';
    let newBest = false;
    if (isSprint && sess.ok > S.bestSprint) { S.bestSprint = sess.ok; newBest = true; save(); }
    if (silent) return;
    if (!sess.n) return show(sess.review ? 'mistakes' : 'home');
    const p = pct(sess.ok, sess.n), secs = Math.round((Date.now() - sess.t0) / 1000);
    $('#grade').innerHTML = isSprint ? `<b>${sess.ok}</b><span>in 3:00</span>` : `<b>${p}</b><span>/ 100</span>`;
    $('#sumLines').innerHTML = [
      `<span class="big">${sess.ok} of ${sess.n} correct</span>`,
      isSprint ? `<span>${newBest ? 'New sprint record 🎉' : `Best sprint: ${S.bestSprint}`}</span>` : `<span>${p >= 90 ? '满分边缘 — sharp.' : p >= 70 ? 'Solid. Redo the misses.' : 'The 错题本 is where the points are.'}</span>`,
      `<span class="muted">${Math.floor(secs / 60)}m ${secs % 60}s · avg ${(secs / sess.n).toFixed(1)}s per question · best combo ×${sess.best}</span>`,
      sess.review ? `<span class="muted">${sess.ok} crossed off · ${S.mistakes.length} left in the notebook</span>` : '',
    ].join('');
    $('#sumList').innerHTML = sess.hist.map((h) => qItem(h.p, { ok: h.ok, user: h.user, meta: `${(h.ms / 1000).toFixed(1)}s` })).join('');
    $('#againBtn').onclick = () => (sess.review ? reviewAll() : start({ mode: sess.mode }));
    show('summary');
  }

  function qItem(p, { ok, user, meta, del }) {
    return `<details class="qi"><summary><span class="m ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'}</span><span class="qq">${md(p.q)}</span><span class="meta">${meta || ''}</span>${del ? `<button class="x" data-del="${esc(del)}" title="Remove">×</button>` : ''}</summary>
      <div class="body">${user != null ? `<div class="muted">You: <code>${esc(user)}</code></div>` : ''}<div>Answer: ${tex(p.ans.tex)}</div><ol class="steps">${p.sol.map((s) => `<li>${md(s)}</li>`).join('')}</ol></div></details>`;
  }

  // ── mistakes
  function renderMistakes() {
    updateBadge();
    const list = S.mistakes;
    $('#reviewBtn').disabled = !list.length;
    $('#clearM').hidden = !list.length;
    disarm($('#clearM'), 'Clear all');
    $('#mList').innerHTML = list.length
      ? list.map((m) => qItem(m, { ok: false, user: m.user, meta: `${byId[m.topic] ? byId[m.topic].zh : ''}${m.miss > 1 ? ` · ✗${m.miss}` : ''}`, del: m.key })).join('')
      : '<div class="empty">No mistakes saved. Either you are perfect or you haven\'t started. 去刷题.</div>';
  }
  function reviewAll() {
    if (!S.mistakes.length) return show('mistakes');
    const list = [...S.mistakes].sort(() => Math.random() - 0.5).slice(0, 30);
    start({ review: list });
  }
  $('#reviewBtn').onclick = reviewAll;
  $('#mList').addEventListener('click', (e) => {
    const x = e.target.closest('[data-del]');
    if (!x) return;
    e.preventDefault();
    S.mistakes = S.mistakes.filter((m) => m.key !== x.dataset.del);
    save(); renderMistakes();
  });

  // two-tap confirm instead of a blocking dialog
  function disarm(b, label) { b.classList.remove('arm'); b.textContent = label; clearTimeout(b._t); }
  function twoTap(b, label, action) {
    b.onclick = () => {
      if (!b.classList.contains('arm')) {
        b.classList.add('arm'); b.textContent = 'Tap again to confirm';
        b._t = setTimeout(() => disarm(b, label), 3000);
        return;
      }
      disarm(b, label); action();
    };
  }
  twoTap($('#clearM'), 'Clear all', () => { S.mistakes = []; save(); renderMistakes(); });
  twoTap($('#resetBtn'), 'Reset all stats', () => { const keep = { sel: S.sel, diff: S.diff, mode: S.mode, goal: S.goal }; S = Object.assign(fresh(), keep); save(); renderStats(); });

  // ── stats
  function renderStats() {
    disarm($('#resetBtn'), 'Reset all stats');
    const all = Object.values(S.topics).reduce((a, t) => ({ n: a.n + t.n, c: a.c + t.c }), { n: 0, c: 0 });
    $('#tiles').innerHTML = [
      [all.n, 'questions done'], [all.n ? pct(all.c, all.n) + '%' : '—', 'accuracy'], [streak(), 'day streak'], [S.bestSprint, 'best sprint'],
    ].map(([v, l]) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`).join('');
    const days = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push([d, S.days[dkey(d)] || { n: 0, c: 0 }]); }
    const max = Math.max(S.goal, ...days.map(([, v]) => v.n));
    $('#days').innerHTML = days.map(([d, v]) => `<div class="day" title="${dkey(d)}: ${v.n} done, ${v.c} correct"><i class="${v.n ? '' : 'zero'}" style="height:${(v.n / max) * 100}%"></i><small>${d.getDate()}</small></div>`).join('');
    $('#tstats').innerHTML = TOPICS.map((t) => {
      const s = S.topics[t.id] || { n: 0, c: 0, ms: 0 };
      const a = pct(s.c, s.n);
      return `<div class="ts"><span>${t.name} <span class="zh">${t.zh}</span></span><span class="bar"><i class="${a >= 80 ? '' : a >= 55 ? 'mid' : 'lo'}" style="width:${s.n ? a : 0}%"></i></span><span class="num">${s.n ? `${a}% · ${s.n}` : '—'}</span></div>`;
    }).join('');
  }

  // ── theme
  $('#themeBtn').onclick = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('shuati.theme', root.dataset.theme); } catch (e) { /* ignore */ }
  };

  show('home');
})();
