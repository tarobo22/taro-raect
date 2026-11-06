/** Own one foreground resource and invalidate callbacks before stopping it. */
export class ActivityEffect {
 private cleanup:(()=>void)|null=null;
 private generation=0;
 private disposed=false;
 constructor(private readonly start:(current:()=>boolean)=>()=>void,private foreground=true,private enabled=true){this.sync();}
 private sync(){
  if(this.foreground&&this.enabled&&!this.disposed){
   if(!this.cleanup){const generation=++this.generation;this.cleanup=this.start(()=>!this.disposed&&this.foreground&&this.enabled&&generation===this.generation);}
  }else if(this.cleanup){this.generation++;const stop=this.cleanup;this.cleanup=null;stop();}
 }
 setForeground(active:boolean){this.foreground=active;this.sync();}
 setEnabled(enabled:boolean){this.enabled=enabled;this.sync();}
 dispose(){this.disposed=true;this.sync();}
}
