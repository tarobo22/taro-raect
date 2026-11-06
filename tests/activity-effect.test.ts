import test from 'node:test';
import assert from 'node:assert/strict';
import {ActivityEffect} from '../src/features/motion/ActivityEffect';

function resources(active=true,enabled=true){const started:(()=>boolean)[]=[],stopped:number[]=[];const effect=new ActivityEffect(current=>{const id=started.length;started.push(current);return()=>stopped.push(id);},active,enabled);return{effect,started,stopped};}
test('mounting while inactive does not allocate repeating resources',()=>{const r=resources(false);assert.equal(r.started.length,0);r.effect.setForeground(true);assert.equal(r.started.length,1);});
test('repeated foreground notifications keep exactly one running resource',()=>{const r=resources();r.effect.setForeground(true);r.effect.setForeground(true);assert.equal(r.started.length,1);assert.deepEqual(r.stopped,[]);});
test('background and inactive transitions stop the resource once and invalidate queued callbacks',()=>{const r=resources();r.effect.setForeground(false);r.effect.setForeground(false);assert.deepEqual(r.stopped,[0]);assert.equal(r.started[0](),false);});
test('foreground creates a fresh loop and old callbacks cannot affect its state',()=>{const r=resources();r.effect.setForeground(false);r.effect.setForeground(true);assert.equal(r.started.length,2);assert.equal(r.started[0](),false);assert.equal(r.started[1](),true);});
test('reduced motion disables resources and reenabling starts one current resource',()=>{const r=resources(true,false);assert.equal(r.started.length,0);r.effect.setEnabled(true);r.effect.setEnabled(false);assert.deepEqual(r.stopped,[0]);r.effect.setEnabled(true);assert.equal(r.started.length,2);});
test('unmount disposes once and later foreground cannot restart or update state',()=>{const r=resources();r.effect.dispose();r.effect.dispose();r.effect.setForeground(true);r.effect.setEnabled(true);assert.deepEqual(r.stopped,[0]);assert.equal(r.started.length,1);assert.equal(r.started[0](),false);});
