export type NotificationPermission='granted'|'denied'|'blocked'|'unavailable';
export interface ReminderTime{hour:number;minute:number;}
export interface ReminderState extends ReminderTime{supported:boolean;permission:NotificationPermission;enabled:boolean;nextAt:string|null;}
/** Local device capability. Never sends a journal, token, or time preference to the server. */
export interface ReminderPort{
 read():Promise<ReminderState>;
 requestPermission():Promise<NotificationPermission>;
 schedule(time:ReminderTime):Promise<ReminderState>;
 disable():Promise<ReminderState>;
 clear():Promise<ReminderState>;
 openSettings():Promise<void>;
 preview():Promise<void>;
}
