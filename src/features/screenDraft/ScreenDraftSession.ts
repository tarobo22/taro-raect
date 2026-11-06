/** Protects reviewed screen input from late restoration and orders durable draft writes. */
export class ScreenDraftSession{
 private revision=0;
 private pending:Promise<unknown>=Promise.resolve();
 changed(){this.revision++;}
 dispose(){this.changed();}
 async restore<T>(read:()=>Promise<T|null>,apply:(value:T)=>void){const revision=this.revision,value=await read();if(value!==null&&revision===this.revision)apply(value);}
 write<T>(operation:()=>Promise<T>):Promise<T>{const next=this.pending.then(operation,operation);this.pending=next.catch(()=>{});return next;}
}
