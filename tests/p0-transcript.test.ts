import test from 'node:test';
import assert from 'node:assert/strict';
import {applyReviewedTranscript} from '../src/features/p0/applyReviewedTranscript';

test('reviewed cloud text appends to a restored draft and never sends a conversation',async()=>{
 const values=new Map([['yeoun.talk.draft',JSON.stringify({question:'my existing words',answers:[true],parentId:'owned'})]]);
 const store={getItem:async(k:string)=>values.get(k)??null,setItem:async(k:string,v:string)=>{values.set(k,v);}};
 await applyReviewedTranscript(store,'talk','transcript-id','reviewed words');
 const draft=JSON.parse(values.get('yeoun.talk.draft')!);
 assert.equal(draft.question,'my existing words\nreviewed words');assert.deepEqual(draft.answers,[true]);assert.equal(draft.parentId,'owned');
 await applyReviewedTranscript(store,'talk','transcript-id','reviewed words');
 assert.equal(JSON.parse(values.get('yeoun.talk.draft')!).question,'my existing words\nreviewed words');
});
test('a journal review preserves mood and optimistic version and rejects corrupt drafts',async()=>{
 const values=new Map([['yeoun.journal.draft.new',JSON.stringify({body:'earlier',mood:'calm',day:'2026-11-06',version:3})]]);
 const store={getItem:async(k:string)=>values.get(k)??null,setItem:async(k:string,v:string)=>{values.set(k,v);}};
 await applyReviewedTranscript(store,'journal','id','later');
 const draft=JSON.parse(values.get('yeoun.journal.draft.new')!);assert.equal(draft.body,'earlier\nlater');assert.equal(draft.mood,'calm');assert.equal(draft.version,3);
 values.set('yeoun.talk.draft','corrupt');
 await assert.rejects(applyReviewedTranscript(store,'talk','id','keep'),/초안/);assert.equal(values.get('yeoun.talk.draft'),'corrupt');
});
