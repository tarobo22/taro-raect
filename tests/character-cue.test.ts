import assert from 'node:assert/strict';
import test from 'node:test';
import {CharacterCue} from '../src/features/skins/CharacterCue';
test('disabled sound and voice capture do not consume the next explicit meow',()=>{
 const cue=new CharacterCue();
 assert.equal(cue.request(0,false,false),false);
 assert.equal(cue.request(10,true,true),false);
 assert.equal(cue.request(20,true,false),true);
});
test('repeated taps cannot overlap the cat cue and play again after cooldown',()=>{
 const cue=new CharacterCue();
 assert.equal(cue.request(100,true,false),true);
 assert.equal(cue.request(300,true,false),false);
 assert.equal(cue.request(1499,true,false),false);
 assert.equal(cue.request(1500,true,false),true);
});
test('a backwards clock cannot trigger extra sound',()=>{
 const cue=new CharacterCue();
 assert.equal(cue.request(2000,true,false),true);
 assert.equal(cue.request(1990,true,false),false);
 assert.equal(cue.request(3400,true,false),true);
});
