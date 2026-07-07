// Travel photo grid.
//
// Two sources:
//  1. PUBLISHED — files committed to assets/travel/ and listed in PHOTOS
//     below. These are what visitors see.
//  2. LOCAL DRAFTS — photos added through the "+ Add photos" button, kept in
//     this browser's IndexedDB so Clayton can audition layouts before
//     committing anything. They never leave the machine.

// EDIT ME: add committed photos here, e.g.
//   { src: "assets/travel/london-2024.jpg", alt: "Tower Bridge, London" },
const PHOTOS = [];

(function () {
  const grid = document.getElementById("travelGrid");
  const input = document.getElementById("travelUpload");
  const lightbox = document.getElementById("lightbox");
  if (!grid || !input) return;

  // ---------- tiny IndexedDB helper ----------
  const DB = "ps-travel", STORE = "photos";
  function withStore(rw, fn) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open(DB, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction(STORE, rw ? "readwrite" : "readonly");
        const out = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(out && "result" in out ? out.result : undefined);
        tx.onerror = () => reject(tx.error);
      };
    });
  }
  const allLocal = () => withStore(false, (s) => s.getAll());
  const addLocal = (blob) => withStore(true, (s) => s.add({ blob }));
  const rmLocal = (id) => withStore(true, (s) => s.delete(id));

  // ---------- rendering ----------
  function fig(src, alt, localId) {
    const f = document.createElement("figure");
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt || "";
    img.loading = "lazy";
    img.addEventListener("click", () => {
      lightbox.querySelector("img").src = src;
      lightbox.classList.add("show");
    });
    f.appendChild(img);
    if (localId != null) {
      const rm = document.createElement("button");
      rm.className = "rm";
      rm.textContent = "✕";
      rm.title = "Remove (local draft)";
      rm.addEventListener("click", async () => { await rmLocal(localId); render(); });
      f.appendChild(rm);
    }
    return f;
  }

  async function render() {
    grid.replaceChildren();
    for (const p of PHOTOS) grid.appendChild(fig(p.src, p.alt));
    try {
      for (const rec of await allLocal()) {
        grid.appendChild(fig(URL.createObjectURL(rec.blob), "local draft photo", rec.id));
      }
    } catch { /* private-browsing modes can block IndexedDB — published photos still render */ }
    if (!grid.children.length) {
      const empty = document.createElement("p");
      empty.className = "upload-note";
      empty.textContent = "No photos yet — add a few to see the grid come alive.";
      grid.appendChild(empty);
    }
  }

  input.addEventListener("change", async () => {
    for (const file of input.files) await addLocal(file);
    input.value = "";
    render();
  });

  lightbox.addEventListener("click", () => lightbox.classList.remove("show"));

  render();
})();
