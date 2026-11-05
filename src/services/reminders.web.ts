import type {ReminderPort} from '../features/reminders/types';
import {unavailableReminder} from '../features/reminders/policy';
/** Browser tabs cannot guarantee daily delivery after closing. Do not show a fake enabled state. */
export const reminderPort:ReminderPort={
 read:async()=>unavailableReminder(),requestPermission:async()=>'unavailable',schedule:async()=>unavailableReminder(),disable:async()=>unavailableReminder(),clear:async()=>unavailableReminder(),openSettings:async()=>{},preview:async()=>{},
};
