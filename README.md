# 刷题 · Math Drill

Endless high-school math practice that runs in the browser: **https://goldenswordgt-ctrl.github.io/math-shuati/**

- **13 topics:** mental math, fractions and percents, linear equations, systems, quadratics, exponents and logs, functions, trig, sequences, counting and probability, statistics, geometry and coordinates, intro calculus
- **3 difficulty levels plus mixed.** Every problem is generated fresh, so sets never repeat.
- **Modes:** Endless, 20-question set, 3-minute sprint
- **Instant checking.** Type `3/4`, `sqrt(3)/2`, `3pi/4`, `2, -3` or `(1, 2)`.
- **Worked solution** for every problem
- **错题本 (mistake notebook):** every miss is saved, and a correct redo crosses it off
- **Stats:** daily goal ring, streak, 14-day activity, accuracy by topic

Plain static HTML/CSS/JS with no build step. KaTeX is vendored in `vendor/` so the site loads without a CDN. Progress is saved in `localStorage`.

Run locally: `python3 -m http.server` and open http://localhost:8000.
