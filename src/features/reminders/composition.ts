import {reminderPort} from '../../services/reminders';
import {ReminderController} from './ReminderController';
export const reminderController=new ReminderController(reminderPort);
