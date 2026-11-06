/** Every capture owns one idempotent lease; an older release cannot unmute a newer capture. */
export class AudioGate {
 private readonly leases=new Set<symbol>();
 private readonly listeners=new Set<(blocked:boolean)=>void>();
 private foreground=true;
 get blocked(){return !this.foreground||this.leases.size>0;}
 private change(update:()=>void){const before=this.blocked;update();if(before!==this.blocked)for(const listener of this.listeners)listener(this.blocked);}
 acquire(){const lease=Symbol('voice capture');this.change(()=>this.leases.add(lease));return()=>this.change(()=>{this.leases.delete(lease);});}
 setForeground(value:boolean){this.change(()=>{this.foreground=value;});}
 subscribe(listener:(blocked:boolean)=>void){this.listeners.add(listener);listener(this.blocked);return()=>{this.listeners.delete(listener);};}
}
