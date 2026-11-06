export async function readSession(){return (globalThis as any).localStorage.getItem('yeoun.session');}
export async function writeSession(token:string){(globalThis as any).localStorage.setItem('yeoun.session',token);}
export async function clearSession(){(globalThis as any).localStorage.removeItem('yeoun.session');}
const vaultStore=(name:'pending'|'guests')=>name==='pending'?globalThis.sessionStorage:globalThis.localStorage;
export async function readAccountSecret(name:'pending'|'guests'){return vaultStore(name).getItem('yeoun.auth.'+name);}
export async function writeAccountSecret(name:'pending'|'guests',value:string){vaultStore(name).setItem('yeoun.auth.'+name,value);}
export async function clearAccountSecret(name:'pending'|'guests'){vaultStore(name).removeItem('yeoun.auth.'+name);}
