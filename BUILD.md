# Build instructions

This repository includes a small build tool to:

- Bundle and minify JavaScript (esbuild)
- Minify CSS (csso)
- Produce responsive images (WebP + PNG fallbacks) at 800w and 1600w
- Emit hashed files into public/assets/dist and a manifest at public/assets/manifest.json

How to run

1. Install dependencies (requires Node.js >= 16):

   npm install

2. Run the build:

   npm run build

3. After running, the build will create:

   - public/assets/dist/animations.[hash].js
   - public/assets/dist/animations.[hash].css
   - public/assets/images/* (800w/1600w webp + png files)
   - public/assets/manifest.json

4. The site contains a small runtime loader that will use the manifest to swap in hashed assets and responsive images. If the manifest is not present the site will fall back to the original unbundled assets.

Notes

- The script downloads the remote hero images (hosted on img.rocket.new) and also tries to include the local unnamed.webp if present in the repo root.
- For production, run `npm run build` as part of your deployment pipeline and serve /public statically.
