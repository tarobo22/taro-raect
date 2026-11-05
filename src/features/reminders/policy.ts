import type {ReminderState,ReminderTime} from './types';
export const defaultReminderTime:Readonly<ReminderTime>={hour:20,minute:0};
export function unavailableReminder():ReminderState{return {...defaultReminderTime,supported:false,permission:'unavailable',enabled:false,nextAt:null};}
export function validateReminderTime(time:ReminderTime){if(!Number.isInteger(time.hour)||time.hour<0||time.hour>23||!Number.isInteger(time.minute)||time.minute<0||time.minute>59)throw new Error('시간은 0~23시, 0~59분으로 선택해 주세요.');}
