// Answer parsing + checking. Turns "sqrt(3)/2", "3pi/4", "(2, -1)", "x = 5" into numbers.
const MathAns = (() => {
  function tokenize(s) {
    const t = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9.]/.test(ch)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const v = Number(s.slice(i, j));
        if (Number.isNaN(v)) throw new Error('num');
        t.push({ k: 'n', v }); i = j; continue;
      }
      if (ch === 'π') { t.push({ k: 'n', v: Math.PI }); i++; continue; }
      if (ch === '√') { t.push({ k: 'f' }); i++; continue; }
      if (/[a-z]/i.test(ch)) {
        let j = i;
        while (j < s.length && /[a-z]/i.test(s[j])) j++;
        const w = s.slice(i, j).toLowerCase();
        if (w === 'pi') t.push({ k: 'n', v: Math.PI });
        else if (w === 'sqrt' || w === 'root') t.push({ k: 'f' });
        else throw new Error('word');
        i = j; continue;
      }
      if ('+-*/^()'.includes(ch)) { t.push({ k: ch }); i++; continue; }
      if (ch === '×' || ch === '·') { t.push({ k: '*' }); i++; continue; }
      if (ch === '÷') { t.push({ k: '/' }); i++; continue; }
      throw new Error('char');
    }
    // implicit multiplication: 2pi, 3sqrt(2), 2(3), (1)(2)
    const out = [];
    for (const tk of t) {
      const prev = out[out.length - 1];
      if (prev && (prev.k === 'n' || prev.k === ')') && (tk.k === 'n' || tk.k === '(' || tk.k === 'f')) out.push({ k: '*' });
      out.push(tk);
    }
    return out;
  }

  function evaluate(tokens) {
    let p = 0;
    const eat = (k) => (tokens[p] && tokens[p].k === k ? (p++, true) : false);
    const expr = () => {
      let v = term();
      for (;;) {
        if (eat('+')) v += term();
        else if (eat('-')) v -= term();
        else return v;
      }
    };
    const term = () => {
      let v = unary();
      for (;;) {
        if (eat('*')) v *= unary();
        else if (eat('/')) v /= unary();
        else return v;
      }
    };
    const unary = () => (eat('-') ? -unary() : eat('+') ? unary() : power());
    const power = () => {
      const b = atom();
      return eat('^') ? Math.pow(b, unary()) : b;
    };
    const atom = () => {
      const tk = tokens[p];
      if (!tk) throw new Error('end');
      if (tk.k === 'n') { p++; return tk.v; }
      if (tk.k === '(') {
        p++;
        const v = expr();
        if (!eat(')')) throw new Error('paren');
        return v;
      }
      if (tk.k === 'f') { p++; return Math.sqrt(unary()); }
      throw new Error('tok');
    };
    const v = expr();
    if (p !== tokens.length) throw new Error('trail');
    return v;
  }

  function splitTop(s) {
    const parts = [];
    let depth = 0, cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    parts.push(cur);
    return parts;
  }

  function clean(s) {
    return s
      .replace(/[−–—]/g, '-')
      .replace(/，/g, ',')
      .replace(/[（]/g, '(').replace(/[）]/g, ')')
      .replace(/[%％°]/g, '')
      .replace(/\b(and|or)\b/gi, ',')
      .replace(/;/g, ',')
      .trim();
  }

  // Returns an array of numbers, or null if unreadable.
  function read(raw) {
    const s = clean(raw);
    if (!s) return null;
    let parts = splitTop(s);
    if (parts.length === 1) {
      const q = parts[0].trim();
      if (q.startsWith('(') && q.endsWith(')')) {
        const inner = splitTop(q.slice(1, -1));
        if (inner.length > 1) parts = inner;
      }
    }
    try {
      const vals = parts.map((x) => {
        const body = x.trim().replace(/^[a-z]\s*(_?\d)?\s*=\s*/i, '');
        if (!body) throw new Error('empty');
        const v = evaluate(tokenize(body));
        if (!Number.isFinite(v)) throw new Error('nan');
        return v;
      });
      return vals;
    } catch (e) {
      return null;
    }
  }

  function close(a, b, approx) {
    const tol = approx ? Math.max(0.006, Math.abs(b) * 1e-3) : 1e-6 * Math.max(1, Math.abs(b));
    return Math.abs(a - b) <= tol;
  }

  function uniq(list, approx) {
    const out = [];
    for (const v of [...list].sort((x, y) => x - y)) if (!out.some((u) => close(v, u, approx))) out.push(v);
    return out;
  }

  function check(raw, ans) {
    const got = read(raw);
    if (!got) return { valid: false };
    if (ans.tuple) {
      const ok = got.length === ans.vals.length && got.every((v, i) => close(v, ans.vals[i], ans.approx));
      return { valid: true, ok };
    }
    const want = uniq(ans.vals, ans.approx);
    const have = uniq(got, ans.approx);
    const ok = want.length === have.length && want.every((w, i) => close(have[i], w, ans.approx));
    return { valid: true, ok };
  }

  return { read, check };
})();
