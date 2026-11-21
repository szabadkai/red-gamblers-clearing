import {mkdir,cp,copyFile,rm,writeFile} from 'node:fs/promises';
await rm(new URL('./dist',import.meta.url),{recursive:true,force:true});
await mkdir(new URL('./dist',import.meta.url),{recursive:true});
for(const name of ['index.html','style.css','menu.css','menu.mjs','settings.mjs','runtime.mjs','game.mjs','model.mjs','enemies.mjs','art.mjs','lighting.mjs','flora.mjs','environment.mjs','animation.mjs','journey.mjs','scenery.mjs','tiles.mjs','autotile.mjs','bridge.mjs','bridge-art.mjs','bridge-stone.mjs','bridge-arches.mjs','arena-art.mjs','concept-props.mjs','cast.mjs','story.mjs','challenges.mjs','challenge-art.mjs','story-data.mjs','bosses.mjs','story-art.mjs','music.mjs','music-worker.mjs','chip.mjs','sfx.mjs'])await copyFile(new URL(name,import.meta.url),new URL('dist/'+name,import.meta.url));
await cp(new URL('./assets',import.meta.url),new URL('./dist/assets',import.meta.url),{recursive:true});
// Keep published /poker/ bookmarks pointing to the game at the Pages site root.
const alias = new URL('dist/poker/', import.meta.url);
await mkdir(alias, {recursive:true});
await writeFile(new URL('index.html', alias), `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>RED — The Gambler’s Clearing</title>
<meta http-equiv="refresh" content="0;url=../"><a href="../">Play RED</a></html>`);
await writeFile(new URL('dist/.nojekyll', import.meta.url), '');
console.log('Built standalone poker game into dist/');
