import AsyncStorage from '../../features/account/storage';
import type {JournalDraft,JournalDraftStore} from '../../features/journal/model';
import {journalDraftKey} from '../../features/journal/model';

export function journalDraftStore(initial:JournalDraft):JournalDraftStore{
  const key=journalDraftKey(initial);
  return {
    async read(){
      const raw=await AsyncStorage.getItem(key);
      if(!raw){
        const legacy=initial.id||initial.sourceReadingId||initial.sourceTurnId?null:await AsyncStorage.getItem('yeoun.draft');
        return legacy?{...initial,body:legacy}:null;
      }
      const value:unknown=JSON.parse(raw);
      if(typeof value!=='object'||value===null||!('body'in value)||!('mood'in value)||!('day'in value)||
        typeof value.body!=='string'||typeof value.mood!=='string'||typeof value.day!=='string'){
        throw new Error('임시 글을 불러오지 못했어요.');
      }
      if(('id'in value&&value.id!==initial.id)||
        ('version'in value&&(!Number.isInteger(value.version)||Number(value.version)<1))){
        throw new Error('임시 글의 기록 정보를 확인하지 못했어요.');
      }
      return value as JournalDraft;
    },
    async write(value){await AsyncStorage.setItem(key,JSON.stringify(value));},
    async clear(){
      await AsyncStorage.removeItem(key);
      if(!initial.id&&!initial.sourceReadingId&&!initial.sourceTurnId)await AsyncStorage.removeItem('yeoun.draft');
    },
  };
}
