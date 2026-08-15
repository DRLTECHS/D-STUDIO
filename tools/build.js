#!/usr/bin/env node
/*
  tools/build.js
  - Bundles + minifies JS (esbuild)
  - Minifies CSS (csso)
  - Downloads and generates responsive images (sharp)
  - Writes hashed files into public/assets/dist and images into public/assets/images
  - Emits public/assets/manifest.json mapping original paths to hashed outputs

  Usage: node tools/build.js
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('esbuild');
const csso = require('csso');
const sharp = require('sharp');
const fetch = require('node-fetch');

function hash(content){ return crypto.createHash('sha1').update(content).digest('hex').slice(0,12); }

async function ensureDir(p){ await fs.promises.mkdir(p, { recursive:true }); }

(async function(){
  const root = process.cwd();
  const publicDir = path.join(root, 'public');
  const assetsDir = path.join(publicDir, 'assets');
  const distDir = path.join(assetsDir, 'dist');
  const imagesDir = path.join(assetsDir, 'images');

  await ensureDir(distDir);
  await ensureDir(imagesDir);

  const manifest = {};

  // 1) Bundle & minify JS with esbuild
  const jsSrc = path.join(publicDir, 'assets', 'js', 'animations.js');
  if (fs.existsSync(jsSrc)){
    console.log('Bundling JS', jsSrc);
    const jsContent = fs.readFileSync(jsSrc, 'utf8');
    const buildResult = await esbuild.build({
      stdin: { contents: jsContent, resolveDir: path.dirname(jsSrc), sourcefile: jsSrc },
      bundle: true,
      minify: true,
      sourcemap: false,
      write: false,
    });
    const bundled = buildResult.outputFiles[0].text;
    const h = hash(bundled);
    const outName = `animations.${h}.js`;
    const outPath = path.join(distDir, outName);
    fs.writeFileSync(outPath, bundled);
    manifest['/assets/js/animations.js'] = `/assets/dist/${outName}`;
    console.log('->', manifest['/assets/js/animations.js']);
  }

  // 2) Minify CSS
  const cssSrc = path.join(publicDir, 'assets', 'css', 'animations.css');
  if (fs.existsSync(cssSrc)){
    console.log('Minifying CSS', cssSrc);
    const cssContent = fs.readFileSync(cssSrc, 'utf8');
    const min = csso.minify(cssContent).css;
    const h = hash(min);
    const outName = `animations.${h}.css`;
    const outPath = path.join(distDir, outName);
    fs.writeFileSync(outPath, min);
    manifest['/assets/css/animations.css'] = `/assets/dist/${outName}`;
    console.log('->', manifest['/assets/css/animations.css']);
  }

  // 3) Images: download configured images and produce 1x/2x WebP + PNG fallback
  const imagesToProcess = [
    { key: '/assets/images/hero-before.png', url: 'https://img.rocket.new/generatedImages/rocket_gen_img_145467f23-1772147608952.png' },
    { key: '/assets/images/hero-after.png', url: 'https://img.rocket.new/generatedImages/rocket_gen_img_171eb3e22-1772147609983.png' },
    { key: '/assets/images/unnamed.webp', url: '/unnamed.webp' }
  ];

  for (const img of imagesToProcess){
    try {
      let buffer;
      if (img.url.startsWith('http')){
        console.log('Downloading', img.url);
        const res = await fetch(img.url);
        if (!res.ok) throw new Error('Failed to fetch ' + img.url);
        buffer = await res.buffer();
      } else {
        // local repo file
        const localPath = path.join(publicDir, img.url.replace(/^\//,''));
        if (fs.existsSync(localPath)) buffer = fs.readFileSync(localPath);
        else {
          console.warn('Local image not found, skipping', localPath);
          continue;
        }
      }

      // determine base name
      const base = path.basename(img.key).replace(/\.[^.]+$/, '');
      // generate sizes
      const sizes = [800,1600];
      const srcset = [];
      for (let i=0;i<sizes.length;i++){
        const w = sizes[i];
        // webp
        const webpOut = `${base}-${w}w.webp`;
        const webpPath = path.join(imagesDir, webpOut);
        await sharp(buffer).resize({ width: w }).webp({ quality: 80 }).toFile(webpPath);
        srcset.push(`/assets/images/${webpOut} ${w}w`);
        // png fallback for largest only
        if (i===0){
          const pngOut = `${base}-${w}w.png`;
          const pngPath = path.join(imagesDir, pngOut);
          await sharp(buffer).resize({ width: w }).png({ quality: 80 }).toFile(pngPath);
        }
      }
      // also write 2x png fallback for the larger size
      const png2Out = `${base}-1600w.png`;
      const png2Path = path.join(imagesDir, png2Out);
      await sharp(buffer).resize({ width: 1600 }).png({ quality: 80 }).toFile(png2Path);

      manifest[img.key] = {
        webp: `/assets/images/${base}-800w.webp`,
        webp_srcset: srcset.join(', '),
        png: `/assets/images/${base}-800w.png`,
        png_srcset: `/assets/images/${base}-800w.png 800w, /assets/images/${base}-1600w.png 1600w`
      };
      console.log('Processed image', img.key);
    } catch (err){
      console.warn('Image processing failed for', img.url, err.message);
    }
  }

  // write manifest
  const outManifest = path.join(assetsDir, 'manifest.json');
  fs.writeFileSync(outManifest, JSON.stringify(manifest, null, 2));
  console.log('Wrote manifest', outManifest);
  console.log('Build complete. Run this script before deploying and ensure public/assets is served statically.');
})();
