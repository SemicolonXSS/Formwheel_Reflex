export function submit(room,uid,roundNumber,result){
 if(!room||room.status!=='playing'||room.round!==roundNumber||!room.players?.[uid]||room.results?.[roundNumber]?.[uid])return;
 if(!Number.isInteger(result.ms)||result.ms<0||result.ms>2000||!['hit','early','timeout'].includes(result.kind))return;
 room.results??={};room.results[roundNumber]??={};room.results[roundNumber][uid]={ms:result.ms,kind:result.kind};return room;
}
export function advance(room,now,delay){
 if(!room||room.status!=='playing')return;
 room.results??={};room.results[room.round]??={};const entries=room.results[room.round],players=Object.keys(room.players||{});
 if(now>=room.goAt+10000)for(const uid of players)if(!entries[uid])entries[uid]={ms:2000,kind:'timeout'};
 if(players.some(uid=>!entries[uid]))return;
 if(room.round>=5){room.status='finished';return room}
 room.round++;room.goAt=now+delay;return room;
}
export function ranking(room){return Object.entries(room.players||{}).map(([uid,p])=>{const attempts=Object.values(room.results||{}).map(round=>round[uid]).filter(Boolean);return{uid,name:p.name,average:attempts.length?Math.round(attempts.reduce((sum,x)=>sum+x.ms,0)/attempts.length):2000,attempts:attempts.length}}).sort((a,b)=>a.average-b.average||a.name.localeCompare(b.name))}
