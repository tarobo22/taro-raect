const decoded=new Map<string,Promise<void>>();
export function decodedImage(uri:string):Promise<void>{
 let pending=decoded.get(uri);if(pending)return pending;
 pending=new Promise<void>((resolve,reject)=>{const image=new window.Image();image.src=uri;
  if(typeof image.decode==='function')image.decode().then(()=>resolve(),reject);
  else if(image.complete&&image.naturalWidth)resolve();else{image.onload=()=>resolve();image.onerror=()=>reject(new Error('image unavailable'));}
 });
 decoded.set(uri,pending);void pending.catch(()=>decoded.delete(uri));if(decoded.size>128)decoded.delete(decoded.keys().next().value!);return pending;
}
