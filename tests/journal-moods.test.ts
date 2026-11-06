import test from 'node:test';
import assert from 'node:assert/strict';
import {JournalApi} from '../src/features/journal/JournalApi';

const labels={calm:'편안해요',happy:'기뻐요',thinking:'생각이 많아요',settled:'차분해요',talk:'이야기하고 싶어요'};
const codes=Object.keys(labels) as (keyof typeof labels)[];
const sorted=Object.values(labels).sort();
const id='00000000-0000-4000-8000-000000000001',source='00000000-0000-4000-8000-000000000002';
const entry={id,local_day:'2026-11-06',mood:'calm',body:'my words',source_reading_id:source,source_turn_id:null,
             version:1,created_at:'2026-11-06T00:00:00Z',updated_at:'2026-11-06T00:00:00Z'};

function context(policy:unknown={moods:sorted,maxBodyLength:4000,moodCodes:labels}){
 const calls:{path:string;options:RequestInit}[]=[];
 let wire={...entry};
 const api=new JournalApi({request:async(path,options={})=>{
  calls.push({path,options});
  if(path==='/policy')return policy;
  if(options.method==='POST'||options.method==='PATCH'){
   const body=JSON.parse(String(options.body));wire={...wire,mood:body.mood,body:body.body,version:wire.version+1};return wire;
  }
  return wire;
 }},{entries:'/v1/entries',policy:'/policy'},'/v2/journal-entries');
 return {api,calls,setMood:(mood:string)=>{wire={...wire,mood};}};
}

for(const code of codes){
 test(`sorted v1 policy preserves the ${code} label through v2 create, get and edit`,async()=>{
  const {api,calls,setMood}=context();
  await api.policy();
  const created=await api.create({day:entry.local_day,mood:labels[code],body:'my words',requestId:id,sourceReadingId:source});
  const post=calls.find(c=>c.options.method==='POST')!;
  assert.equal(JSON.parse(String(post.options.body)).mood,code,'the selected label must submit its semantic code');
  assert.equal(created.mood,labels[code]);
  setMood(code);
  const loaded=await api.get(id);
  assert.equal(loaded.mood,labels[code]);
  const changed=await api.update(id,{...loaded,body:'edited',mood:labels[code]});
  assert.equal(JSON.parse(String(calls.find(c=>c.options.method==='PATCH')!.options.body)).mood,code);
  assert.equal(changed.mood,labels[code]);
 });
 test(`an old server with reordered labels safely resolves the known ${code} label`,async()=>{
  const {api,calls,setMood}=context({moods:[...sorted].reverse(),maxBodyLength:4000});
  setMood(code);
  const loaded=await api.get(id);
  assert.equal(loaded.mood,labels[code]);
  await api.update(id,{...loaded,mood:labels[code]});
  assert.equal(JSON.parse(String(calls.find(c=>c.options.method==='PATCH')!.options.body)).mood,code);
 });
}

test('an explicit map takes precedence over default labels and object insertion order',async()=>{
 const custom={talk:'함께 나누고 싶어요',settled:'정리가 됐어요',thinking:'궁금해요',happy:'즐거워요',calm:'고요해요'};
 const {api,calls,setMood}=context({moods:Object.values(custom).sort(),maxBodyLength:4000,moodCodes:custom});
 for(const code of codes){setMood(code);const loaded=await api.get(id);assert.equal(loaded.mood,custom[code]);
  await api.update(id,{...loaded,mood:custom[code]});
  assert.equal(JSON.parse(String(calls.filter(c=>c.options.method==='PATCH').at(-1)!.options.body)).mood,code);}
});

test('v1 list and unlinked creation and edits preserve every original mood string',async()=>{
 const calls:RequestInit[]=[];
 const v1=(mood:string)=>({...entry,day:entry.local_day,mood});
 const api=new JournalApi({request:async(_path,options={})=>{calls.push(options);return options.method?v1(JSON.parse(String(options.body)).mood):codes.map(c=>v1(labels[c]));}},{entries:'/entries',policy:'/policy'});
 assert.deepEqual((await api.list()).map(e=>e.mood),codes.map(c=>labels[c]));
 for(const code of codes){const created=await api.create({day:entry.local_day,mood:labels[code],body:''});assert.equal(created.mood,labels[code]);
  const edited=await api.update(id,{...created,mood:labels[code],body:'edit'});assert.equal(edited.mood,labels[code]);
  assert.equal(JSON.parse(String(calls.at(-1)!.body)).mood,labels[code]);}
});

test('an unmapped old-server label is rejected before sending any v2 mutation',async()=>{
 const {api,calls}=context({moods:['사용자 정의 마음'],maxBodyLength:4000});
 await assert.rejects(api.create({day:entry.local_day,mood:'사용자 정의 마음',body:'keep my words',requestId:id,sourceReadingId:source}),/마음/);
 assert.equal(calls.filter(c=>c.options.method==='POST').length,0);
});

for(const mapping of [{calm:'편안해요'}, {...labels,happy:'편안해요'}, {...labels,calm:'목록에 없는 마음'}, {...labels,extra:'추가 마음'}, null]){
 test(`invalid explicit mood mapping cannot silently fall back (${JSON.stringify(mapping)})`,async()=>{
  const {api,calls}=context({moods:sorted,maxBodyLength:4000,moodCodes:mapping});
  await assert.rejects(api.policy(),/마음기록 설정/);
  assert.equal(calls.filter(c=>c.options.method==='POST').length,0);
 });
}
