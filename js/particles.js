// Ambient particle field: dim aurora-colored specks drifting on the dark
// background. With a mouse, particles are gently pushed away from the cursor
// and clicks emit a small spark burst. Skipped entirely under reduced motion;
// paused while the tab is hidden.

(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.getElementById("particles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const COLORS = [[34, 211, 238], [139, 92, 246], [236, 72, 153]];

  let w = 0, h = 0;
  const parts = [];
  const sparks = [];
  const mouse = { x: -1e4, y: -1e4 };

  function newPart() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: 0.6 + Math.random() * 1.5,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      a: 0.12 + Math.random() * 0.35,
      tw: Math.random() * Math.PI * 2,      // twinkle phase
      tws: 0.003 + Math.random() * 0.008,   // twinkle speed
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // particle count scales with viewport, capped for perf
    const target = Math.min(110, Math.round((w * h) / 16000));
    while (parts.length < target) parts.push(newPart());
    parts.length = target;
  }

  if (finePointer) {
    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });

    window.addEventListener("mouseout", () => { mouse.x = -1e4; });

    window.addEventListener("click", (e) => {
      for (let i = 0; i < 14; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 0.8 + Math.random() * 2.2;
        sparks.push({
          x: e.clientX, y: e.clientY,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 1,
          c: COLORS[(Math.random() * COLORS.length) | 0],
        });
      }
      if (sparks.length > 140) sparks.splice(0, sparks.length - 140);
    });
  }

  let running = true;
  document.addEventListener("visibilitychange", () => {
    const wasRunning = running;
    running = !document.hidden;
    if (running && !wasRunning) requestAnimationFrame(tick);
  });

  const REPEL = 130; // px radius of cursor influence

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    for (const p of parts) {
      p.tw += p.tws;
      p.x += p.vx;
      p.y += p.vy;

      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < REPEL * REPEL && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = ((REPEL - d) / REPEL) * 0.5;
        p.x += (dx / d) * f;
        p.y += (dy / d) * f;
      }

      // wrap around edges
      if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
      if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;

      const alpha = p.a * (0.6 + 0.4 * Math.sin(p.tw));
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= 0.025;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.96;
      s.vy *= 0.96;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${s.life * 0.7})`;
      ctx.arc(s.x, s.y, 1.6 * s.life + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();
