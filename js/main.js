// Cursor-tracking effects for the landing page.
// Both effects self-disable on touch devices (no fine pointer)
// and when the OS "reduce motion" preference is set.

(function () {
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!finePointer || reduceMotion) return;

  const root = document.documentElement;
  const hero = document.querySelector(".hero");
  const card = document.getElementById("heroCard");
  if (!hero || !card) return;

  // rAF throttle: apply at most one update per frame
  let pending = null;

  hero.addEventListener("mousemove", (e) => {
    pending = e;
    if (pending.raf) return;
    pending.raf = requestAnimationFrame(() => {
      const ev = pending;
      pending = null;

      const rect = hero.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      // 1) aurora glow follows the cursor
      root.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
      root.style.setProperty("--my", `${(y / rect.height) * 100}%`);

      // 2) gentle 3D tilt of the TV card toward the cursor
      const cardRect = card.getBoundingClientRect();
      const cx = cardRect.left + cardRect.width / 2;
      const cy = cardRect.top + cardRect.height / 2;
      const tiltX = ((ev.clientY - cy) / cardRect.height) * -4; // max ~4deg
      const tiltY = ((ev.clientX - cx) / cardRect.width) * 4;
      card.style.transform =
        `perspective(900px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
    });
  });

  hero.addEventListener("mouseleave", () => {
    card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    root.style.setProperty("--mx", "50%");
    root.style.setProperty("--my", "40%");
  });
})();
