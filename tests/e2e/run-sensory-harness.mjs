import {build,preview} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';

await mkdir('.local',{recursive:true});
await writeFile('.local/sensory-entry.tsx',`import React from 'react';
import {createRoot} from 'react-dom/client';
import {Store} from '../src/state/store';
import {Character} from '../src/components/Character';
import {BreathingDial} from '../src/components/BreathingDial';
import * as feedback from '../src/services/feedback.web';
import * as voice from '../src/services/voice.web';
let root=null;
globalThis.sensoryHarness={feedback,voice,mount(){const host=document.createElement('section');host.id='sensory-harness';document.body.append(host);root=createRoot(host);root.render(<Store><Character/><BreathingDial/></Store>);},unmount(){root?.unmount();root=null;}};
`);
const output='.local/sensory-preview';
await build({configFile:'vite.config.mjs',define:{'process.env.NODE_ENV':JSON.stringify('production')},
 build:{outDir:output,emptyOutDir:true,lib:{entry:'.local/sensory-entry.tsx',formats:['es'],fileName:'sensory-harness'}}});
await writeFile(output+'/index.html','<!doctype html><html lang="ko"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sensory production verification</title><body><script type="module" src="./sensory-harness.js"></script></body></html>');
const port=Number(process.env.YEOUN_SENSORY_PORT||8836);
const server=await preview({configFile:'vite.config.mjs',build:{outDir:output},preview:{host:'127.0.0.1',port,strictPort:true}});
try{
 const child=spawn(process.execPath,['--test','tests/e2e/sensory-lifecycle.test.mjs'],
  {stdio:'inherit',env:{...process.env,YEOUN_WEB_URL:'http://127.0.0.1:'+port}});
 process.exitCode=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve(code??1));});
}finally{await new Promise((resolve,reject)=>server.httpServer.close(error=>error?reject(error):resolve()));}
