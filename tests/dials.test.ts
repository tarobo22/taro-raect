import test from 'node:test';
import assert from 'node:assert/strict';
import {dialAngle,dialIndex,beginDialDrag,moveDialDrag,dialKeyIndex} from '../src/features/motion/dial';

test('a bounded 270 degree dial reaches every server slot and clamps through the lower gap without wrapping',()=>{
 for(const count of [5,6,12])for(let i=0;i<count;i++)assert.equal(dialIndex(dialAngle(i,count),count),i);
 assert.equal(dialAngle(0,12),-135);assert.equal(dialAngle(11,12),135);
 let drag=beginDialDrag(11,12,135,true);for(const angle of [170,-170,-135]){drag=moveDialDrag(drag,angle);assert.equal(dialIndex(drag.position,12),11);}
 drag=moveDialDrag(drag,-180);assert.equal(drag.position,90);assert.equal(dialIndex(drag.position,12),9);
 const center=beginDialDrag(4,12,0,false);assert.equal(dialIndex(center.position,12),4);
 assert.equal(dialIndex(-200,5),0);assert.equal(dialIndex(200,5),4);
});

test('keyboard endpoints clamp topic and mood while the explicitly circular clock preserves midnight wrap',()=>{
 assert.equal(dialKeyIndex('Home',4,5),0);assert.equal(dialKeyIndex('End',0,5),4);
 assert.equal(dialKeyIndex('ArrowRight',4,5),4);assert.equal(dialKeyIndex('ArrowDown',0,5),0);
 assert.equal(dialKeyIndex('ArrowLeft',0,24,true),23);assert.equal(dialKeyIndex('ArrowUp',23,24,true),0);
 assert.equal(dialIndex(360,24,true),0);assert.equal(dialIndex(-15,24,true),23);
 assert.equal(dialKeyIndex('Enter',2,5),null);assert.equal(dialKeyIndex('End',0,0),null);
});
