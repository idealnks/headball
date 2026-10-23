import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function game(){
 const handlers={};const elements=new Map();
 const element=()=>({textContent:'',innerHTML:'',hidden:false,focus(){},querySelector(){return element();},getContext(){return {};}});
 const context=vm.createContext({Math,Image:class {},document:{querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s);},querySelectorAll(){return [];}},window:{addEventListener(name,fn){handlers[name]=fn;}},requestAnimationFrame(){}});
 vm.runInContext(readFileSync(new URL('../public/game.js',import.meta.url),'utf8'),context);
 return {run:s=>vm.runInContext(s,context),key:(repeat=false)=>handlers.keydown({key:' ',code:'Space',repeat,preventDefault(){}})};
}
test('Space lifts a nearby low ball forward without pausing',()=>{const g=game();g.run('begin();ball={x:350,y:432,vx:0,vy:0}');g.key();g.run('tick(1/120)');assert.equal(g.run('state'),'playing');assert.ok(g.run('ball.vx>400 && ball.vy < -600'));g.run('for(let n=0;n<35;n++)tick(1/120)');assert.ok(g.run('ball.y<320'));});
test('kick follows facing and cannot hit distant or high balls',()=>{const g=game();g.run('begin();player.face=-1;ball={x:250,y:432,vx:0,vy:0}');g.key();g.run('tick(1/120)');assert.ok(g.run('ball.vx < -400'));for(const ball of ['{x:600,y:432,vx:0,vy:0}','{x:350,y:150,vx:0,vy:0}']){g.run(`begin();ball=${ball}`);g.key();g.run('tick(1/120)');assert.ok(g.run('ball.vy > -200'));}});
test('repeat events and cooldown prevent repeated kicks',()=>{const g=game();g.run('begin();ball={x:350,y:432,vx:0,vy:0}');g.key(true);assert.equal(g.run('kickQueued'),false);g.key();g.run('tick(1/120);ball={x:350,y:432,vx:0,vy:0}');g.key();g.run('tick(1/120)');assert.ok(g.run('ball.vy > -200'));});
test('press ball escapes torso and head traps in either player order',()=>{for(const reverse of [false,true])for(const y of [432,365]){const g=game();g.run(`begin();player.x=${reverse?560:500};ai.x=${reverse?500:560};ball={x:530,y:${y},vx:0,vy:0};pressBall()`);assert.ok(g.run('ball.vy===-740 && ball.y<=310'));g.run('for(let n=0;n<20;n++)tick(1/120)');assert.ok(g.run('ball.y<250'));}});
test('a lone player does not cause a press shot and pause prevents kicks',()=>{const g=game();g.run('begin();ball={x:330,y:432,vx:0,vy:0};pressBall()');assert.equal(g.run('ball.vy'),0);g.run('pause()');g.key();assert.equal(g.run('kickQueued'),false);});

test('kick animation starts even on a miss and ends after the swing',()=>{const g=game();g.run('begin();ball={x:900,y:150,vx:0,vy:0}');g.key();g.run('tick(1/120)');assert.ok(g.run('player.kickTime>0'));g.run('for(let n=0;n<40;n++)tick(1/120)');assert.equal(g.run('player.kickTime'),0);});
test('AI crosses midfield to pursue a ball in the human half',()=>{const g=game();g.run('begin();player.x=65;ball={x:250,y:100,vx:0,vy:0};for(let n=0;n<150;n++)tick(1/120)');assert.ok(g.run('ai.x<550'));});
test('AI kicks a low ball towards the human goal with a visible swing',()=>{const g=game();g.run('begin();ball={x:750,y:432,vx:0,vy:0};tick(1/120)');assert.ok(g.run('ball.vx < -400 && ball.vy < -600 && ai.kickTime>0'));assert.ok(g.run('kickEffects.length===1'));});
