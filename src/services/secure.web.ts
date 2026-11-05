export async function readSession(){return (globalThis as any).localStorage.getItem('yeoun.session');}
export async function writeSession(token:string){(globalThis as any).localStorage.setItem('yeoun.session',token);}
