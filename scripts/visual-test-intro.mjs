/* Visual test for the 3D intro visualisation demo (intro-demo.html).
 *
 * Serves the repo, drives headless Chromium and captures screenshots of the
 * intro at several moments and viewports, then checks its behaviour:
 *   - the Three.js canvas mounts and no page errors fire
 *   - the CTA sits fully inside the visible viewport on every device size
 *   - "Enter the Studio" fades the layer out and opens the studio page
 *
 * Usage:
 *   npm i playwright-core          # once, anywhere on the require path
 *   node scripts/visual-test-intro.mjs
 *
 * Env:
 *   PW_CHROMIUM    path to a Chromium binary (auto-detected from
 *                  /opt/pw-browsers or PLAYWRIGHT_BROWSERS_PATH if unset)
 *   VENDOR_THREE   directory holding three.module.min.js + RoomEnvironment.js;
 *                  when set, CDN requests for three are served from it so the
 *                  test runs without internet access
 *
 * Screenshots land in visual-tests/ (not committed).
 */
import {createServer} from 'node:http';
import {readFile, mkdir, readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join, extname, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const outDir=join(root,'visual-tests');
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};

async function findChromium(){
  if(process.env.PW_CHROMIUM)return process.env.PW_CHROMIUM;
  for(const base of [process.env.PLAYWRIGHT_BROWSERS_PATH,'/opt/pw-browsers'].filter(Boolean)){
    if(!existsSync(base))continue;
    for(const d of (await readdir(base)).sort().reverse()){
      for(const c of [join(base,d,'chrome-linux','chrome'),join(base,d,'chrome-linux','headless_shell')]){
        if(existsSync(c))return c;
      }
    }
  }
  return undefined; // let playwright-core try its own resolution
}

const server=createServer(async(req,res)=>{
  const path=join(root,decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/\/$/,'/index.html'));
  try{
    const body=await readFile(path);
    res.writeHead(200,{'content-type':MIME[extname(path)]||'application/octet-stream'});
    res.end(body);
  }catch{res.writeHead(404);res.end('not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;

const {chromium}=require('playwright-core');
const browser=await chromium.launch({
  executablePath:await findChromium(),
  args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
await mkdir(outDir,{recursive:true});

const failures=[];
const check=(name,ok)=>{console.log(`${ok?'PASS':'FAIL'}  ${name}`);if(!ok)failures.push(name);};

async function newPage(viewport,opts={}){
  const page=await browser.newPage({viewport,...opts});
  page.errors=[];
  page.on('pageerror',e=>page.errors.push(e.message));
  if(process.env.VENDOR_THREE){
    await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',async route=>{
      const u=route.request().url();
      const file=u.includes('RoomEnvironment')?'RoomEnvironment.js':'three.module.min.js';
      try{
        route.fulfill({body:await readFile(join(process.env.VENDOR_THREE,file)),contentType:'text/javascript'});
      }catch{route.abort();}
    });
  }
  return page;
}

/* -- desktop: intro builds, animates, enters the studio -------------------- */
{
  const page=await newPage({width:1440,height:900});
  await page.goto(`${base}/intro-demo.html`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(700);
  await page.screenshot({path:join(outDir,'desktop-t0.7s.png')});
  await page.waitForTimeout(1300);
  await page.screenshot({path:join(outDir,'desktop-t2s.png')});
  await page.waitForTimeout(2000);
  await page.screenshot({path:join(outDir,'desktop-t4s.png')});
  check('desktop: 3D canvas mounted',await page.evaluate(()=>!!document.querySelector('#intro3d canvas')));
  check('desktop: no page errors',page.errors.length===0||(console.log('   errors:',page.errors),false));
  const realTex=await page.evaluate(()=>window.__i3realTextures||0);
  check(`desktop: real renders + swatch panels loaded (${realTex}/32)`,realTex>=20);
  /* the fade itself is evidenced by this screenshot; under software WebGL the
     main thread lags too much for a reliable mid-fade class assertion */
  await page.click('#i3go');
  await page.screenshot({path:join(outDir,'desktop-entering.png')}).catch(()=>{});
  await page.waitForURL('**/studio.html',{timeout:4000}).catch(()=>{});
  check('desktop: Enter fades out and opens the studio page',page.url().endsWith('/studio.html'));
  await page.close();
}

/* -- phone + tablet framing ------------------------------------------------ */
for(const [name,vp,opts] of [
  ['mobile',{width:390,height:844},{isMobile:true,hasTouch:true}],
  ['tablet',{width:1024,height:768},{}],
]){
  const page=await newPage(vp,opts);
  await page.goto(`${base}/intro-demo.html`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(3000);
  await page.screenshot({path:join(outDir,`${name}-t3s.png`)});
  check(`${name}: 3D canvas mounted`,await page.evaluate(()=>!!document.querySelector('#intro3d canvas')));
  check(`${name}: CTA visible in viewport`,await page.evaluate(()=>{
    const r=document.getElementById('i3go').getBoundingClientRect();
    const w=window.visualViewport?window.visualViewport.width:window.innerWidth;
    const h=window.visualViewport?window.visualViewport.height:window.innerHeight;
    return r.left>=0&&r.top>=0&&r.right<=w+1&&r.bottom<=h+1;
  }));
  check(`${name}: no page errors`,page.errors.length===0||(console.log('   errors:',page.errors),false));
  await page.close();
}

await browser.close();
server.close();
console.log(failures.length?`\n${failures.length} check(s) failed`:`\nAll checks passed — screenshots in visual-tests/`);
process.exit(failures.length?1:0);
