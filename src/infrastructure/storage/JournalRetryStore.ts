import AsyncStorage from '@react-native-async-storage/async-storage';
import type {JournalAttempt,JournalRetryStore} from '../../features/journal/model';

const key='yeoun.journal.pending-create';
export const journalRetries:JournalRetryStore={
  async read(){
    const saved=await AsyncStorage.getItem(key);
    if(!saved)return null;
    const value:unknown=JSON.parse(saved);
    if(typeof value!=='object'||value===null||!('fingerprint' in value)||!('id' in value)||
      typeof value.fingerprint!=='string'||typeof value.id!=='string'||
      !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value.id)){
      throw new Error('이전 저장 요청을 복원하지 못했어요. 입력한 글은 남겨 두고 다시 시도해 주세요.');
    }
    return value as JournalAttempt;
  },
  async write(value){await AsyncStorage.setItem(key,JSON.stringify(value));},
  async clear(){await AsyncStorage.removeItem(key);},
};
