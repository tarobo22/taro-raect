import type {Route} from '../../navigation';
import type {JournalSource} from '../journal/JournalSourceApi';
export function sourceRoute(source:JournalSource):Route{
 switch(source.kind){
  case'reading_v2':return {name:'reading-v2',readingId:source.reading_id};
  case'turn_v2':return {name:'turn',conversationId:source.conversation_id,turnId:source.turn_id};
  case'legacy_reading':return {name:'reading',reading:source.reading};
  case'legacy_counsel':return {name:'counsel',counsel:source.counsel};
 }
}
