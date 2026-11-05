import test from 'node:test';
import assert from 'node:assert/strict';
import {DashboardLoader} from '../src/features/dashboard/DashboardLoader';
import type {ExperienceConfig,ExperienceRepository} from '../src/features/experience/model';

const config:ExperienceConfig={topics:['care'],cards:[],spreads:{},questions:[],
  maxTarotQuestion:100,maxCounselQuestion:200,deckPreviewSize:12,aiAvailable:false};
const entry={id:'one',day:'2026-11-06',mood:'calm',body:'kept',createdAt:'2026-11-06',updatedAt:'2026-11-06'};
const journal={list:async()=>[entry],policy:async()=>({moods:['calm'],maxBodyLength:200})};
function experiences():Pick<ExperienceRepository,'readings'|'counsels'|'config'>{
  return {readings:async()=>[],counsels:async()=>[],config:async()=>config};
}

test('one failed history endpoint preserves usable configuration and other records',async()=>{
  const experience=experiences();
  experience.readings=async()=>{throw new Error('tarot is temporarily unavailable');};
  const state=await new DashboardLoader(journal,experience).load();
  assert.ok(state);
  assert.deepEqual(state.entries,[entry]);
  assert.deepEqual(state.config,config);
  assert.deepEqual(state.journalPolicy,{moods:['calm'],maxBodyLength:200});
  assert.match(state.errors.readings??'',/temporarily unavailable/);
});

test('refresh keeps the last good history when that endpoint later fails',async()=>{
  const source={...journal};const loader=new DashboardLoader(source,experiences());
  await loader.load();
  source.list=async()=>{throw new Error('offline');};
  const next=await loader.load();
  assert.ok(next);assert.deepEqual(next.entries,[entry]);
  assert.match(next.errors.entries??'',/offline/);
});

test('a slow older refresh never replaces a newer completed refresh',async()=>{
  let release!:(value:typeof entry[])=>void;let calls=0;
  const slow=new Promise<typeof entry[]>(resolve=>{release=resolve;});
  const source={...journal,list:()=>++calls===1?slow:Promise.resolve([{...entry,body:'newest'}])};
  const loader=new DashboardLoader(source,experiences());
  const older=loader.load();const newer=await loader.load();
  assert.equal(newer?.entries[0].body,'newest');
  release([entry]);assert.equal(await older,null);
  assert.equal(loader.snapshot.entries[0].body,'newest');
});
