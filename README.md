# Portfolio site — Clayton Tanner

Personal portfolio: CRT-inspired interactive landing page (cursor-tracking phosphor
glow + card tilt), with calm, employer-readable content sections. Plain HTML/CSS/JS,
no build step — ready for GitHub Pages.

## Preview locally

Just open `index.html` in a browser, or run a tiny server:

```
python -m http.server 4321
# then visit http://localhost:4321
```

## Content checklist (the stuff only you can provide)

Search the code for `EDIT ME` to find every placeholder. You need:

- [x] Confirm name spelling/order (Clayton Tanner, per resume)
- [x] Resume PDF → `assets/resume.pdf` (copied Mar 2026 version)
- [x] Hero intro + Experience section + Skills (drafted from resume — review the voice)
- [ ] Photos of the Retro-Box → `assets/retrobox-hero.jpg` (+ swap the placeholder `.thumb` divs for `<img>` tags)
- [ ] Short demo video/GIF of channel surfing
- [ ] Real GitHub + LinkedIn URLs (contact section + project page)
- [ ] Verify/expand the "How it works" and "What was hard" sections in `projects/retro-box.html`
- [ ] Skills list — keep only what's real, each linked to evidence

## Deploying to GitHub Pages (when ready)

1. Create a repo (e.g. `portfolio`), push this folder.
2. Repo Settings → Pages → deploy from `main` branch, root folder.
3. Optional: add a custom domain later — no code changes needed.

## Design rules baked in

- Cursor effects only run on devices with a mouse (`pointer: fine`) and are
  disabled when the OS "reduce motion" accessibility setting is on.
- Landing page has the personality; project/skills/contact sections stay calm
  and readable for recruiters.
