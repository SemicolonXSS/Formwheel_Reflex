const assert=require('node:assert/strict');
(async()=>{const {submit,advance,ranking}=await import('../modules/battle-state.js');let room={status:'playing',round:1,goAt:1000,players:{a:{name:'A'},b:{name:'B'}},results:{}};
assert.equal(submit(room,'x',1,{kind:'hit',ms:10}),undefined);assert.equal(submit(room,'a',2,{kind:'hit',ms:10}),undefined);
room=submit(room,'a',1,{kind:'hit',ms:200});assert.equal(submit(room,'a',1,{kind:'hit',ms:1}),undefined);assert.equal(advance(room,1001,2000),undefined);
room=submit(room,'b',1,{kind:'early',ms:2000});room=advance(room,2000,3000);assert.equal(room.round,2);assert.equal(room.goAt,5000);
for(let round=2;round<=5;round++){room=submit(room,'a',round,{kind:'hit',ms:200});room=advance(room,room.goAt+10000,3000)}assert.equal(room.status,'finished');assert.equal(ranking(room)[0].uid,'a');assert.equal(ranking(room)[0].attempts,5);assert.equal(ranking(room)[1].average,2000);assert.equal(submit(room,'a',5,{kind:'hit',ms:1}),undefined);
console.log('PASS duplicate/outsider/stale answers, early penalty, deadlines, five-round settlement and ranking');})().catch(e=>{console.error(e);process.exitCode=1});
