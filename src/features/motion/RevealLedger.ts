interface Storage{read():Promise<string[]>;write(value:string[]):Promise<void>;}
export class RevealLedger{
 private values:string[]|null=null;private tail:Promise<unknown>=Promise.resolve();
 constructor(private storage:Storage,private limit=256){}
 claim(key:string):Promise<boolean>{
  const task=this.tail.then(async()=>{
   if(!key||key.length>240)throw new Error('invalid reveal event');
   if(this.values===null){const value=await this.storage.read();if(!Array.isArray(value)||value.some(v=>typeof v!=='string'||v.length>240))throw new Error('invalid reveal history');this.values=value.slice(-this.limit);}
   if(this.values.includes(key))return false;
   const next=[...this.values,key].slice(-this.limit);await this.storage.write(next);this.values=next;return true;
  });
  this.tail=task.catch(()=>undefined);return task;
 }
}
