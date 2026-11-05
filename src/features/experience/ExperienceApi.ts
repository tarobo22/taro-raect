import type {JsonTransport} from '../../infrastructure/http/FetchClient';
import type {Card} from '../../domain/content';
import type {Counsel,CounselDraft,ExperienceConfig,ExperienceRepository,Reading,ReadingDraft} from './model';

interface Endpoints {config:string;readings:string;daily:string;counsel:string;}
function object(value:unknown):Record<string,unknown>{
  if(typeof value!=='object'||value===null||Array.isArray(value))throw new Error('응답을 확인하지 못했어요. 입력은 그대로 유지됩니다.');
  return value as Record<string,unknown>;
}
function text(value:unknown):string{if(typeof value!=='string')throw new Error('응답 내용을 확인하지 못했어요.');return value;}
function strings(value:unknown):string[]{if(!Array.isArray(value))throw new Error('설정을 확인하지 못했어요.');return value.map(text);}
function integer(value:unknown):number{if(typeof value!=='number'||!Number.isInteger(value)||value<0)throw new Error('설정을 확인하지 못했어요.');return value;}
function card(value:unknown):Card{
  const v=object(value);const art=v.art;
  if(art!=='sun'&&art!=='leaf'&&art!=='path')throw new Error('카드를 확인하지 못했어요.');
  return {id:integer(v.id),name:text(v.name),keyword:text(v.keyword),message:text(v.message),action:text(v.action),art};
}
function optionalText(value:unknown){return value==null?undefined:text(value);}
export function decodeReading(value:unknown):Reading{
  const v=object(value);if(!Array.isArray(v.cards)||!v.cards.length)throw new Error('리딩 결과를 확인하지 못했어요.');
  return {id:optionalText(v.id),day:optionalText(v.day),topic:text(v.topic),question:text(v.question),
    spreadId:text(v.spreadId),summary:text(v.summary),advice:text(v.advice),action:text(v.action),created_at:optionalText(v.created_at),
    cards:v.cards.map(c=>({...card(c),position:text(object(c).position)}))};
}
export function decodeCounsel(value:unknown):Counsel{
  const v=object(value);const tone=v.tone;const expression=v.expression;
  if(tone!=='warm'&&tone!=='giga')throw new Error('대화 결과를 확인하지 못했어요.');
  if(expression!=='listen'&&expression!=='encourage'&&expression!=='joy'&&expression!=='concern'&&expression!=='serious')throw new Error('표정을 확인하지 못했어요.');
  if(v.source!=='local'&&v.source!=='openai'&&v.source!=='safety')throw new Error('대화 출처를 확인하지 못했어요.');
  return {id:text(v.id),topic:text(v.topic),question:text(v.question),tone,expression,source:v.source,
    empathy:text(v.empathy),advice:text(v.advice),action:text(v.action),created_at:text(v.created_at),parentId:optionalText(v.parentId)};
}

export class ExperienceApi implements ExperienceRepository{
  constructor(private readonly http:JsonTransport,private readonly paths:Endpoints){}
  async config():Promise<ExperienceConfig>{
    const v=object(await this.http.request(this.paths.config,{},false));
    const spreads:ExperienceConfig['spreads']={};
    for(const [id,raw] of Object.entries(object(v.spreads))){const s=object(raw);spreads[id]={name:text(s.name),positions:strings(s.positions)};}
    if(!Array.isArray(v.cards)||typeof v.aiAvailable!=='boolean')throw new Error('설정을 불러오지 못했어요.');
    const topics=strings(v.topics),questions=strings(v.questions);
    if(!topics.length||!questions.length||!Object.keys(spreads).length||!v.cards.length)throw new Error('준비된 설정이 없어요.');
    return {topics,questions,spreads,cards:v.cards.map(card),aiAvailable:v.aiAvailable,
      maxTarotQuestion:integer(v.maxTarotQuestion),maxCounselQuestion:integer(v.maxCounselQuestion),deckPreviewSize:integer(v.deckPreviewSize)};
  }
  async readings(){const v=await this.http.request(this.paths.readings);if(!Array.isArray(v))throw new Error('기록을 불러오지 못했어요.');return v.map(decodeReading);}
  async deleteReading(id:string){await this.http.request(this.paths.readings+'/'+encodeURIComponent(id),{method:'DELETE'});}
  async deleteCounsel(id:string){await this.http.request(this.paths.counsel+'/'+encodeURIComponent(id),{method:'DELETE'});}
  async counsels(){const v=await this.http.request(this.paths.counsel);if(!Array.isArray(v))throw new Error('대화를 불러오지 못했어요.');return v.map(decodeCounsel);}
  async reading(draft:ReadingDraft,requestId:string){return decodeReading(await this.http.request(this.paths.readings,{method:'POST',body:JSON.stringify({...draft,requestId})}));}
  async daily(day:string,topic:string){return decodeReading(await this.http.request(this.paths.daily,{method:'POST',body:JSON.stringify({day,topic})}));}
  async counsel(draft:CounselDraft,requestId:string){return decodeCounsel(await this.http.request(this.paths.counsel,{method:'POST',body:JSON.stringify({...draft,requestId})}));}
}
