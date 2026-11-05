import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Attempt,AttemptStore} from '../../features/experience/submit';

export function operationReceipts(key:string):AttemptStore{
  return {
    async read(){
      const raw=await AsyncStorage.getItem(key);
      if(!raw)return null;
      const value:unknown=JSON.parse(raw);
      if(typeof value!=='object'||value===null||!('id'in value)||!('fingerprint'in value)||
        typeof value.id!=='string'||typeof value.fingerprint!=='string'||
        !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value.id)){
        throw new Error('이전 요청을 복원하지 못했어요. 작성한 이야기는 남겨 두고 다시 시도해 주세요.');
      }
      return value as Attempt;
    },
    async write(value){await AsyncStorage.setItem(key,JSON.stringify(value));},
    async clear(){await AsyncStorage.removeItem(key);},
  };
}
