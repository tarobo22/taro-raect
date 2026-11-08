import type {Card, Advice, Tone} from '../../domain/content';
import {findTopicCode,type Topic} from '../p0/model';

export interface Reading {
  id?: string; day?: string; topic: string; question: string; spreadId: string;
  cards: (Card & {position: string})[]; summary: string; advice: string; action: string; created_at?: string;
}
export interface Counsel extends Advice {
  id: string; topic: string; question: string; tone: Tone; created_at: string;
  source: 'local'|'openai'|'safety'; parentId?: string;
}
export interface ExperienceConfig {
  topics: string[]; cards: Card[]; spreads: Record<string,{name:string;positions:string[]}>;
  topicOptions?: TopicOption[];
  questions: string[]; maxTarotQuestion: number; maxCounselQuestion: number; deckPreviewSize: number; aiAvailable: boolean;
}
export interface TopicOption {id:Topic;label:string;}
export function selectExperienceTopic(config:Pick<ExperienceConfig,'topics'|'topicOptions'>,value:string):TopicOption|undefined{
  const options=config.topicOptions??config.topics.flatMap(label=>{
    const id=findTopicCode(label);
    return id?[{id,label}]:[];
  });
  return options.find(option=>option.id===value||option.label===value)
    ??options.find(option=>option.id===findTopicCode(value));
}
export interface ReadingDraft {topic:string;question:string;cardIds:number[];spreadId:string;}
export interface CounselDraft {topic:string;question:string;answers:boolean[];tone:Tone;useAI:boolean;consent:boolean;parentId?:string;}
export interface ExperienceRepository {
  config(): Promise<ExperienceConfig>;
  readings(): Promise<Reading[]>;
  counsels(): Promise<Counsel[]>;
  reading(draft:ReadingDraft,requestId:string): Promise<Reading>;
  daily(day:string,topic:string): Promise<Reading>;
  counsel(draft:CounselDraft,requestId:string): Promise<Counsel>;
}
