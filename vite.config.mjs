import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'');
  const proxy={'/api':{target:env.VITE_API_PROXY||'http://127.0.0.1:8808',rewrite:p=>p.replace(/^\/api/,'')}};
  return {plugins:[react()],resolve:{alias:[{find:/^react-native$/,replacement:'react-native-web'},{find:/^react-native-svg$/,replacement:fileURLToPath(new URL('./src/web/svg.tsx',import.meta.url))}],extensions:['.web.tsx','.web.ts','.web.jsx','.web.js','.tsx','.ts','.jsx','.js','.json']},define:{global:'globalThis',__DEV__:JSON.stringify(false)},server:{proxy},preview:{proxy},build:{outDir:'web-dist'}};
});
