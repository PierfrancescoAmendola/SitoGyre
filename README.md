# GYRE

Portfolio of a design and build studio, told as a 3D well: nine websites turning around a central shaft, rendered with Three.js.

**Live:** https://pierfrancescoamendola.github.io/SitoGyre/

## Stack

- [Three.js](https://threejs.org/) 0.170 for the scene
- [Vite](https://vite.dev/) 8 for dev server and build
- Web Audio synth for sound (no audio files)
- Bodoni Moda and Jost via Fontsource

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/
npm run preview  # serve the build
```

## Structure

| Path | Content |
| --- | --- |
| `src/main.js` | App entry, UI, scroll and navigation |
| `src/engine/` | Well, camera, floor, figure, textures, site pages |
| `src/audio/synth.js` | Procedural sound engine |
| `src/data/projects.js` | The nine projects |
| `src/styles/main.css` | Styles |

## Deploy

Every push to `main` builds and publishes to GitHub Pages via `.github/workflows/deploy.yml`.
