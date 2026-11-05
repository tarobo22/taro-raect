import type {ReminderPort,ReminderState,ReminderTime,NotificationPermission} from './types';
import {validateReminderTime} from './policy';

/** Serializes native writes and prevents a late permission/save from undoing OFF or erasure. */
export class ReminderController{
 private generation=0;
 private tail:Promise<unknown>=Promise.resolve();
 private permission:Promise<NotificationPermission>|undefined;
 constructor(private readonly port:ReminderPort){}
 private serial<T>(operation:()=>Promise<T>):Promise<T>{const result=this.tail.then(operation,operation);this.tail=result.catch(()=>{});return result;}
 read():Promise<ReminderState>{return this.serial(()=>this.port.read());}
 async enable(time:ReminderTime):Promise<ReminderState>{
  validateReminderTime(time);const generation=++this.generation;
  const before=await this.read();if(!before.supported||generation!==this.generation)return this.read();
  if(!this.permission){const pending=this.port.requestPermission();this.permission=pending;void pending.finally(()=>{if(this.permission===pending)this.permission=undefined;}).catch(()=>{});}
  const permission=await this.permission;
  return this.serial(async()=>{
   if(generation!==this.generation||permission!=='granted')return this.port.read();
   const state=await this.port.schedule(time);
   if(generation!==this.generation)return this.port.disable();
   return state;
  });
 }
 disable():Promise<ReminderState>{++this.generation;return this.serial(()=>this.port.disable());}
 reset():Promise<ReminderState>{++this.generation;return this.serial(()=>this.port.clear());}
 openSettings():Promise<void>{return this.port.openSettings();}
 async preview():Promise<void>{const state=await this.read();if(!state.supported||state.permission!=='granted')throw new Error('알림 권한을 허용한 뒤 미리 볼 수 있어요.');await this.port.preview();}
}
