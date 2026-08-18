/* Fresh-content pipeline for the 3D intro gallery.
 *
 * The intro (studio-intro.js) reads showcase/pairings/sets.json and shows a
 * random selection of the sets listed there — so adding a set IS adding
 * content. This script keeps that manifest true:
 *
 *   node scripts/build-pairings.mjs                 # rescan set folders, rewrite sets.json
 *   node scripts/build-pairings.mjs export1.zip …   # ingest studio exports as new sets, then rescan
 *
 * A "set" is a folder under showcase/pairings/ containing one render image
 * (any name containing "render", or scheme-photo.png as a fallback) and the
 * panel-*.png/jpg swatch cards the studio exports alongside it. Zips are
 * unzipped into the next free set-N folder and the render is renamed
 * render.<ext>. If python3 + Pillow are available, images are web-optimised
 * (renders ≤1600px, panels ≤640px, saved as jpg); otherwise files are kept
 * as exported — the intro handles both.
 */
import {readdir, mkdir, rename, writeFile, stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join, resolve, dirname, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const base=join(root,'showcase','pairings');
await mkdir(base,{recursive:true});

const IMG=/\.(png|jpe?g|webp)$/i;
const ORDER=['walls','boards','worktop','floor','carcass','ceiling','skirting'];

function hasPillow(){
  try{execFileSync('python3',['-c','import PIL'],{stdio:'ignore'});return true;}catch{return false;}
}
const optimise=hasPillow();
if(!optimise)console.log('note: python3+Pillow not found — keeping images as exported');

function optimiseFile(file,maxPx){
  execFileSync('python3',['-c',`
from PIL import Image
import sys,os
src=sys.argv[1];mx=int(sys.argv[2])
im=Image.open(src).convert('RGB');im.thumbnail((mx,mx),Image.LANCZOS)
out=os.path.splitext(src)[0]+'.jpg'
im.save(out,quality=84,optimize=True)
if out!=src:os.remove(src)
`,file,String(maxPx)]);
}

/* ---- ingest any zips passed on the command line ---- */
const zips=process.argv.slice(2);
if(zips.length){
  const taken=new Set(await readdir(base).catch(()=>[]));
  let n=1;
  for(const z of zips){
    while(taken.has(`set-${n}`))n++;
    const dest=join(base,`set-${n}`);taken.add(`set-${n}`);
    await mkdir(dest,{recursive:true});
    execFileSync('unzip',['-o','-q','-j',resolve(z),'-d',dest]);   /* -j: flatten */
    console.log(`ingested ${basename(z)} -> showcase/pairings/set-${n}`);
  }
}

/* ---- normalise every set folder and rebuild the manifest ---- */
const manifest=[];
for(const d of (await readdir(base)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))){
  const dir=join(base,d);
  if(!(await stat(dir)).isDirectory())continue;
  let files=(await readdir(dir)).filter(f=>IMG.test(f));

  /* find + normalise the render */
  let render=files.find(f=>/render/i.test(f))||files.find(f=>/^scheme-photo/i.test(f));
  if(!render){console.log(`skip ${d}: no render image`);continue;}
  const ext=render.match(IMG)[0].toLowerCase().replace('.jpeg','.jpg');
  if(render!==`render${ext}`){
    await rename(join(dir,render),join(dir,`render${ext}`));
    render=`render${ext}`;
  }
  if(optimise){optimiseFile(join(dir,render),1600);render=render.replace(IMG,'.jpg');}

  /* panels, in the studio's display order */
  let panels=(await readdir(dir)).filter(f=>/^panel-/.test(f)&&IMG.test(f));
  if(optimise){
    for(const f of panels)optimiseFile(join(dir,f),640);
    panels=(await readdir(dir)).filter(f=>/^panel-/.test(f)&&IMG.test(f));
  }
  panels.sort((a,b)=>{
    const k=f=>{const i=ORDER.findIndex(o=>f.includes(o));return i<0?99:i;};
    return k(a)-k(b);
  });
  if(!panels.length){console.log(`skip ${d}: no panel-* swatches`);continue;}

  manifest.push({dir:`showcase/pairings/${d}`,render,panels});
}
await writeFile(join(base,'sets.json'),JSON.stringify(manifest,null,1));
console.log(`sets.json written — ${manifest.length} set(s): ${manifest.map(m=>basename(m.dir)).join(', ')}`);
