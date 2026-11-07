import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {root,names,companion} from './skin_visuals.mjs';
const folder=resolve(root,'media/three-spaces-20261107');await mkdir(folder,{recursive:true});
const poses={calm:'rest',welcome:'greeting',listen:'rest',encourage:'explain',joy:'greeting',concern:'rest',serious:'rest'};
const bank={characters:{},rooms:{},themes:JSON.parse(await readFile(resolve(root,'assets/skins/themes.json'),'utf8')),names};
for(const id of Object.keys(names)){
 bank.characters[id]={};
 bank.rooms[id]=await readFile(resolve(root,'assets/skins',id,'wallpaper.svg'),'utf8');
 for(const [expression,pose] of Object.entries(poses))for(const blink of [false,true]){
  bank.characters[id][expression+'.'+(blink?'blink':'open')]=companion(id,pose,expression,blink).replace(/href="data:image\/png;base64,[^"]*"/,'href="../../assets/skins/'+id+'/'+pose+'.png"');
 }
}
const template=await readFile(resolve(folder,'film-template.html'),'utf8');
await writeFile(resolve(folder,'film.html'),template.replace('/*BANK*/','const assets='+JSON.stringify(bank)+';'));
console.log('Built deterministic 60s/30s editorial timeline with real app captures.');
