// Dot-field engine for the personal side.
//
// One field of dots, two behaviors. Idle: dots sit on a loose grid and ride
// layered sine waves. When a section is chosen, every dot is assigned a
// point sampled from that section's shape (world map for Travels, "CT" for
// Bio, a CRT TV for Hobbies, a heart for Passions) and eases there — the
// morph *is* the transition. Esc or closing the panel releases them back
// into the waves.

(function () {
  const canvas = document.getElementById("dotfield");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const CYAN = [34, 211, 238], VIOLET = [139, 92, 246], PINK = [236, 72, 153], AMBER = [245, 158, 11];
  const PALETTE = [CYAN, VIOLET, PINK, AMBER];

  let w = 0, h = 0, dots = [];
  const mouse = { x: -1e4, y: -1e4 };
  let mode = "wave";          // "wave" | shape name
  let shapeTargets = null;    // [{x, y, c}] in screen px, one per dot

  // ---------- shape samplers ----------

  // Rasterize a drawing onto an offscreen canvas and return normalized
  // points where pixels landed, plus the drawing's aspect ratio (w/h).
  function samplePoints(aspect, draw) {
    const H = 240, W = Math.round(H * aspect);
    const off = document.createElement("canvas");
    off.width = W; off.height = H;
    const c = off.getContext("2d", { willReadFrequently: true });
    draw(c, W, H);
    const data = c.getImageData(0, 0, W, H).data;
    const pts = [];
    const step = 2; // sampling stride in px
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] > 128) pts.push([x / W, y / H]);
      }
    }
    return { aspect, points: pts };
  }

  const SHAPES = {
    travels() {
      return { aspect: WORLD_MAP.aspect, points: WORLD_MAP.points, color: () => (Math.random() < 0.85 ? CYAN : VIOLET) };
    },
    bio() {
      const s = samplePoints(1.3, (c, W, H) => {
        c.font = `900 ${H * 0.9}px "Segoe UI", system-ui, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText("CT", W / 2, H * 0.56);
      });
      s.color = (p) => (p[0] < 0.5 ? CYAN : PINK); // C cyan, T pink
      return s;
    },
    passions() {
      const s = samplePoints(1.1, (c, W, H) => {
        // classic parametric heart, filled
        c.beginPath();
        for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.05) {
          const x = 16 * Math.sin(t) ** 3;
          const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          const px = W / 2 + (x / 17) * (W / 2) * 0.92;
          const py = H / 2 - ((y - 2) / 15) * (H / 2) * 0.82;
          t === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
        }
        c.fill();
      });
      s.color = () => (Math.random() < 0.8 ? PINK : VIOLET);
      return s;
    },
    hobbies() {
      const s = samplePoints(1.35, (c, W, H) => {
        // little CRT TV: body, antennas, and a punched-out screen
        c.lineWidth = H * 0.035;
        c.strokeStyle = c.fillStyle = "#fff";
        // antennas
        c.beginPath();
        c.moveTo(W * 0.5, H * 0.3); c.lineTo(W * 0.28, H * 0.05);
        c.moveTo(W * 0.5, H * 0.3); c.lineTo(W * 0.72, H * 0.05);
        c.stroke();
        // body
        roundRect(c, W * 0.08, H * 0.28, W * 0.84, H * 0.64, H * 0.06);
        c.fill();
        // screen: punch a hole so the dots draw the bezel
        c.globalCompositeOperation = "destination-out";
        roundRect(c, W * 0.16, H * 0.36, W * 0.52, H * 0.48, H * 0.04);
        c.fill();
        c.globalCompositeOperation = "source-over";
      });
      s.color = () => (Math.random() < 0.7 ? VIOLET : AMBER);
      return s;
    },
  };

  function roundRect(c, x, y, rw, rh, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + rw, y, x + rw, y + rh, r);
    c.arcTo(x + rw, y + rh, x, y + rh, r);
    c.arcTo(x, y + rh, x, y, r);
    c.arcTo(x, y, x + rw, y, r);
    c.closePath();
  }

  // Fit a shape into the viewport and hand every dot a target.
  // On wide screens the shape sits left of center so the panel doesn't cover it.
  function buildTargets(name) {
    const shape = SHAPES[name]();
    const panelSpace = w > 900 ? 0.62 : 1;         // usable width fraction
    const availW = w * panelSpace * 0.86;
    const availH = h * 0.68;
    let sw = availW, sh = sw / shape.aspect;
    if (sh > availH) { sh = availH; sw = sh * shape.aspect; }
    const ox = (w * panelSpace - sw) / 2 + w * 0.02;
    const oy = (h - sh) / 2 + h * 0.03;

    // even-stride subsample (or cycle with jitter) to exactly dots.length
    const pts = shape.points;
    const targets = new Array(dots.length);
    for (let i = 0; i < dots.length; i++) {
      const p = pts[Math.floor((i * pts.length) / dots.length) % pts.length];
      const jitter = pts.length < dots.length ? 3 : 0.8;
      targets[i] = {
        x: ox + p[0] * sw + (Math.random() - 0.5) * jitter,
        y: oy + p[1] * sh + (Math.random() - 0.5) * jitter,
        c: shape.color(p),
      };
    }
    // shuffle so dots fly in from everywhere instead of scanning row by row
    for (let i = targets.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }
    return targets;
  }

  // ---------- field ----------

  function rebuild() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.max(400, Math.min(1500, Math.round((w * h) / 900)));
    const cols = Math.round(Math.sqrt(target * (w / h)));
    const rows = Math.round(target / cols);
    dots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        dots.push({
          x: Math.random() * w,
          y: Math.random() * h,
          gx: ((c + 0.5) / cols) * w,
          gy: ((r + 0.5) / rows) * h,
          r: 1 + Math.random() * 1.1,
          c: PALETTE[(Math.random() * PALETTE.length) | 0],
          cc: null, // current (lerped) color
          ph: Math.random() * Math.PI * 2,
        });
      }
    }
    for (const d of dots) d.cc = d.c.slice();
    if (mode !== "wave") shapeTargets = buildTargets(mode);
  }

  const EASE = reduceMotion ? 1 : 0.055;
  const REPEL = 110;
  let t = 0;

  function tick() {
    if (!running) return;
    t += reduceMotion ? 0 : 0.016;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      let tx, ty, tc;

      if (mode === "wave" || !shapeTargets) {
        // layered traveling waves over the home grid — kept slow and low-amplitude
        const wave =
          Math.sin(d.gx * 0.006 + t * 0.45) * 13 +
          Math.sin(d.gx * 0.013 - t * 0.3 + d.gy * 0.004) * 7 +
          Math.sin(d.gy * 0.01 + t * 0.38 + d.ph) * 4;
        tx = d.gx + Math.sin(d.gy * 0.008 + t * 0.25 + d.ph) * 5;
        ty = d.gy + wave;
        tc = d.c;
      } else {
        const s = shapeTargets[i];
        // gentle breathing so formed shapes stay alive
        tx = s.x + Math.sin(t * 1.4 + d.ph) * 1.5;
        ty = s.y + Math.cos(t * 1.2 + d.ph) * 1.5;
        tc = s.c;
      }

      d.x += (tx - d.x) * EASE;
      d.y += (ty - d.y) * EASE;

      if (finePointer && !reduceMotion) {
        const dx = d.x - mouse.x, dy = d.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL * REPEL && d2 > 0.01) {
          const dist = Math.sqrt(d2);
          const f = ((REPEL - dist) / REPEL) * 6;
          d.x += (dx / dist) * f;
          d.y += (dy / dist) * f;
        }
      }

      // ease color toward the target palette
      for (let k = 0; k < 3; k++) d.cc[k] += (tc[k] - d.cc[k]) * 0.04;

      const alpha = mode === "wave" ? 0.5 : 0.75;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${d.cc[0] | 0},${d.cc[1] | 0},${d.cc[2] | 0},${alpha})`;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }

  // ---------- wiring: nav, panels, keyboard ----------

  const nav = document.getElementById("psNav");
  const buttons = nav ? [...nav.querySelectorAll("button[data-shape]")] : [];
  const panels = [...document.querySelectorAll(".panel")];

  function setMode(name) {
    mode = name;
    shapeTargets = name === "wave" ? null : buildTargets(name);
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.shape === name));
    panels.forEach((p) => p.classList.toggle("show", p.id === `panel-${name}`));
  }

  buttons.forEach((b) =>
    b.addEventListener("click", () => setMode(mode === b.dataset.shape ? "wave" : b.dataset.shape))
  );
  panels.forEach((p) =>
    p.querySelector(".close").addEventListener("click", () => setMode("wave"))
  );
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") setMode("wave"); });

  if (finePointer) {
    window.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    window.addEventListener("mouseout", () => { mouse.x = -1e4; });
  }

  let running = true;
  document.addEventListener("visibilitychange", () => {
    const was = running;
    running = !document.hidden;
    if (running && !was) requestAnimationFrame(tick);
  });

  window.addEventListener("resize", rebuild);
  rebuild();

  // deep link: personal.html?shape=travels
  const wanted = new URLSearchParams(location.search).get("shape");
  if (wanted && SHAPES[wanted]) setMode(wanted);

  requestAnimationFrame(tick);
})();
