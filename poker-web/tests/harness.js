// Dev-only frame harness for checking the game in a browser pane that may be hidden (requestAnimationFrame
// stalls there). Paste into the page console: eval(await (await fetch('/tests/harness.js')).text());await H.load()
// It loads the game in a full-window iframe whose frame loop is stepped by hand: H.run(n) advances n 1/60 s
// frames with the real input state. H.W is the live world, H.$ looks up elements, H.key/H.up send keys,
// H.shot(x,y,w,h,slot) copies a crop of the game canvas (raster px) to an overlay for screenshots.
window.H={
 async load(){
  const html=await (await fetch('/index.html',{cache:'reload'})).text();
  const page=html.replace('<head>','<head><base href="'+location.origin+'/"><script>window.requestAnimationFrame=cb=>{window.F=cb;return 0}</scr'+'ipt>');
  document.body.innerHTML='';const f=document.createElement('iframe');f.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;border:0;background:#000';
  f.srcdoc=page;document.body.append(f);await new Promise(r=>f.onload=r);const g=f.contentWindow;H.G=g;
  for(let i=0;i<120&&(!g.F||g.document.getElementById('begin').disabled);i++)await new Promise(r=>setTimeout(r,250));
  g.T=g.performance.now();H.run(2);H.W=(await g.eval("import('./game.mjs')")).world;return 'ready';
 },
 run(n=1){for(let i=0;i<n;i++)H.G.F(H.G.T+=1000/60)},
 $(id){return H.G.document.getElementById(id)},
 key(code){H.G.document.body.dispatchEvent(new H.G.KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}))},
 up(code){H.G.document.body.dispatchEvent(new H.G.KeyboardEvent('keyup',{code,bubbles:true,cancelable:true}))},
 practice(v){H.$('practice').value=String(v);H.$('deal').click();H.run(3);return H.W},
 play(n=1){for(let i=0;i<n;i++){H.W.mode='playing';H.run(1)}},
 clear(){document.querySelectorAll('.hshot').forEach(e=>e.remove())},
 shot(x,y,w,h,slot=0,cols=2,k=1){
  const o=document.createElement('canvas');o.className='hshot';o.width=w*k;o.height=h*k;
  o.style.cssText=`position:fixed;left:${slot%cols*w*k}px;top:${Math.floor(slot/cols)*h*k}px;z-index:9;image-rendering:pixelated;border:1px solid #f0f`;
  const c=o.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(H.$('game'),x,y,w,h,0,0,w*k,h*k);document.body.append(o);
 }
};
