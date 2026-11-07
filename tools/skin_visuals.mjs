import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
export const root=resolve(import.meta.dirname,'..');
export const catalog=JSON.parse(await readFile(resolve(root,'assets/skins/catalog.json'),'utf8'));
export const scenes=JSON.parse(await readFile(resolve(root,'assets/skins/scenes.json'),'utf8'));
export const names={cafe:'카페',clinic:'마음 진료실',playroom:'고양이 놀이방'};
export const expressions={calm:'편안함',welcome:'반가움',listen:'경청',encourage:'응원',joy:'기쁨',concern:'걱정',serious:'진지함'};
const sources={},faces={};
for(const id of Object.keys(catalog)){
 sources[id]={};faces[id]={};
 for(const pose of ['rest','greeting','explain'])sources[id][pose]='data:image/png;base64,'+(await readFile(resolve(root,'assets/skins',id,pose+'.png'))).toString('base64');
 for(const expression of Object.keys(expressions))for(const blink of [false,true]){
  const key=expression+(blink?'-blink':'');
  faces[id][key]=(await readFile(resolve(root,'assets/skins',id,'faces',key+'.svg'),'utf8')).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
 }
}
export function companion(id,pose='rest',expression='calm',blink=false){
 const info=catalog[id].poses[pose],[x,y,w,h]=info.rect,clip='clip-'+id+'-'+pose+'-'+expression+(blink?'b':'');
 const face=faces[id][expression+(blink?'-blink':'')].replaceAll(catalog[id].poses.rest.faceColor,info.faceColor);
 const tail=id==='playroom'?'<path d="M205 314 C264 316 263 261 250 249 C236 237 226 252 237 264 C246 277 236 293 216 289" fill="none" stroke="#F3DAB6" stroke-width="17" stroke-linecap="round"/>':'';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 350"><defs><clipPath id="'+clip+'"><path d="'+info.outline+'" fill-rule="evenodd" transform="translate('+x+' '+y+') scale('+info.scale+')"/></clipPath></defs>'+tail+'<image href="'+sources[id][pose]+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" clip-path="url(#'+clip+')"/>'+(id==='playroom'?'<g transform="translate('+info.face.join(' ')+')">'+face+'</g>':face)+'</svg>';
}
export function background(id){
 const {paper,floor,shapes}=scenes[id];
 const elements=shapes.map(({type,...props})=>'<'+type+' '+Object.entries(props).map(([k,v])=>k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())+'="'+v+'"').join(' ')+' '+(type==='path'?'fill="none" stroke-linecap="round" stroke-linejoin="round"':'')+'/>').join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 270"><rect width="330" height="270" fill="'+paper+'"/><path d="M0 202 Q165 178 330 202 V270 H0 Z" fill="'+floor+'"/>'+elements+'</svg>';
}
