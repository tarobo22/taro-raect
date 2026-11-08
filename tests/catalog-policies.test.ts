import assert from 'node:assert/strict';
import test from 'node:test';
import {cardMeaningLine} from '../src/domain/cardMeaning';
import {selectExperienceTopic} from '../src/features/experience/model';
import {decodeCard} from '../src/features/p0/P0Api';
import {defaultSkinId, skinIds, skins} from '../src/features/skins/catalog';
import {isSkinId} from '../src/features/skins/SkinSelection';

test('experience selections use server IDs and recover a stored label from older releases',()=>{
 const topics=['연애·관계','일·진로','나 자신','오늘의 선택','마음 돌봄','새로운 시작'];
 assert.deepEqual(topics.map(label=>selectExperienceTopic({topics},label)?.id),
  ['relationship','work','self','daily','care','start']);
 const configuration={topics:['새로 쓴 진로 제목'],topicOptions:[{id:'work' as const,label:'새로 쓴 진로 제목'}]};
 assert.deepEqual(selectExperienceTopic(configuration,'일·진로'),configuration.topicOptions[0]);
 assert.deepEqual(selectExperienceTopic(configuration,'work'),configuration.topicOptions[0]);
});

test('card one-liners prefer versioned content and handle older responses',()=>{
 const raw={id:0,code:'major_00',name_ko:'바보',name_en:'The Fool',arcana:'major',suit:null,
  basic_meaning:'기본 풀이예요. 상세 내용이에요.',image_asset:null};
 assert.equal(cardMeaningLine(decodeCard(raw).short_meaning,raw.basic_meaning),'기본 풀이예요.');
 assert.equal(cardMeaningLine(decodeCard({...raw,short_meaning:'새로운 한 줄.'}).short_meaning,
  raw.basic_meaning),'새로운 한 줄.');
});

test('skin registry supplies the default, presentation, and feedback settings',()=>{
 assert.equal(defaultSkinId,'cafe');
 assert.deepEqual(skinIds,Object.keys(skins));
 assert.ok(skinIds.every(id=>isSkinId(id)&&skins[id].theme.frame&&skins[id].wallpaper));
 assert.deepEqual(skins.playroom.cues,{select:'meow',greet:'meow'});
 assert.equal(isSkinId('constructor'),false);
});
