// Problem generators. Each gen(d) takes difficulty 1–3 and returns
// { q, ans: {vals, tex, set, tuple, approx}, sol: [step, ...] }.
// Text between $...$ is rendered with KaTeX.
const TOPICS = (() => {
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const nz = (a, b) => { let x; do x = ri(a, b); while (x === 0); return x; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const red = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return [n / g, d / g]; };
  // exact fraction in LaTeX
  const F = (n, d = 1) => {
    [n, d] = red(n, d);
    return d === 1 ? String(n) : (n < 0 ? '-' : '') + `\\frac{${Math.abs(n)}}{${d}}`;
  };
  const pa = (n) => (n < 0 ? `(${n})` : String(n));
  const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
  const C = (n, k) => (k < 0 || k > n ? 0 : fact(n) / (fact(k) * fact(n - k)));
  const A = (vals, tex, o = {}) => ({ vals: [].concat(vals), tex, set: !!o.set, tuple: !!o.tuple, approx: !!o.approx });

  // sum of terms, e.g. terms([[3,'x'],[-1,'y'],[5,'']]) -> "3x - y + 5"
  function terms(list) {
    let s = '';
    for (const [c, v] of list) {
      if (!c) continue;
      const ab = Math.abs(c);
      const co = ab === 1 && v ? '' : String(ab);
      s += s ? ` ${c < 0 ? '-' : '+'} ${co}${v}` : `${c < 0 ? '-' : ''}${co}${v}`;
    }
    return s || '0';
  }
  // polynomial from coefficients, highest power first
  const poly = (cs, v = 'x') => terms(cs.map((c, i) => {
    const p = cs.length - 1 - i;
    return [c, p === 0 ? '' : p === 1 ? v : `${v}^{${p}}`];
  }));
  const fx = (r) => (r === 0 ? 'x' : r > 0 ? `(x-${r})` : `(x+${-r})`);
  const sqrtSimp = (n) => { let m = 1; for (let k = 2; k * k <= n; k++) while (n % (k * k) === 0) { n /= k * k; m *= k; } return [m, n]; };
  const sqrtTex = (n) => { const [m, r] = sqrtSimp(n); return r === 1 ? String(m) : `${m === 1 ? '' : m}\\sqrt{${r}}`; };
  const isSq = (n) => Number.isInteger(Math.sqrt(n));

  const topics = [];
  const T = (id, name, zh, gen) => topics.push({ id, name, zh, gen });

  // ───────────────────────── Mental math
  T('mental', 'Mental Math', '速算', (d) => {
    const dig = () => ri(1, 9) * 10 + ri(1, 9);
    if (d === 1) {
      if (Math.random() < 0.6) {
        const a = dig(), b = ri(3, 9), t = a - (a % 10), o = a % 10;
        return { q: `$${a}\\times ${b}$`, ans: A(a * b, `${a * b}`),
          sol: [`Split $${a}=${t}+${o}$.`, `$${t}\\times${b}+${o}\\times${b}=${t * b}+${o * b}=${a * b}$`] };
      }
      const a = ri(120, 899), b = ri(15, 99), plus = Math.random() < 0.5, r = plus ? a + b : a - b;
      const bt = b - (b % 10), bo = b % 10, mid = plus ? a + bt : a - bt;
      return { q: `$${a}${plus ? '+' : '-'}${b}$`, ans: A(r, `${r}`),
        sol: [`Do the tens first: $${a}${plus ? '+' : '-'}${bt}=${mid}$`, `then the ones: $${mid}${plus ? '+' : '-'}${bo}=${r}$`] };
    }
    if (d === 2) {
      const a = dig(), b = dig(), bt = b - (b % 10), bo = b % 10;
      return { q: `$${a}\\times ${b}$`, ans: A(a * b, `${a * b}`),
        sol: [`$${a}\\times${b}=${a}\\times${bt}+${a}\\times${bo}$`, `$=${a * bt}+${a * bo}=${a * b}$`] };
    }
    if (Math.random() < 0.5) {
      const n = dig(), m = n % 10, k = m <= 5 ? m : 10 - m;
      return { q: `$${n}^2$`, ans: A(n * n, `${n * n}`),
        sol: [`Use $n^2=(n-k)(n+k)+k^2$ with $k=${k}$ to hit a round number.`, `$${n - k}\\times${n + k}+${k * k}=${(n - k) * (n + k)}+${k * k}=${n * n}$`] };
    }
    const a = ri(1, 12), b = ri(1, 12), x = 100 - a, y = 100 - b;
    return { q: `$${x}\\times ${y}$`, ans: A(x * y, `${x * y}`),
      sol: [`Both are just under 100: $${x}=100-${a}$, $${y}=100-${b}$.`, `$(100-${a})(100-${b})=100\\times${100 - a - b}+${a}\\times${b}=${100 * (100 - a - b)}+${a * b}=${x * y}$`] };
  });

  // ───────────────────────── Fractions & percents
  T('arith', 'Fractions & Percents', '分数与百分数', (d) => {
    if (d === 1 || (d === 2 && Math.random() < 0.3)) {
      const hi = d === 1 ? 6 : 12;
      const b = ri(2, hi), dd = ri(2, hi), a = ri(1, b - 1), c = ri(1, dd - 1), plus = Math.random() < 0.5;
      const L = lcm(b, dd), A1 = (a * L) / b, C1 = (c * L) / dd, n = plus ? A1 + C1 : A1 - C1, op = plus ? '+' : '-';
      return { q: `$\\frac{${a}}{${b}}${op}\\frac{${c}}{${dd}}$`, ans: A(n / L, F(n, L)),
        sol: [`Common denominator: $${L}$.`, `$\\frac{${A1}}{${L}}${op}\\frac{${C1}}{${L}}=\\frac{${n}}{${L}}=${F(n, L)}$`] };
    }
    if (d === 2) {
      const b = ri(2, 9), dd = ri(2, 9), a = ri(1, 9), c = ri(1, 9), mul = Math.random() < 0.5;
      if (mul) return { q: `$\\frac{${a}}{${b}}\\times\\frac{${c}}{${dd}}$`, ans: A((a * c) / (b * dd), F(a * c, b * dd)),
        sol: [`Multiply straight across: $\\frac{${a}\\times${c}}{${b}\\times${dd}}=\\frac{${a * c}}{${b * dd}}=${F(a * c, b * dd)}$`] };
      return { q: `$\\frac{${a}}{${b}}\\div\\frac{${c}}{${dd}}$`, ans: A((a * dd) / (b * c), F(a * dd, b * c)),
        sol: [`Dividing = multiplying by the reciprocal: $\\frac{${a}}{${b}}\\times\\frac{${dd}}{${c}}$`, `$=\\frac{${a * dd}}{${b * c}}=${F(a * dd, b * c)}$`] };
    }
    const kind = ri(1, 3);
    if (kind === 1) {
      const p = pick([5, 10, 12.5, 15, 20, 25, 30, 35, 40, 45, 60, 75, 80, 120, 150, 250]), n = 40 * ri(1, 15), r = (p * n) / 100;
      return { q: `What is $${p}\\%$ of $${n}$?`, ans: A(r, `${r}`), sol: [`$${p}\\%\\times${n}=${p / 100}\\times${n}=${r}$`] };
    }
    if (kind === 2) {
      let a, r, b;
      do { a = pick([20, 40, 50, 80, 120, 160, 200, 250, 400]); r = pick([-75, -50, -40, -25, -20, -10, 10, 20, 25, 30, 50, 75, 100, 150]); b = (a * (100 + r)) / 100; } while (!Number.isInteger(b));
      return { q: `A price goes from $${a}$ to $${b}$. What is the percent change? (negative for a decrease)`, ans: A(r, `${r}\\%`),
        sol: [`$\\frac{\\text{new}-\\text{old}}{\\text{old}}\\times100\\%=\\frac{${b - a}}{${a}}\\times100\\%=${r}\\%$`] };
    }
    const p = pick([10, 20, 25, 50]), q = pick([10, 20, 25, 50]), r = ((100 + p) * (100 - q) - 10000) / 100;
    return { q: `A price rises $${p}\\%$, then falls $${q}\\%$. What is the overall percent change?`, ans: A(r, `${r}\\%`),
      sol: [`Multiply the factors: $${1 + p / 100}\\times${1 - q / 100}=${((100 + p) * (100 - q)) / 10000}$`, `So the net change is $${r}\\%$ — not $${p - q}\\%$.`] };
  });

  // ───────────────────────── Linear equations
  T('linear', 'Linear Equations', '一元一次方程', (d) => {
    if (d === 1) {
      const a = nz(-9, 9), x = ri(-10, 10), b = nz(-15, 15), rhs = a * x + b;
      return { q: `Solve $${poly([a, b])}=${rhs}$`, ans: A(x, `x=${x}`),
        sol: [`${b > 0 ? 'Subtract' : 'Add'} $${Math.abs(b)}$: $${poly([a, 0])}=${rhs - b}$`, `Divide by $${a}$: $x=${x}$`] };
    }
    let a, c, x, xn, xd;
    if (d === 2) {
      do { a = nz(-9, 9); c = nz(-9, 9); } while (a === c);
      xn = ri(-10, 10); xd = 1;
    } else {
      xd = ri(2, 5);
      do xn = nz(-12, 12); while (gcd(xn, xd) !== 1);
      const k = nz(-2, 2);
      do c = nz(-6, 6); while (c + xd * k === 0);
      a = c + xd * k;
    }
    x = xn / xd;
    const b = ri(-20, 20), rhs = ((a - c) * xn) / xd + b;
    const steps = [
      `Move $x$ terms left, numbers right: $${poly([a - c, 0])}=${rhs}${b < 0 ? '+' : '-'}${Math.abs(b)}$`,
      `$${poly([a - c, 0])}=${rhs - b}$`,
      `$x=${F(rhs - b, a - c)}$`,
    ];
    return { q: `Solve $${poly([a, b])}=${poly([c, rhs])}$`, ans: A(x, `x=${F(xn, xd)}`), sol: steps };
  });

  // ───────────────────────── Systems
  T('systems', 'Systems of Equations', '二元一次方程组', (d) => {
    const R = [3, 6, 9][d - 1];
    let a1, b1, a2, b2;
    do { a1 = nz(-R, R); b1 = nz(-R, R); a2 = nz(-R, R); b2 = nz(-R, R); } while (a1 * b2 - a2 * b1 === 0);
    const x = ri(-8, 8), y = ri(-8, 8), c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
    const e1 = terms([[a1, 'x'], [b1, 'y']]), e2 = terms([[a2, 'x'], [b2, 'y']]);
    const cy = a2 * b1 - a1 * b2, cc = a2 * c1 - a1 * c2;
    return {
      q: `Solve $\\begin{cases}${e1}=${c1}\\\\${e2}=${c2}\\end{cases}$ &nbsp;Answer as $(x,\\,y)$.`,
      ans: A([x, y], `(${x},\\ ${y})`, { tuple: true }),
      sol: [
        `Eliminate $x$: $${pa(a2)}\\times$ (1) $-\\ ${pa(a1)}\\times$ (2):`,
        `$${terms([[cy, 'y']])}=${cc}\\ \\Rightarrow\\ y=${y}$`,
        `Back into (1): $${terms([[a1, 'x'], [b1 * y, '']])}=${c1}\\ \\Rightarrow\\ x=${x}$`,
      ],
    };
  });

  // ───────────────────────── Quadratics
  T('quad', 'Quadratics', '二次方程与函数', (d) => {
    if (d === 1) {
      const r1 = ri(-9, 9), r2 = ri(-9, 9);
      return { q: `Solve $${poly([1, -(r1 + r2), r1 * r2])}=0$`, ans: A([r1, r2], r1 === r2 ? `x=${r1}` : `x=${r1},\\ ${r2}`, { set: true }),
        sol: [`Find two numbers that multiply to $${r1 * r2}$ and add to $${-(r1 + r2)}$.`, `$${fx(r1)}${fx(r2)}=0\\ \\Rightarrow\\ x=${r1}${r1 === r2 ? '' : `\\text{ or }${r2}`}$`] };
    }
    if (d === 2) {
      if (Math.random() < 0.5) {
        const q = ri(2, 4); let p; do p = nz(-7, 7); while (gcd(p, q) !== 1);
        const r = ri(-6, 6), f1 = `(${q}x${p > 0 ? '-' : '+'}${Math.abs(p)})`;
        return { q: `Solve $${poly([q, -(q * r + p), p * r])}=0$`, ans: A([p / q, r], `x=${F(p, q)},\\ ${r}`, { set: true }),
          sol: [`Factor: $${f1}${fx(r)}=0$`, `$x=${F(p, q)}\\text{ or }x=${r}$`] };
      }
      const a = nz(-3, 3), h = ri(-6, 6), k = ri(-10, 10), b = -2 * a * h, c = a * h * h + k;
      return { q: `Find the vertex of $y=${poly([a, b, c])}$. Answer as $(h,\\,k)$.`, ans: A([h, k], `(${h},\\ ${k})`, { tuple: true }),
        sol: [`$h=-\\frac{b}{2a}=-\\frac{${b}}{${2 * a}}=${h}$`, `$k=y(${h})=${k}$`] };
    }
    const kind = ri(1, 3);
    if (kind === 1) {
      let b, c, D;
      do { b = ri(-8, 8); c = ri(-10, 10); D = b * b - 4 * c; } while (D <= 0 || isSq(D));
      const [m, n] = sqrtSimp(D);
      let tex = `\\frac{${-b}\\pm${m === 1 ? '' : m}\\sqrt{${n}}}{2}`;
      if (b % 2 === 0 && m % 2 === 0) tex = `${b === 0 ? '' : -b / 2}\\pm${m / 2 === 1 ? '' : m / 2}\\sqrt{${n}}`;
      return { q: `Solve $${poly([1, b, c])}=0$ (exact form, e.g. $(-3+\\sqrt{5})/2$)`,
        ans: A([(-b + Math.sqrt(D)) / 2, (-b - Math.sqrt(D)) / 2], `x=${tex}`, { set: true, approx: true }),
        sol: [`$\\Delta=b^2-4ac=${b * b}${c < 0 ? '+' : '-'}${Math.abs(4 * c)}=${D}$`, `$x=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}=\\frac{${-b}\\pm\\sqrt{${D}}}{2}=${tex}$`] };
    }
    if (kind === 2) {
      let a, b, c;
      do { a = nz(-5, 5); b = ri(-9, 9); c = nz(-9, 9); } while (b * b - 4 * a * c < 0);
      const sum = Math.random() < 0.5;
      return { q: `For $${poly([a, b, c])}=0$, find the ${sum ? 'sum' : 'product'} of the roots.`,
        ans: sum ? A(-b / a, F(-b, a)) : A(c / a, F(c, a)),
        sol: [sum ? `Vieta: $x_1+x_2=-\\frac{b}{a}=-\\frac{${b}}{${a}}=${F(-b, a)}$` : `Vieta: $x_1x_2=\\frac{c}{a}=\\frac{${c}}{${a}}=${F(c, a)}$`] };
    }
    const want = ri(0, 2);
    let a, b, c, D;
    if (want === 1) { a = nz(-3, 3); const r = ri(-5, 5); b = -2 * a * r; c = a * r * r; D = 0; }
    else do { a = nz(-4, 4); b = ri(-8, 8); c = ri(-9, 9); D = b * b - 4 * a * c; } while (want === 2 ? D <= 0 : D >= 0);
    return { q: `How many real roots does $${poly([a, b, c])}=0$ have?`, ans: A(want, `${want}`),
      sol: [`$\\Delta=b^2-4ac=${pa(b)}^2-4(${a})(${c})=${D}$`, D > 0 ? '$\\Delta>0$: two real roots.' : D === 0 ? '$\\Delta=0$: one (repeated) real root.' : '$\\Delta<0$: no real roots.'] };
  });

  // ───────────────────────── Exponents & logs
  T('explog', 'Exponents & Logs', '指数与对数', (d) => {
    if (d === 1) {
      if (Math.random() < 0.5) {
        const a = ri(-5, 9), b = ri(-5, 9), c = ri(-5, 9), n = a + b - c;
        return { q: `$\\dfrac{x^{${a}}\\cdot x^{${b}}}{x^{${c}}}=x^{n}$. Find $n$.`, ans: A(n, `${n}`),
          sol: [`Add exponents to multiply, subtract to divide: $n=${a}+${pa(b)}-${pa(c)}=${n}$`] };
      }
      let base, e; do { base = ri(2, 5); e = ri(-3, 4); } while (base ** Math.abs(e) > 625);
      const v = e >= 0 ? base ** e : 1 / base ** -e, tex = e >= 0 ? `${base ** e}` : F(1, base ** -e);
      return { q: `$${base}^{${e}}$`, ans: A(v, tex),
        sol: [e === 0 ? 'Any nonzero number to the power $0$ is $1$.' : e < 0 ? `$${base}^{${e}}=\\frac{1}{${base}^{${-e}}}=${tex}$` : `$${base}^{${e}}=${tex}$`] };
    }
    if (d === 2) {
      if (Math.random() < 0.5) {
        let r, q, p;
        do { r = pick([2, 3, 4, 5]); q = pick([2, 3]); p = pick([1, 2, 3, -1, -2]); } while (r ** q > 125 || r ** Math.abs(p) > 125 || gcd(Math.abs(p), q) !== 1);
        const base = r ** q, val = p > 0 ? r ** p : 1 / r ** -p, tex = p > 0 ? `${r ** p}` : F(1, r ** -p);
        const root = q === 2 ? `\\sqrt{${base}}` : `\\sqrt[3]{${base}}`;
        return { q: `$${base}^{${F(p, q)}}$`, ans: A(val, tex), sol: [`$${base}^{${F(p, q)}}=\\left(${root}\\right)^{${p}}=${r}^{${p}}=${tex}$`] };
      }
      let p, m, n;
      do { p = pick([2, 3, 5]); m = ri(1, 3); n = ri(-3, 6); } while (p ** m > 125 || p ** Math.abs(n) > 729 || n === m);
      const base = p ** m, arg = n >= 0 ? `${p ** n}` : `\\frac{1}{${p ** -n}}`;
      return { q: `$\\log_{${base}} ${arg}$`, ans: A(n / m, F(n, m)),
        sol: [`Write both as powers of $${p}$: $${base}=${p}^{${m}}$, $${arg}=${p}^{${n}}$.`, `$\\log_{${base}} ${arg}=\\frac{${n}}{${m}}=${F(n, m)}$`] };
    }
    const kind = ri(1, 3);
    if (kind === 1) {
      let p, n; do { p = pick([2, 3, 5]); n = ri(-3, 5); } while (p ** Math.abs(n) > 625);
      const a = pick([1, 2, 3, -1, -2]), b = ri(-4, 4), N = n >= 0 ? `${p ** n}` : `\\frac{1}{${p ** -n}}`;
      return { q: `Solve $${p}^{${poly([a, b])}}=${N}$`, ans: A((n - b) / a, `x=${F(n - b, a)}`),
        sol: [`$${N}=${p}^{${n}}$, so the exponents match: $${poly([a, b])}=${n}$`, `$x=${F(n - b, a)}$`] };
    }
    if (kind === 2) {
      const b = pick([6, 10, 12, 15, 20]), k = pick([2, 3]), tot = b ** k;
      const divs = []; for (let i = 2; i < tot; i++) if (tot % i === 0 && i !== b && tot / i !== b) divs.push(i);
      const M = pick(divs), N = tot / M;
      return { q: `$\\log_{${b}} ${M}+\\log_{${b}} ${N}$`, ans: A(k, `${k}`),
        sol: [`$\\log_b M+\\log_b N=\\log_b(MN)$`, `$\\log_{${b}}(${M}\\times${N})=\\log_{${b}}${tot}=${k}$`] };
    }
    const b = pick([2, 3, 5, 10]), k = ri(1, 3), N = ri(2, 9), M = N * b ** k;
    return { q: `$\\log_{${b}} ${M}-\\log_{${b}} ${N}$`, ans: A(k, `${k}`),
      sol: [`$\\log_b M-\\log_b N=\\log_b\\frac{M}{N}$`, `$\\log_{${b}}\\frac{${M}}{${N}}=\\log_{${b}}${b ** k}=${k}$`] };
  });

  // ───────────────────────── Functions
  T('func', 'Functions', '函数', (d) => {
    if (d === 1) {
      const a = nz(-4, 4), b = ri(-6, 6), c = ri(-9, 9), k = ri(-4, 4), v = a * k * k + b * k + c;
      return { q: `If $f(x)=${poly([a, b, c])}$, find $f(${k})$.`, ans: A(v, `${v}`),
        sol: [`$f(${k})=${a}\\cdot${pa(k)}^2${b < 0 ? '-' : '+'}${Math.abs(b)}\\cdot${pa(k)}${c < 0 ? '-' : '+'}${Math.abs(c)}=${v}$`] };
    }
    if (d === 2) {
      if (Math.random() < 0.5) {
        const a = nz(-5, 5), b = ri(-6, 6), c = ri(-6, 6), k = ri(-3, 3);
        const f = (x) => a * x + b, g = (x) => x * x + c, fog = Math.random() < 0.5;
        const inner = fog ? g(k) : f(k), val = fog ? f(inner) : g(inner);
        return { q: `$f(x)=${poly([a, b])}$, $g(x)=${poly([1, 0, c])}$. Find $${fog ? 'f(g' : 'g(f'}(${k}))$.`, ans: A(val, `${val}`),
          sol: [`Inside first: $${fog ? 'g' : 'f'}(${k})=${inner}$`, `$${fog ? 'f' : 'g'}(${inner})=${val}$`] };
      }
      const a = nz(-6, 6), b = ri(-9, 9), k = ri(-12, 12);
      return { q: `If $f(x)=${poly([a, b])}$, find $f^{-1}(${k})$.`, ans: A((k - b) / a, F(k - b, a)),
        sol: [`$f^{-1}(${k})$ is the $x$ with $f(x)=${k}$: $${poly([a, b])}=${k}$`, `$x=\\frac{${k}-${pa(b)}}{${a}}=${F(k - b, a)}$`] };
    }
    if (Math.random() < 0.5) {
      const a = nz(-4, 4), b = ri(-6, 6), c = nz(-4, 4), e = ri(-6, 6), x0 = ri(-6, 6), K = a * (c * x0 + e) + b;
      return { q: `$f(x)=${poly([a, b])}$, $g(x)=${poly([c, e])}$. Solve $f(g(x))=${K}$.`, ans: A(x0, `x=${x0}`),
        sol: [`$f(g(x))=${a}\\left(${poly([c, e])}\\right)${b < 0 ? '-' : '+'}${Math.abs(b)}=${poly([a * c, a * e + b])}$`, `$${poly([a * c, a * e + b])}=${K}\\ \\Rightarrow\\ x=${x0}$`] };
    }
    const c = ri(-4, 4), k = ri(-3, 3), f = (x) => x * x + c, one = f(k), two = f(one);
    return { q: `If $f(x)=${poly([1, 0, c])}$, find $f(f(${k}))$.`, ans: A(two, `${two}`), sol: [`$f(${k})=${one}$`, `$f(${one})=${pa(one)}^2${c < 0 ? '-' : '+'}${Math.abs(c)}=${two}$`] };
  });

  // ───────────────────────── Trig
  const EXACT = [[0, '0'], [0.5, '\\frac{1}{2}'], [Math.SQRT2 / 2, '\\frac{\\sqrt{2}}{2}'], [Math.sqrt(3) / 2, '\\frac{\\sqrt{3}}{2}'], [1, '1'], [Math.sqrt(3) / 3, '\\frac{\\sqrt{3}}{3}'], [Math.sqrt(3), '\\sqrt{3}']];
  const exactTex = (v) => { const m = EXACT.find(([x]) => Math.abs(Math.abs(v) - x) < 1e-9); return (v < -1e-9 ? '-' : '') + m[1]; };
  const radTex = (deg) => {
    const [n, dd] = red(deg, 180);
    if (n === 0) return '0';
    const num = n === 1 ? '\\pi' : `${n}\\pi`;
    return dd === 1 ? num : `\\frac{${num}}{${dd}}`;
  };
  T('trig', 'Trigonometry', '三角函数', (d) => {
    if (d === 1) {
      const deg = pick([30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360, 15, 75, 105]);
      if (Math.random() < 0.5) return { q: `Convert $${deg}^\\circ$ to radians.`, ans: A((deg * Math.PI) / 180, radTex(deg), { approx: true }),
        sol: [`Multiply by $\\frac{\\pi}{180^\\circ}$: $${deg}\\cdot\\frac{\\pi}{180}=${radTex(deg)}$`] };
      return { q: `Convert $${radTex(deg)}$ radians to degrees.`, ans: A(deg, `${deg}^\\circ`),
        sol: [`Replace $\\pi$ with $180^\\circ$: $${radTex(deg)}\\to${deg}^\\circ$`] };
    }
    if (d === 2) {
      const fn = pick(['sin', 'cos', 'tan']);
      let deg; do deg = pick([0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]); while (fn === 'tan' && deg % 180 === 90);
      const rad = (deg * Math.PI) / 180, v = Math[fn](rad), vv = Math.abs(v) < 1e-12 ? 0 : v;
      const ang = Math.random() < 0.5 ? `${deg}^\\circ` : radTex(deg);
      const ref = deg <= 90 ? deg : deg <= 180 ? 180 - deg : deg <= 270 ? deg - 180 : 360 - deg;
      const quad = deg % 90 === 0 ? 'on an axis' : `in quadrant ${['I', 'II', 'III', 'IV'][Math.floor(deg / 90)]}`;
      return { q: `$\\${fn}\\left(${ang}\\right)$`, ans: A(vv, exactTex(vv), { approx: true }),
        sol: [deg % 90 === 0 ? `$${deg}^\\circ$ is ${quad} — read it off the unit circle.` : `Reference angle $${ref}^\\circ$, ${quad}, so $\\${fn}$ is ${vv < 0 ? 'negative' : 'positive'}.`, `$\\${fn}\\left(${ang}\\right)=${exactTex(vv)}$`] };
    }
    let [o, a, h] = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]]);
    if (Math.random() < 0.5) [o, a] = [a, o];
    const Q = ri(1, 4), sS = Q <= 2 ? 1 : -1, sC = Q === 1 || Q === 4 ? 1 : -1, rom = ['I', 'II', 'III', 'IV'][Q - 1];
    const vals = { sin: [sS * o, h], cos: [sC * a, h], tan: [sS * sC * o, a] };
    const given = pick(['sin', 'cos']), target = pick(['sin', 'cos', 'tan'].filter((f) => f !== given));
    const [gn, gd] = vals[given], [tn, td] = vals[target];
    return { q: `$\\${given}\\theta=${F(gn, gd)}$ and $\\theta$ is in quadrant ${rom}. Find $\\${target}\\theta$.`, ans: A(tn / td, F(tn, td)),
      sol: [`Right triangle with sides $${o},\\ ${a},\\ ${h}$ (from $\\sin^2\\theta+\\cos^2\\theta=1$).`, `Quadrant ${rom}: $\\sin$ is ${sS > 0 ? '+' : '−'}, $\\cos$ is ${sC > 0 ? '+' : '−'}.`, `$\\${target}\\theta=${F(tn, td)}$`] };
  });

  // ───────────────────────── Sequences
  T('seq', 'Sequences', '数列', (d) => {
    const a1 = ri(-10, 20), dd = nz(-6, 9), list = (n) => `${a1}, ${a1 + dd}, ${a1 + 2 * dd}, \\ldots`;
    if (d === 1) {
      const n = ri(8, 40), an = a1 + (n - 1) * dd;
      return { q: `Arithmetic sequence $${list()}$. Find $a_{${n}}$.`, ans: A(an, `${an}`),
        sol: [`$d=${dd}$`, `$a_n=a_1+(n-1)d=${a1}+${n - 1}\\cdot${pa(dd)}=${an}$`] };
    }
    if (d === 2) {
      if (Math.random() < 0.5) {
        const n = ri(8, 25), S = (n * (2 * a1 + (n - 1) * dd)) / 2;
        return { q: `Sum of the first $${n}$ terms of $${list()}$`, ans: A(S, `${S}`),
          sol: [`$S_n=\\frac{n}{2}\\left(2a_1+(n-1)d\\right)$`, `$=\\frac{${n}}{2}\\left(${2 * a1}+${n - 1}\\cdot${pa(dd)}\\right)=${S}$`] };
      }
      const [rn, rd, g1] = Math.random() < 0.75 ? [pick([2, 3, -2, -3]), 1, ri(1, 5) * pick([1, -1])] : [1, 2, pick([64, 96, 128, 160])];
      const n = ri(4, 7), num = g1 * rn ** (n - 1), den = rd ** (n - 1), t = (k) => F(g1 * rn ** k, rd ** k);
      return { q: `Geometric sequence $${t(0)}, ${t(1)}, ${t(2)}, \\ldots$ Find $a_{${n}}$.`, ans: A(num / den, F(num, den)),
        sol: [`$r=${F(rn, rd)}$`, `$a_n=a_1r^{n-1}=${g1}\\cdot\\left(${F(rn, rd)}\\right)^{${n - 1}}=${F(num, den)}$`] };
    }
    const kind = ri(1, 3);
    if (kind === 1) {
      const m = ri(2, 6), n = m + ri(2, 8), am = a1 + (m - 1) * dd, an = a1 + (n - 1) * dd;
      return { q: `In an arithmetic sequence, $a_{${m}}=${am}$ and $a_{${n}}=${an}$. Find $a_1$.`, ans: A(a1, `${a1}`),
        sol: [`$d=\\frac{${an}-${pa(am)}}{${n}-${m}}=${dd}$`, `$a_1=a_{${m}}-${m - 1}d=${am}-${m - 1}\\cdot${pa(dd)}=${a1}$`] };
    }
    if (kind === 2) {
      const r = pick([2, 3, -2]), g = ri(1, 5), n = ri(4, 7), S = (g * (r ** n - 1)) / (r - 1);
      return { q: `Sum of the first $${n}$ terms of $${g}, ${g * r}, ${g * r * r}, \\ldots$`, ans: A(S, `${S}`),
        sol: [`$S_n=a_1\\frac{r^n-1}{r-1}=${g}\\cdot\\frac{${pa(r)}^{${n}}-1}{${r}-1}=${S}$`] };
    }
    const [rn, rd] = pick([[1, 2], [1, 3], [-1, 2], [2, 3], [1, 4], [-1, 3], [3, 4]]), g = ri(1, 12), rt = F(rn, rd);
    return { q: `Infinite geometric series $${g}+${F(g * rn, rd)}+${F(g * rn * rn, rd * rd)}+\\cdots$`.replace(/\+-/g, '-'), ans: A((g * rd) / (rd - rn), F(g * rd, rd - rn)),
      sol: [`$|r|=|${rt}|<1$, so it converges.`, `$S=\\frac{a_1}{1-r}=\\frac{${g}}{1-\\left(${rt}\\right)}=${F(g * rd, rd - rn)}$`] };
  });

  // ───────────────────────── Counting & probability
  T('prob', 'Counting & Probability', '排列组合与概率', (d) => {
    if (d === 1) {
      const kind = ri(1, 3);
      if (kind === 1) {
        const n = ri(5, 10), k = ri(2, 4);
        return { q: `How many ways to choose $${k}$ people from $${n}$? (order doesn't matter)`, ans: A(C(n, k), `${C(n, k)}`),
          sol: [`$\\binom{${n}}{${k}}=\\frac{${n}!}{${k}!\\,${n - k}!}=${C(n, k)}$`] };
      }
      if (kind === 2) {
        const n = ri(5, 9), k = ri(2, 3), f = []; for (let i = 0; i < k; i++) f.push(n - i);
        const v = f.reduce((x, y) => x * y, 1);
        return { q: `How many ways can $${k}$ of $${n}$ runners finish 1st, 2nd${k === 3 ? ', 3rd' : ''}?`, ans: A(v, `${v}`),
          sol: [`Order matters: $${f.join('\\times')}=${v}$`] };
      }
      const [ev, num] = pick([['an even number', 3], ['a prime number', 3], ['a multiple of 3', 2], ['greater than 4', 2], ['less than 3', 2], ['at least 2', 5]]);
      return { q: `Roll a fair die. $P(\\text{${ev}})=?$`, ans: A(num / 6, F(num, 6)), sol: [`$${num}$ of the $6$ faces work: $\\frac{${num}}{6}=${F(num, 6)}$`] };
    }
    if (d === 2) {
      const kind = ri(1, 3);
      if (kind === 1) {
        const s = ri(2, 12), w = 6 - Math.abs(s - 7);
        return { q: `Roll two fair dice. $P(\\text{sum}=${s})=?$`, ans: A(w / 36, F(w, 36)), sol: [`$${w}$ of the $36$ ordered outcomes add to $${s}$.`, `$\\frac{${w}}{36}=${F(w, 36)}$`] };
      }
      if (kind === 2) {
        const R = ri(2, 6), B = ri(2, 6), Tt = R + B;
        return { q: `A bag has $${R}$ red and $${B}$ blue balls. Draw $2$ without replacement. $P(\\text{both red})=?$`, ans: A((R * (R - 1)) / (Tt * (Tt - 1)), F(R * (R - 1), Tt * (Tt - 1))),
          sol: [`$\\frac{${R}}{${Tt}}\\cdot\\frac{${R - 1}}{${Tt - 1}}=${F(R * (R - 1), Tt * (Tt - 1))}$`] };
      }
      const n = ri(3, 6), k = ri(0, n), c = C(n, k), tot = 2 ** n;
      return { q: `Flip a fair coin $${n}$ times. $P(\\text{exactly } ${k} \\text{ heads})=?$`, ans: A(c / tot, F(c, tot)),
        sol: [`$\\frac{\\binom{${n}}{${k}}}{2^{${n}}}=\\frac{${c}}{${tot}}=${F(c, tot)}$`] };
    }
    const kind = ri(1, 3);
    if (kind === 1) {
      const w = pick(['LEVEL', 'BANANA', 'LETTER', 'COFFEE', 'BALLOON', 'SUCCESS', 'STATISTICS', 'MISSISSIPPI', 'BOOKKEEPER']);
      const cnt = {}; for (const ch of w) cnt[ch] = (cnt[ch] || 0) + 1;
      const reps = Object.values(cnt).filter((x) => x > 1);
      const v = reps.reduce((x, r) => x / fact(r), fact(w.length));
      return { q: `How many distinct arrangements of the letters in $\\text{${w}}$?`, ans: A(v, `${v}`),
        sol: [`$${w.length}$ letters; repeats: ${Object.entries(cnt).filter(([, x]) => x > 1).map(([c, x]) => `${c}×${x}`).join(', ')}.`, `$\\frac{${w.length}!}{${reps.map((r) => r + '!').join('\\,')}}=${v}$`] };
    }
    if (kind === 2) {
      const n = ri(2, 4), num = 6 ** n - 5 ** n, den = 6 ** n;
      return { q: `Roll a fair die $${n}$ times. $P(\\text{at least one } 6)=?$`, ans: A(num / den, F(num, den)),
        sol: [`Complement: $P(\\text{no } 6)=\\left(\\frac{5}{6}\\right)^{${n}}=\\frac{${5 ** n}}{${den}}$`, `$1-\\frac{${5 ** n}}{${den}}=${F(num, den)}$`] };
    }
    const M = ri(4, 7), W = ri(3, 6), k = ri(3, 4), j = ri(1, Math.min(k - 1, W)), v = C(W, j) * C(M, k - j);
    return { q: `A committee of $${k}$ is chosen from $${M}$ boys and $${W}$ girls. How many committees have exactly $${j}$ girl${j > 1 ? 's' : ''}?`, ans: A(v, `${v}`),
      sol: [`$\\binom{${W}}{${j}}\\binom{${M}}{${k - j}}=${C(W, j)}\\times${C(M, k - j)}=${v}$`] };
  });

  // ───────────────────────── Statistics
  T('stats', 'Statistics', '统计', (d) => {
    const list = (n, lo, hi) => Array.from({ length: n }, () => ri(lo, hi));
    const show = (xs) => xs.join(',\\ ');
    const sorted = (xs) => [...xs].sort((a, b) => a - b);
    if (d === 1) {
      const xs = list(5, 1, 20), kind = ri(1, 3);
      if (kind === 1) {
        xs[4] += (5 - (xs.reduce((a, b) => a + b, 0) % 5)) % 5;
        const s = xs.reduce((a, b) => a + b, 0);
        return { q: `Find the mean of $${show(xs)}$`, ans: A(s / 5, `${s / 5}`), sol: [`$\\frac{${s}}{5}=${s / 5}$`] };
      }
      const sx = sorted(xs);
      if (kind === 2) return { q: `Find the median of $${show(xs)}$`, ans: A(sx[2], `${sx[2]}`), sol: [`Sorted: $${show(sx)}$`, `Middle value: $${sx[2]}$`] };
      return { q: `Find the range of $${show(xs)}$`, ans: A(sx[4] - sx[0], `${sx[4] - sx[0]}`), sol: [`$\\max-\\min=${sx[4]}-${sx[0]}=${sx[4] - sx[0]}$`] };
    }
    if (d === 2) {
      const kind = ri(1, 3);
      if (kind === 1) {
        const xs = list(6, 1, 30), sx = sorted(xs), m = (sx[2] + sx[3]) / 2;
        return { q: `Find the median of $${show(xs)}$`, ans: A(m, `${m}`), sol: [`Sorted: $${show(sx)}$`, `Even count — average the middle two: $\\frac{${sx[2]}+${sx[3]}}{2}=${m}$`] };
      }
      if (kind === 2) {
        const m = ri(1, 20), others = []; while (others.length < 4) { const v = ri(1, 20); if (v !== m && !others.includes(v)) others.push(v); }
        const xs = [m, m, m, ...others].sort(() => Math.random() - 0.5);
        return { q: `Find the mode of $${show(xs)}$`, ans: A(m, `${m}`), sol: [`$${m}$ appears $3$ times — more than any other value.`] };
      }
      const xs = list(6, 1, 30), s = xs.reduce((a, b) => a + b, 0);
      return { q: `Find the mean of $${show(xs)}$`, ans: A(s / 6, F(s, 6), { approx: true }), sol: [`$\\frac{${s}}{6}=${F(s, 6)}${s % 6 ? `\\approx${(s / 6).toFixed(2)}` : ''}$`] };
    }
    if (Math.random() < 0.5) {
      let n, M, xs, miss;
      do { n = ri(4, 6); M = ri(8, 25); xs = list(n, 2, 35); miss = M * (n + 1) - xs.reduce((a, b) => a + b, 0); } while (miss < 0 || miss > 60);
      return { q: `The mean of $${show(xs)},\\ x$ is $${M}$. Find $x$.`, ans: A(miss, `${miss}`),
        sol: [`Total must be $${M}\\times${n + 1}=${M * (n + 1)}$`, `$x=${M * (n + 1)}-${xs.reduce((a, b) => a + b, 0)}=${miss}$`] };
    }
    const m = ri(5, 20), dev = pick([[-2, -1, 0, 1, 2], [-3, -1, 1, 3], [-4, 0, 0, 4], [-3, -2, 0, 2, 3], [-1, -1, 1, 1], [-5, -1, 0, 1, 5], [-6, 0, 2, 4]]);
    const mean = dev.reduce((a, b) => a + b, 0) / dev.length, xs = dev.map((v) => m + v).sort(() => Math.random() - 0.5);
    const ss = dev.reduce((a, v) => a + (v - mean) ** 2, 0);
    return { q: `Find the population variance of $${show(xs)}$`, ans: A(ss / dev.length, F(ss, dev.length), { approx: true }),
      sol: [`Mean $=${m + mean}$`, `Squared deviations sum to $${ss}$`, `$\\sigma^2=\\frac{${ss}}{${dev.length}}=${F(ss, dev.length)}$`] };
  });

  // ───────────────────────── Geometry & coordinates
  T('geo', 'Geometry & Coordinates', '几何与坐标', (d) => {
    const pt = () => [ri(-9, 9), ri(-9, 9)];
    const ptx = ([x, y]) => `(${x},\\,${y})`;
    if (d === 1) {
      const kind = ri(1, 3);
      if (kind === 1) {
        let p, q; do { p = pt(); q = pt(); } while (p[0] === q[0]);
        const dy = q[1] - p[1], dx = q[0] - p[0];
        return { q: `Slope of the line through $${ptx(p)}$ and $${ptx(q)}$`, ans: A(dy / dx, F(dy, dx)), sol: [`$m=\\frac{${q[1]}-${pa(p[1])}}{${q[0]}-${pa(p[0])}}=\\frac{${dy}}{${dx}}=${F(dy, dx)}$`] };
      }
      if (kind === 2) {
        const p = pt(), q = pt(), mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
        return { q: `Midpoint of $${ptx(p)}$ and $${ptx(q)}$. Answer as $(x,\\,y)$.`, ans: A([mx, my], `(${F(p[0] + q[0], 2)},\\ ${F(p[1] + q[1], 2)})`, { tuple: true }),
          sol: [`Average the coordinates: $\\left(\\frac{${p[0]}+${pa(q[0])}}{2},\\ \\frac{${p[1]}+${pa(q[1])}}{2}\\right)=(${mx},\\ ${my})$`] };
      }
      const r = ri(2, 12), dia = Math.random() < 0.3, area = Math.random() < 0.6;
      const given = dia ? `diameter $${2 * r}$` : `radius $${r}$`;
      return area
        ? { q: `Area of a circle with ${given}, in terms of $\\pi$`, ans: A(r * r * Math.PI, `${r * r}\\pi`), sol: [dia ? `$r=${r}$` : '', `$A=\\pi r^2=${r * r}\\pi$`].filter(Boolean) }
        : { q: `Circumference of a circle with ${given}, in terms of $\\pi$`, ans: A(2 * r * Math.PI, `${2 * r}\\pi`), sol: [`$C=2\\pi r=${2 * r}\\pi$`] };
    }
    if (d === 2) {
      const kind = ri(1, 3);
      if (kind === 1) {
        const p = pt(); let dx, dy;
        if (Math.random() < 0.6) { [dx, dy] = pick([[3, 4], [4, 3], [5, 12], [12, 5], [6, 8], [8, 6], [8, 15]]); dx *= pick([1, -1]); dy *= pick([1, -1]); }
        else do { dx = ri(-7, 7); dy = ri(-7, 7); } while (!dx || !dy);
        const q = [p[0] + dx, p[1] + dy], s = dx * dx + dy * dy;
        return { q: `Distance between $${ptx(p)}$ and $${ptx(q)}$`, ans: A(Math.sqrt(s), sqrtTex(s), { approx: true }),
          sol: [`$d=\\sqrt{${pa(dx)}^2+${pa(dy)}^2}=\\sqrt{${s}}=${sqrtTex(s)}$`] };
      }
      if (kind === 2) {
        const [a, b, c] = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]]).map((v, _, arr) => v), k = ri(1, 3);
        if (Math.random() < 0.5) return { q: `A right triangle has legs $${a * k}$ and $${b * k}$. Find the hypotenuse.`, ans: A(c * k, `${c * k}`), sol: [`$\\sqrt{${a * k}^2+${b * k}^2}=\\sqrt{${(c * k) ** 2}}=${c * k}$`] };
        return { q: `A right triangle has hypotenuse $${c * k}$ and one leg $${a * k}$. Find the other leg.`, ans: A(b * k, `${b * k}`), sol: [`$\\sqrt{${c * k}^2-${a * k}^2}=\\sqrt{${(b * k) ** 2}}=${b * k}$`] };
      }
      let p, q; do { p = pt(); q = pt(); } while (p[0] === q[0]);
      const dy = q[1] - p[1], dx = q[0] - p[0], bn = p[1] * dx - dy * p[0];
      return { q: `Find the $y$-intercept of the line through $${ptx(p)}$ and $${ptx(q)}$.`, ans: A(bn / dx, F(bn, dx)),
        sol: [`$m=${F(dy, dx)}$`, `$b=y_1-mx_1=${p[1]}-\\left(${F(dy, dx)}\\right)\\left(${p[0]}\\right)=${F(bn, dx)}$`] };
    }
    const kind = ri(1, 3);
    if (kind === 1) {
      let P, Q, R, s; do { P = pt(); Q = pt(); R = pt(); s = P[0] * (Q[1] - R[1]) + Q[0] * (R[1] - P[1]) + R[0] * (P[1] - Q[1]); } while (s === 0);
      return { q: `Area of the triangle with vertices $${ptx(P)}$, $${ptx(Q)}$, $${ptx(R)}$`, ans: A(Math.abs(s) / 2, F(Math.abs(s), 2)),
        sol: ['Shoelace: $\\frac12\\left|x_1(y_2-y_3)+x_2(y_3-y_1)+x_3(y_1-y_2)\\right|$', `$=\\frac12\\left|${s}\\right|=${F(Math.abs(s), 2)}$`] };
    }
    if (kind === 2) {
      let [a, b] = pick([[3, 4], [4, 3], [5, 12], [12, 5], [6, 8]]); a *= pick([1, -1]); b *= pick([1, -1]);
      const h = Math.sqrt(a * a + b * b), c = ri(-10, 10), [x0, y0] = [ri(-6, 6), ri(-6, 6)], num = Math.abs(a * x0 + b * y0 + c);
      return { q: `Distance from $(${x0},\\,${y0})$ to the line $${terms([[a, 'x'], [b, 'y'], [c, '']])}=0$`, ans: A(num / h, F(num, h)),
        sol: [`$d=\\frac{|ax_0+by_0+c|}{\\sqrt{a^2+b^2}}=\\frac{|${a * x0 + b * y0 + c}|}{${h}}=${F(num, h)}$`] };
    }
    const h = ri(-6, 6), k = ri(-6, 6), r = ri(1, 9), F0 = h * h + k * k - r * r;
    const sq = (v, c) => (c === 0 ? `${v}^2` : `(${v}${c > 0 ? '-' : '+'}${Math.abs(c)})^2`);
    return { q: `Find the radius of the circle $${terms([[1, 'x^2'], [1, 'y^2'], [-2 * h, 'x'], [-2 * k, 'y'], [F0, '']])}=0$`, ans: A(r, `${r}`),
      sol: [`Complete the square: $${sq('x', h)}+${sq('y', k)}=${r * r}$`, `$r=\\sqrt{${r * r}}=${r}$`] };
  });

  // ───────────────────────── Calculus
  T('calc', 'Calculus', '微积分入门', (d) => {
    if (d === 1) {
      const a = nz(-3, 3), b = ri(-5, 5), c = ri(-6, 6), e = ri(-9, 9), k = ri(-3, 3), v = 3 * a * k * k + 2 * b * k + c;
      return { q: `$f(x)=${poly([a, b, c, e])}$. Find $f'(${k})$.`, ans: A(v, `${v}`),
        sol: [`Power rule: $f'(x)=${poly([3 * a, 2 * b, c])}$`, `$f'(${k})=${v}$`] };
    }
    if (d === 2) {
      if (Math.random() < 0.5) {
        const r = ri(-6, 6), s = ri(-6, 6);
        return { q: `$\\displaystyle\\lim_{x\\to ${r}}\\frac{${poly([1, -(r + s), r * s])}}{${terms([[1, 'x'], [-r, '']])}}$`, ans: A(r - s, `${r - s}`),
          sol: [`Plugging in gives $\\frac{0}{0}$ — factor: $\\frac{${fx(r)}${fx(s)}}{${fx(r)}}=${terms([[1, 'x'], [-s, '']])}$`, `$${r}-${pa(s)}=${r - s}$`] };
      }
      let a, b, c; do { a = ri(-2, 3); b = ri(-3, 3); c = ri(-5, 5); } while (!a && !b && !c);
      const L = ri(-2, 1), U = L + ri(1, 3), Fx = (x) => a * x ** 3 + b * x * x + c * x, v = Fx(U) - Fx(L);
      return { q: `$\\displaystyle\\int_{${L}}^{${U}}\\left(${poly([3 * a, 2 * b, c])}\\right)dx$`, ans: A(v, `${v}`),
        sol: [`Antiderivative: $${poly([a, b, c, 0])}$`, `$\\left[\\,\\cdot\\,\\right]_{${L}}^{${U}}=${Fx(U)}-${pa(Fx(L))}=${v}$`] };
    }
    const kind = ri(1, 3);
    if (kind === 1) {
      let r1, r2; do { r1 = ri(-4, 4); r2 = ri(-4, 4); } while (r1 === r2 || (r1 + r2) % 2);
      const c = ri(-5, 5);
      return { q: `Find the $x$-values of the critical points of $f(x)=${poly([1, (-3 * (r1 + r2)) / 2, 3 * r1 * r2, c])}$`, ans: A([r1, r2], `x=${r1},\\ ${r2}`, { set: true }),
        sol: [`$f'(x)=${poly([3, -3 * (r1 + r2), 3 * r1 * r2])}=3${fx(r1)}${fx(r2)}$`, `$f'(x)=0\\Rightarrow x=${r1}\\text{ or }${r2}$`] };
    }
    if (kind === 2) {
      const a = nz(-3, 3), b = ri(-5, 5), c = ri(-6, 6), k = ri(-3, 3), m = 2 * a * k + b, y = a * k * k + b * k + c, bi = y - m * k;
      return { q: `Find the $y$-intercept of the tangent line to $y=${poly([a, b, c])}$ at $x=${k}$.`, ans: A(bi, `${bi}`),
        sol: [`Point: $(${k},\\ ${y})$. Slope: $y'(${k})=${m}$`, `$b=y-mx=${y}-${pa(m)}\\cdot${pa(k)}=${bi}$`] };
    }
    const n = pick([2, 3]), a = ri(1, 3), b = ri(-3, 3), k = ri(-2, 2), v = n * a * (a * k + b) ** (n - 1);
    return { q: `$f(x)=\\left(${poly([a, b])}\\right)^{${n}}$. Find $f'(${k})$.`, ans: A(v, `${v}`),
      sol: [`Chain rule: $f'(x)=${n}\\left(${poly([a, b])}\\right)^{${n - 1}}\\cdot${a}$`, `$f'(${k})=${n * a}\\cdot${pa(a * k + b)}^{${n - 1}}=${v}$`] };
  });

  return topics;
})();
