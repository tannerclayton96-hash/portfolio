// Password gate for the personal side.
//
// HONESTY NOTE: this is a privacy curtain, not security. The page and its
// content ship to every visitor's browser (and live in the public GitHub
// repo) — the gate only keeps casual clickers out. Don't put anything behind
// it that would be a problem if someone determined saw it. Only a SHA-256
// hash of the password is stored here, so the password itself isn't
// readable from the source.

(function () {
  const HASH = "44150bf31f6c83b87fcc9ab0b8e170940c0dc69451aa9921e3542e0fbf079a7c";
  const gate = document.getElementById("gate");
  const form = document.getElementById("gateForm");
  const input = document.getElementById("gatePass");
  if (!gate || !form) return;

  function open() {
    gate.classList.add("open");
    setTimeout(() => gate.remove(), 700);
  }

  // already unlocked this browser session, or previewing locally (?preview)
  if (
    sessionStorage.getItem("ps-unlocked") === "1" ||
    (location.hostname === "localhost" && location.search.includes("preview"))
  ) {
    open();
    return;
  }

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = (await sha256Hex(input.value)) === HASH;
    if (ok) {
      sessionStorage.setItem("ps-unlocked", "1");
      open();
    } else {
      form.classList.remove("deny");
      void form.offsetWidth; // restart the shake animation
      form.classList.add("deny");
      input.select();
    }
  });
})();
