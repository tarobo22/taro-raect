/** Platform resources may arrive after permission prompts or after the owner unmounts. */
export class VoiceCaptureSession {
 private live=true;
 private stop:(()=>void)|null=null;
 private readonly release:()=>void;
 constructor(acquire:()=>()=>void,private readonly onText:(value:string)=>void,
             private readonly onState:(value:string)=>void,private readonly onEnd:()=>void=()=>{}){this.release=acquire();}
 get active(){return this.live;}
 attachStop(stop:()=>void){if(this.live)this.stop=stop;else stop();}
 text(value:string){if(this.live)this.onText(value);}
 state(value:string){if(this.live)this.onState(value);}
 finish(message=''){
  if(!this.live)return;this.live=false;
  try{this.stop?.();}catch{/* The platform may have already disposed its recorder. */}
  finally{this.stop=null;this.release();this.onState(message);this.onEnd();}
 }
 cancel(){this.finish();}
}
