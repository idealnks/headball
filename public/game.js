const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
const W = 1100, H = 520, floor = 448, radius = 16, goalTop = 265;
const keys = new Set();
const portrait = new Image();
portrait.src='/player-face.png';
const aiPortrait=new Image();aiPortrait.src='/ai-face.png';
let special=null, specialReady=[false,false], specialGranted=[false,false];
let kickEffects=[];
let animationTime=0;
let field='grass',fieldTime=0;
function fieldSlope(){if(field!=='tilt')return 0;const phase=Math.floor(fieldTime/5),blend=Math.min(1,(fieldTime%5)/.45);const target=phase%2===0?-.065:.065;return phase===0?target:-target+(2*target)*(blend*blend*(3-2*blend));}
function groundAt(x){x=Math.max(0,Math.min(W,x));return floor+(field==='farm'?16*Math.sin(x/95)+9*Math.sin(x/43):fieldSlope()*(x-W/2));}
function groundSlope(x){return (groundAt(x+1)-groundAt(x-1))/2;}
function goalHeight(x){return goalTop+groundAt(x)-floor;}

let faceDamage=[0,0], hitCooldown=[0,0], noGoalTime=[0,0], trainReady=[false,false];
let state = 'ready', time = 120, scores = [0, 0], goalWait = 0, last = 0, accumulator = 0;
let player, ai, ball;
let overtime=false;
let mode='ai', secondKickQueued=false;
const difficulties={easy:{label:'Leicht',speed:235,miss:.55,predict:.08,jump:75},normal:{label:'Normal',speed:290,miss:.3,predict:.2,jump:105},hard:{label:'Schwer',speed:310,miss:.16,predict:.3,jump:120}};
const rounds=[{label:'Viertelfinale',name:'NICO',difficulty:'easy',color:'#92b873'},{label:'Halbfinale',name:'BRUNO',difficulty:'normal',color:'#bf91df'},{label:'Finale',name:'TITAN',difficulty:'hard',color:'#f1a36e'}];
let difficulty='normal',tournament=false,roundIndex=0,nextRound=false,suddenDeath=false;
function aiSettings(){return difficulties[difficulty];}
function syncMenu(){const selection=document.querySelector('#mode').value;document.querySelector('#difficulty').disabled=selection!=='ai';document.querySelector('#tournament-info').hidden=selection!=='tournament';}

let kickQueued=false, kickCooldown=0, pressCooldown=0;
const overlay = document.querySelector('#overlay'), start = document.querySelector('#start');
function resetField(){kickQueued=false;secondKickQueued=false;keys.clear();kickCooldown=0;pressCooldown=0;kickEffects=[];player={x:300,y:floor-48,vx:0,vy:0,color:'#69c5ed',face:1,kickTime:0,kickDirection:1,cooldown:0};ai={x:800,y:floor-48,vx:0,vy:0,color:tournament?rounds[roundIndex].color:'#f1a36e',face:-1,kickTime:0,kickDirection:-1,cooldown:0};ball={x:550,y:160,vx:(Math.random()-.5)*160,vy:0};player.y=groundAt(player.x)-48;ai.y=groundAt(ai.x)-48;}
function selectedDuration(){const value=Number(document.querySelector('#duration').value);return [60,120,180].includes(value)?value:120;}
function begin(advance=false){field=['grass','farm','tilt'].includes(document.querySelector('#field').value)?document.querySelector('#field').value:'grass';fieldTime=0;if(advance===true&&nextRound){roundIndex++;nextRound=false;}else{tournament=document.querySelector('#mode').value==='tournament';roundIndex=0;nextRound=false;}suddenDeath=false;difficulty=tournament?rounds[roundIndex].difficulty:(document.querySelector('#difficulty').value in difficulties?document.querySelector('#difficulty').value:'normal');overtime=false;mode=document.querySelector('#mode').value==='local'?'local':'ai';document.querySelector('#opponent-label').textContent=tournament?rounds[roundIndex].name:mode==='local'?'SPIELER 2':'KI';document.querySelector('#tournament-progress').hidden=!tournament;document.querySelector('#tournament-progress').textContent=tournament?rounds.map((r,i)=>`${i<roundIndex?'✓ ':i===roundIndex?'▶ ':''}${r.label} · ${r.name}`).join('  /  '):'';document.querySelector('#mode-label').textContent=tournament?`${rounds[roundIndex].label} · ${aiSettings().label}`:mode==='local'?'Du gegen Spieler 2':`KI · ${aiSettings().label}`;document.querySelector('#p2-controls').hidden=mode!=='local';faceDamage=[0,0];hitCooldown=[0,0];noGoalTime=[0,0];trainReady=[false,false];special=null;specialReady=[false,false];specialGranted=[false,false];scores=[0,0];time=selectedDuration();goalWait=0;resetField();state='playing';overlay.hidden=true;canvas.focus();updateUI();}
function powerState(side,kind){
 const active=!!special&&special.side===side&&(kind==='train'?special.type==='train':special.type!=='train');
 const ready=kind==='train'?trainReady[side]:specialReady[side];
 const used=kind==='eagle'&&specialGranted[side]&&!ready;
 const amount=active||ready?100:used?0:kind==='train'?Math.min(100,noGoalTime[side]/60*100):Math.min(100,Math.max(0,scores[1-side]-scores[side])/3*100);
 const key=side===0?(kind==='train'?'Z':'E'):mode==='local'?(kind==='train'?'H':'G'):'KI';
 return {amount,label:active?'AKTIV':ready?`BEREIT · ${key}`:used?'VERBRAUCHT':kind==='train'?`${Math.min(60,Math.floor(noGoalTime[side]))}/60 s`:`${Math.min(3,Math.max(0,scores[1-side]-scores[side]))}/3 Tore`,ready};
}
function updatePowerHUD(){
 for(let side=0;side<2;side++)for(const kind of ['eagle','train']){
  const value=powerState(side,kind),button=document.querySelector(`#power-${side}-${kind}`);
  document.querySelector(`#power-bar-${side}-${kind}`).value=value.amount;
  document.querySelector(`#power-label-${side}-${kind}`).textContent=value.label;
  button.className='power-cell'+(value.ready?' charged':'');
  button.disabled=!value.ready||state!=='playing'||!!special||goalWait>0||(side===1&&mode!=='local');
 }
}
for(let side=0;side<2;side++)for(const kind of ['eagle','train'])document.querySelector(`#power-${side}-${kind}`).onclick=()=>kind==='train'?activateTrain(side):activateSpecial(side);
function updateUI(){document.querySelector('#field-state').textContent=field==='farm'?'ACKER · UNEBENER BODEN':field==='tilt'?`WIPPFELD · VORTEIL ${fieldSlope()<0?(mode==='local'?'SPIELER 2':'GEGNER'):'SPIELER 1'} · ${Math.ceil(5-fieldTime%5)} s`:'STADION · RASEN';updatePowerHUD();const trainButton=document.querySelector('#train');trainButton.disabled=state!=='playing'||!trainReady[0]||!!special||goalWait>0;trainButton.textContent='Z · Zug';document.querySelector('#score').textContent=`${scores[0]} : ${scores[1]}`;document.querySelector('#clock').textContent=`${String(Math.floor(Math.ceil(time)/60)).padStart(2,'0')}:${String(Math.ceil(time)%60).padStart(2,'0')}`;document.querySelector('#special').disabled=state!=='playing'||!specialReady[0]||!!special||goalWait>0;document.querySelector('#special').textContent='E · Adler';document.querySelector('#status').textContent=special?(special.type==='train'?'TOR-EXPRESS!':'DOPPELKOPFADLER!'):specialReady[0]&&state==='playing'?'SPEZIAL BEREIT · E DRÜCKEN':state==='playing'?(suddenDeath?'GOLDEN GOAL · NÄCHSTES TOR ENTSCHEIDET':overtime?'VERLÄNGERUNG · 30 SEKUNDEN':'MATCH LÄUFT'):state==='paused'?'MATCH PAUSIERT':state==='ended'?'ABPFIFF':'BEREIT ZUM ANPFIFF';}
function show(title,sub,label){overlay.hidden=false;document.querySelector('#menu-settings').hidden=state==='paused'||nextRound;overlay.querySelector('h2').textContent=title;overlay.querySelector('p').textContent=sub;start.innerHTML=label+' <span>↗</span>';}
function pause(){kickQueued=false;secondKickQueued=false;keys.clear();if(state==='playing'){state='paused';show('Kurze Halbzeit.','Durchatmen. Dein Match wartet.','Weiterspielen');}else if(state==='paused'){state='playing';overlay.hidden=true;canvas.focus();}updateUI();}
document.querySelector('#mode').onchange=syncMenu;syncMenu();
start.onclick=()=>state==='paused'?pause():begin(nextRound);document.querySelector('#restart').onclick=()=>{nextRound=false;tournament=false;state='ready';syncMenu();keys.clear();kickQueued=false;secondKickQueued=false;show('Neues Match.','Wähle Spielmodus und Spieldauer.','Match starten');updateUI();};document.querySelector('#pause').onclick=pause;document.querySelector('#special').onclick=()=>activateSpecial(0);document.querySelector('#train').onclick=()=>activateTrain(0);
window.addEventListener('keydown',e=>{
 if(e.target?.tagName==='SELECT')return;
 if(e.key.startsWith('Arrow')){e.preventDefault();if(state==='playing')keys.add(e.key);}
 if(mode==='local'&&['KeyA','KeyD','KeyW'].includes(e.code)){e.preventDefault();if(state==='playing')keys.add(e.code);}
 if(e.repeat||state!=='playing')return;
 if(e.code==='KeyZ'){e.preventDefault();activateTrain(0);}
 if(e.code==='KeyE'||(e.code==='KeyS'&&mode==='ai')){e.preventDefault();activateSpecial(0);}
 if(e.code==='Space'){e.preventDefault();kickQueued=true;}
 if(mode==='local'){
   if(['KeyS','KeyF'].includes(e.code)){e.preventDefault();secondKickQueued=true;}
   if(e.code==='KeyG'){e.preventDefault();activateSpecial(1);}
   if(e.code==='KeyH'){e.preventDefault();activateTrain(1);}
 }
});
window.addEventListener('keyup',e=>{keys.delete(e.key);keys.delete(e.code);});window.addEventListener('blur',()=>{keys.clear();kickQueued=false;secondKickQueued=false;if(state==='playing')pause();});
document.querySelectorAll('[data-key]').forEach(button=>{button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(button.dataset.key==='Space'){if(state==='playing')kickQueued=true;}else keys.add(button.dataset.key);};button.onpointerup=button.onpointercancel=()=>keys.delete(button.dataset.key);});
function personStep(p,dir,jump,dt){
 if(p.knocked)return;
 const standing=p.y>=groundAt(p.x)-56&&p.vy>=0;
 p.vx=dir*(p===ai&&mode==='ai'?aiSettings().speed:290);
 if(standing)p.vx*=Math.max(.65,Math.min(1.35,1+dir*groundSlope(p.x)*2));
 p.x=Math.max(65,Math.min(W-65,p.x+p.vx*dt));
 if(jump&&standing)p.vy=-570;
 if(standing&&!jump){p.y=groundAt(p.x)-48;p.vy=0;}
 else {p.vy+=1300*dt;p.y+=p.vy*dt;if(p.y>groundAt(p.x)-48){p.y=groundAt(p.x)-48;p.vy=0;}}
 if(dir)p.face=dir;
}
// A short, directional kick lifts low balls back into heading range.
function kick(p=player){
  if(special||p.knocked)return;
  if(p.cooldown>0)return;
  p.cooldown=.3;p.kickTime=.24;p.kickDirection=p.face;
  const victim=p===player?ai:player,index=p===player?1:0;
  if((victim.x-p.x)*p.face>0&&(victim.x-p.x)*p.face<=90&&Math.abs(victim.y-p.y)<65&&hitCooldown[index]<=0){
    faceDamage[index]=Math.min(3,faceDamage[index]+1);hitCooldown[index]=.65;
    kickEffects.push({x:victim.x,y:victim.y-35,time:.22});
  }
  if(p===player)kickCooldown=.3;
  const forward=(ball.x-p.x)*p.face;
  if(forward>=-12&&forward<=85&&ball.y>=p.y-22&&ball.y<=p.y+55){
    ball.vx=p.face*460+p.vx*.2;
    kickEffects.push({x:ball.x,y:ball.y,time:.22});
    ball.vy=-650;
    if(p===ai&&mode==='ai')aimAIShot();
  }
}
// Solve the flight to the goal including the horizontal air drag used below.
function aimAIShot(){
 const miss=Math.random()<aiSettings().miss;
 const targetY=(miss?(Math.random()<.65?210:435):300+(Math.random()-.5)*40)+goalHeight(20)-goalTop;
 const distance=Math.max(35,ball.x-radius),speed=610+Math.random()*70,drag=-Math.log(.998)*120;
 const flight=-Math.log(Math.max(.1,1-distance*drag/speed))/drag;
 ball.vx=-speed;ball.vy=Math.max(-840,Math.min(180,(targetY-ball.y-460*flight*flight)/flight));
}
// Full-height collision bounds include the large head and feet. A jump can
// clear an opponent, but overlapping bodies cannot swap sides or leave the field.
function resolvePlayers(){
 if(player.knocked||ai.knocked||Math.abs(player.y-ai.y)>=118)return;
 const left=player.x<=ai.x?player:ai,right=left===player?ai:player;
 const overlap=70-(right.x-left.x);
 if(overlap<=0)return;
 left.x-=overlap/2;right.x+=overlap/2;
 if(left.x<65){right.x+=65-left.x;left.x=65;}
 if(right.x>W-65){left.x-=right.x-(W-65);right.x=W-65;}
 const shared=(left.vx+right.vx)/2;
 left.vx=shared;right.vx=shared;
}
function pressBall(){
  if(pressCooldown>0)return;
  const left=player.x<=ai.x?player:ai,right=left===player?ai:player;
  const gap=right.x-left.x;
  const touching=p=>Math.hypot(ball.x-p.x,ball.y-(p.y-35))<=55||
    (Math.abs(ball.x-p.x)<=37&&ball.y>=p.y-12&&ball.y<=p.y+55);
  if(gap<110&&ball.x>=left.x&&ball.x<=right.x&&touching(left)&&touching(right)){
    ball.x=(left.x+right.x)/2;
    // Clear both heads so sequential collision resolution cannot trap the ball again.
    ball.y=Math.min(ball.y,left.y-35-55,right.y-35-55);
    ball.vy=-740;ball.vx=(left.vx+right.vx)*.15;
    pressCooldown=.35;
  }
}
function grantSpecial(){
 for(let i=0;i<2;i++)if(!specialGranted[i]&&scores[1-i]-scores[i]>=3){specialGranted[i]=true;specialReady[i]=true;}
}
function goal(side){scores[side]++;faceDamage[side]=0;hitCooldown[side]=0;noGoalTime[side]=0;trainReady[side]=false;goalWait=1.5;grantSpecial();updateUI();document.querySelector('#status').textContent='TOOOOR!';if(suddenDeath)finishMatch();}
function chargeTrain(dt){for(let i=0;i<2;i++){noGoalTime[i]=Math.min(60,noGoalTime[i]+dt);if(noGoalTime[i]>=60-1e-8)trainReady[i]=true;hitCooldown[i]=Math.max(0,hitCooldown[i]-dt);}}
function activateTrain(side){
 if(state!=='playing'||goalWait>0||special||!trainReady[side])return false;
 trainReady[side]=false;noGoalTime[side]=0;
 const attacker=side===0?player:ai,victim=side===0?ai:player;
 attacker.kickTime=.24;attacker.kickDirection=side===0?1:-1;
 const startX=side===0?Math.min(attacker.x,victim.x-150):Math.max(attacker.x,victim.x+150);
 special={type:'train',side,elapsed:0,from:{x:startX,y:floor-35},victim,victimStart:{x:victim.x,y:victim.y},impactTime:null};
 ball.x=startX;ball.y=groundAt(ball.x)-35;
 kickQueued=false;updateUI();return true;
}
function stepTrain(dt){
 const a=special,previousX=ball.x;a.elapsed+=dt;const t=a.elapsed,dir=a.side===0?1:-1;
 const u=Math.min(1,Math.max(0,(t-1)/3)),e=u*u*(3-2*u);
 ball.x=a.from.x+((a.side===0?W+150:-150)-a.from.x)*e;ball.y=groundAt(ball.x)-35;
 if(a.impactTime===null&&t>=1&&(previousX+dir*65-a.victimStart.x)*dir<=0&&(ball.x+dir*65-a.victimStart.x)*dir>=0){
   a.impactTime=t;a.victim.vy=-650;
 }
 if(a.impactTime!==null){
   const air=t-a.impactTime,height=Math.max(0,650*air-625*air*air);
   a.victim.y=height>0?a.victimStart.y-height:groundAt(a.victim.x)-48;
   a.victim.x=Math.max(65,Math.min(W-65,a.victimStart.x+dir*Math.min(air,1.04)*90));
   a.victim.tumble=height>0?dir*air*Math.PI*2:0;
 }
 if(t>=4){a.victim.y=groundAt(a.victim.x)-48;a.victim.tumble=0;a.victim.vy=0;const side=a.side;special=null;goal(side);}else updateUI();
}
function activateSpecial(side){
 if(state!=='playing'||goalWait>0||special||!specialReady[side])return false;
 specialReady[side]=false;const attacker=side===0?player:ai,victim=side===0?ai:player;
 attacker.kickTime=.24;attacker.kickDirection=side===0?1:-1;
 special={side,elapsed:0,from:{x:ball.x,y:ball.y},hit:{x:victim.x,y:victim.y-30},victim};
 kickQueued=false;updateUI();return true;
}
function stepSpecial(dt){
 const a=special;a.elapsed+=dt;const t=a.elapsed;
 if(t<1.2){const u=t/1.2;ball.x=a.from.x;ball.y=a.from.y-65*u;}
 else if(t<3.1){const u=(t-1.2)/1.9,e=u*u*(3-2*u);ball.x=a.from.x+(a.hit.x-a.from.x)*e+Math.sin(u*Math.PI*4)*55*Math.sin(u*Math.PI);ball.y=a.from.y-65+(a.hit.y-a.from.y+65)*e-Math.sin(u*Math.PI)*155;}
 else if(t<4.5){a.victim.knocked=true;const u=(t-3.1)/1.4;ball.x=a.hit.x+Math.sin(u*Math.PI*4)*42;ball.y=a.hit.y-30-Math.sin(u*Math.PI)*80;}
 else {a.victim.knocked=true;const u=Math.min(1,(t-4.5)/1.5),e=u*u;ball.x=a.hit.x+((a.side===0?W+20:-20)-a.hit.x)*e;ball.y=a.hit.y+(360-a.hit.y)*e-Math.sin(u*Math.PI)*110;}
 if(t>=6){const side=a.side;special=null;goal(side);}else updateUI();
}
function finishMatch(){
 state='ended';
 if(tournament){
  if(scores[0]>scores[1]){nextRound=roundIndex<2;show(nextRound?'Runde gewonnen!':'TURNIERSIEGER!',nextRound?`${scores[0]} : ${scores[1]} gegen ${rounds[roundIndex].name} · Weiter ins ${rounds[roundIndex+1].label}`:`${scores[0]} : ${scores[1]} · Der Headball-Pokal gehört dir!`,nextRound?'Nächste Runde':'Neues Turnier');}
  else{nextRound=false;show('Ausgeschieden.',`${scores[0]} : ${scores[1]} gegen ${rounds[roundIndex].name} · ${rounds[roundIndex].label}`,'Neu versuchen');}
 }else show(scores[0]===scores[1]?'Unentschieden.':scores[0]>scores[1]?'Dein Sieg!':mode==='local'?'Spieler 2 gewinnt!':'Die KI gewinnt.',`${scores[0]} : ${scores[1]} — Zeit für die Revanche?`,'Noch ein Match');
 updateUI();
}
function tick(dt){if(state!=='playing')return;animationTime+=dt;if(special){if(special.type==='train')stepTrain(dt);else stepSpecial(dt);return;}grantSpecial();if(goalWait>0){goalWait-=dt;if(goalWait<=0)resetField();return;}if(mode==='ai'&&specialReady[1]){activateSpecial(1);return;}if(mode==='ai'&&trainReady[1]){activateTrain(1);return;}fieldTime+=dt;chargeTrain(dt);if(!suddenDeath)time=Math.max(0,time-dt);if(time===0&&!suddenDeath){if(!overtime&&scores[0]===scores[1]){overtime=true;time=30;resetField();updateUI();return;}if(tournament&&scores[0]===scores[1]){suddenDeath=true;time=0;updateUI();return;}finishMatch();return;}
for(const p of [player,ai]){p.kickTime=Math.max(0,p.kickTime-dt);p.cooldown=Math.max(0,p.cooldown-dt);}
for(const effect of kickEffects)effect.time-=dt;kickEffects=kickEffects.filter(effect=>effect.time>0);
kickCooldown=Math.max(0,kickCooldown-dt);pressCooldown=Math.max(0,pressCooldown-dt);
personStep(player,(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),keys.has('ArrowUp'),dt);
if(mode==='ai'){
 // Approach from the right on both halves to attack the human's goal.
 const target=Math.max(65,Math.min(W-65,ball.x+53+Math.max(-100,Math.min(100,ball.vx*aiSettings().predict))));
 personStep(ai,Math.abs(target-ai.x)>12?Math.sign(target-ai.x):0,Math.abs(ball.x-ai.x)<aiSettings().jump&&ball.y>245&&ball.y<355&&ball.vy>40&&ball.x<ai.x,dt);
 if(Math.abs(ball.x-ai.x)<90)ai.face=ball.x<ai.x?-1:1;
}else personStep(ai,(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),keys.has('KeyW'),dt);
resolvePlayers();
if(mode==='ai'&&ball.x<=ai.x+12&&ai.x-ball.x<=85&&ball.y>=ai.y-22&&ball.y<=ai.y+55)kick(ai);
if(secondKickQueued){secondKickQueued=false;kick(ai);}
if(kickQueued){kickQueued=false;kick();}
const previousBall={x:ball.x,y:ball.y};
ball.vy+=920*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=Math.pow(.998,dt*120);
if(ball.y<radius){ball.y=radius;ball.vy=Math.abs(ball.vy)*.9;}if(ball.y>groundAt(ball.x)-radius){ball.y=groundAt(ball.x)-radius;const slope=groundSlope(ball.x),len=Math.hypot(slope,1),nx=slope/len,ny=-1/len,v=ball.vx*nx+ball.vy*ny;if(v<0){ball.vx-=1.87*v*nx;ball.vy-=1.87*v*ny;}ball.vx+=slope*120;if(Math.abs(ball.vy)<100)ball.vy=-170;}
pressBall();
for(const p of [player,ai]){const headY=p.y-35,dx=ball.x-p.x,dy=ball.y-headY,dist=Math.hypot(dx,dy),reach=radius+35;if(dist<reach){const nx=dist?dx/dist:p.face,ny=dist?dy/dist:-1;ball.x=p.x+nx*reach;ball.y=headY+ny*reach;const rel=(ball.vx-p.vx)*nx+(ball.vy-p.vy)*ny;if(rel<0){ball.vx-=1.85*rel*nx;ball.vy-=1.85*rel*ny;}ball.vx+=p.vx*.22;ball.vy-=p.vy<0?85:0;if(p===ai&&mode==='ai'&&dx<0)aimAIShot();}
// The torso also blocks the ball instead of letting it pass through a player.
if(Math.abs(ball.x-p.x)<32&&ball.y>p.y-5&&ball.y<groundAt(ball.x)){ball.vx=(ball.x>=p.x?1:-1)*Math.max(180,Math.abs(ball.vx));ball.x=p.x+Math.sign(ball.vx)*33;}}
ball.vx=Math.max(-780,Math.min(780,ball.vx));ball.vy=Math.max(-850,Math.min(850,ball.vy));
// Sweep the whole ball against the full crossbar, including its rounded ends.
resolveCrossbars(previousBall);
if(ball.x<radius||ball.x>W-radius){
 if(ball.y>goalHeight(ball.x<radius?20:W-20)+radius+3){if(ball.x < -radius||ball.x > W+radius)goal(ball.x<0?1:0);}
 else{ball.x=Math.max(radius,Math.min(W-radius,ball.x));ball.vx*=-.9;}
}if(goalWait<=0)updateUI();else document.querySelector('#score').textContent=`${scores[0]} : ${scores[1]}`;
}
function resolveCrossbars(previous){
 let start={...previous},end={x:ball.x,y:ball.y};const reach=radius+3;
 for(let pass=0;pass<4;pass++){
  const dx=end.x-start.x,dy=end.y-start.y;let hit=null;
  function consider(t,nx,ny){if(t>=0&&t<=1&&dx*nx+dy*ny<-.000001&&(!hit||t<hit.t))hit={t,nx,ny};}
  for(const [lo,hi] of [[0,40],[W-40,W]]){
   const barY=goalHeight((lo+hi)/2);
   const nearX=Math.max(lo,Math.min(hi,start.x)),ox=start.x-nearX,oy=start.y-barY,dist=Math.hypot(ox,oy);
   if(dist<reach-.00001){const nx=dist?ox/dist:0,ny=dist?oy/dist:(dy>0?-1:1),push=reach-dist+.001;start.x+=nx*push;start.y+=ny*push;end.x+=nx*push;end.y+=ny*push;}
   if(Math.abs(dy)>.000001)for(const sign of [-1,1]){const t=(barY+sign*reach-start.y)/dy,x=start.x+dx*t;if(x>=lo&&x<=hi)consider(t,0,sign);}
   for(const x of [lo,hi]){
    const rx=start.x-x,ry=start.y-barY,A=dx*dx+dy*dy,B=2*(rx*dx+ry*dy),C=rx*rx+ry*ry-reach*reach,D=B*B-4*A*C;
    if(A>.0000001&&D>=0){const t=(-B-Math.sqrt(D))/(2*A),nx=(start.x+dx*t-x)/reach,ny=(start.y+dy*t-barY)/reach;consider(t,nx,ny);}
   }
  }
  if(!hit)break;
  const {t,nx,ny}=hit,cx=start.x+dx*t,cy=start.y+dy*t,dot=dx*nx+dy*ny;
  const v=ball.vx*nx+ball.vy*ny;if(v<0){ball.vx-=1.9*v*nx;ball.vy-=1.9*v*ny;}
  start={x:cx+nx*.001,y:cy+ny*.001};end={x:start.x+(dx-1.9*dot*nx)*(1-t),y:start.y+(dy-1.9*dot*ny)*(1-t)};
 }
 ball.x=end.x;ball.y=end.y;
}
function roundRect(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function drawKick(p){
 if(p.kickTime<=0)return;
 const progress=1-p.kickTime/.24, swing=Math.sin(progress*Math.PI),dir=p.kickDirection;
 ctx.save();ctx.translate(p.x,p.y+17);ctx.scale(dir,1);
 ctx.strokeStyle=p.color;ctx.lineWidth=13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(18+swing*29,14-swing*22);ctx.stroke();
 roundRect(12+swing*29,6-swing*22,28,16,6,'#102d30');
 ctx.globalAlpha=swing*.8;ctx.strokeStyle='#e1f591';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,55,-.7,.65);ctx.stroke();ctx.restore();
}
function drawKickEffects(){
 for(const e of kickEffects){const t=1-e.time/.22;ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=1-t;ctx.strokeStyle='#edffac';ctx.lineWidth=3;for(let n=0;n<8;n++){const a=n*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*(15+t*16),Math.sin(a)*(15+t*16));ctx.lineTo(Math.cos(a)*(25+t*30),Math.sin(a)*(25+t*30));ctx.stroke();}ctx.restore();}
}
function drawFaceDamage(p){
 const level=faceDamage[p===player?0:1];if(!level)return;
 ctx.save();ctx.translate(p.x,p.y-35);ctx.strokeStyle='#b85b54';ctx.lineWidth=1.8;ctx.lineCap='round';
 for(let i=0;i<level;i++){const x=i%2===0?-20:15,y=i===2?14:1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+6,y+5);ctx.moveTo(x+3,y-2);ctx.lineTo(x+9,y+3);ctx.stroke();}
 if(level>=2){ctx.fillStyle='#ad343d';ctx.beginPath();ctx.ellipse(5,13,3,1.5,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ad343d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(7,14);ctx.lineTo(8,level===3?23:18);ctx.stroke();}ctx.restore();
}
function drawTrain(){
 const a=special,t=a.elapsed,dir=a.side===0?1:-1;
 ctx.save();ctx.fillStyle='#09142177';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#d6ba7a66';ctx.lineWidth=3;for(const offset of [-2,4])fieldLine(offset);
 for(let x=0;x<W;x+=28){ctx.beginPath();ctx.moveTo(x,groundAt(x)-5);ctx.lineTo(x+10,groundAt(x+10)+7);ctx.stroke();}
 ctx.translate(ball.x,ball.y);ctx.scale(dir,1);
 for(let i=0;i<7;i++){ctx.globalAlpha=(1-i/7)*.35;ctx.fillStyle='#eee7cf';ctx.beginPath();ctx.arc(20-i*23, -54-i*6+Math.sin(t*5+i)*5,10+i*3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 roundRect(-115,-15,49,38,5,'#ce9b45');roundRect(-61,-15,49,38,5,'#ce9b45');
 roundRect(-10,-24,70,45,9,'#e1a747');roundRect(-16,-50,35,40,4,'#304c4f');roundRect(-20,-55,43,8,3,'#f9d884');roundRect(39,-55,12,32,2,'#344e50');
 ctx.fillStyle='#bde3df';ctx.fillRect(-8,-43,18,16);ctx.fillStyle='#fff3b5';ctx.beginPath();ctx.arc(60,-5,7,0,Math.PI*2);ctx.fill();
 for(const x of [-102,-78,-48,-24,5,34]){ctx.fillStyle='#203b42';ctx.beginPath();ctx.arc(x,24,11,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ead39b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,24);ctx.lineTo(x+Math.cos(t*16)*8,24+Math.sin(t*16)*8);ctx.stroke();}
 ctx.restore();ctx.save();ctx.textAlign='center';ctx.fillStyle='#ffe29a';ctx.font='bold 24px sans-serif';ctx.fillText('TOR-EXPRESS',W/2,85);ctx.font='12px sans-serif';ctx.fillText(t<1?'ALLE EINSTEIGEN!':'NÄCHSTER HALT: GEGNERISCHES TOR',W/2,108);ctx.restore();
}
function headMotion(p){const phase=animationTime*(Math.abs(p.vx)>10?10:2.5)+(p===ai?1.4:0);return {angle:Math.sin(phase)*(Math.abs(p.vx)>10?.055:.025),bob:Math.sin(phase*1.3)*1.5};}
function drawPerson(p){ctx.save();if(p.tumble){ctx.translate(p.x,p.y);ctx.rotate(p.tumble);ctx.translate(-p.x,-p.y);}if(p.knocked){ctx.translate(p.x,floor);ctx.rotate((p===player?-1:1)*Math.PI/2*(special?Math.min(1,Math.max(0,(special.elapsed-3.1)/.4)):1));ctx.translate(-p.x,-floor);}ctx.fillStyle='#061b173b';ctx.beginPath();ctx.ellipse(p.x,groundAt(p.x)+5,36,7,0,0,Math.PI*2);ctx.fill();roundRect(p.x-19,p.y-5,38,38,12,p.color);roundRect(p.x-23,p.y+25,20,17,6,'#102d30');roundRect(p.x+3,p.y+25,20,17,6,'#102d30');drawKick(p);const motion=headMotion(p);ctx.save();ctx.translate(p.x,p.y-3+motion.bob);ctx.rotate(motion.angle);ctx.scale(1.15,1.15);ctx.translate(-p.x,-(p.y-3));const head=p===player?portrait:aiPortrait;if((p===player||!tournament||roundIndex===2)&&head.complete&&head.naturalWidth){ctx.drawImage(head,p.x-50,p.y-79,100,84);drawFaceDamage(p);ctx.restore();ctx.restore();return;}ctx.fillStyle='#e9b28d';ctx.beginPath();ctx.arc(p.x,p.y-35,35,0,Math.PI*2);ctx.fill();ctx.fillStyle=p===ai&&tournament?(roundIndex===0?'#8c5933':'#292b37'):'#29342e';ctx.beginPath();ctx.arc(p.x,p.y-43,33,Math.PI,Math.PI*2);ctx.lineTo(p.x+27,p.y-45);ctx.quadraticCurveTo(p.x,p.y-65,p.x-32,p.y-38);ctx.fill();ctx.fillStyle='#fff5df';for(const x of [-11,13]){ctx.beginPath();ctx.ellipse(p.x+x,p.y-34,7,9,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#26362c';for(const x of [-11,13]){ctx.beginPath();ctx.arc(p.x+x+p.face*2,p.y-33,3,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='#955c43';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x+3,p.y-20,9,.2,2.6);ctx.stroke();drawFaceDamage(p);ctx.restore();ctx.restore();}
function drawEagle(){
 const t=special.elapsed,direction=special.side===0?1:-1,flap=Math.sin(t*16)*22;
 ctx.save();ctx.fillStyle='#080c19aa';ctx.fillRect(0,0,W,H);
 const aura=ctx.createRadialGradient(ball.x,ball.y,10,ball.x,ball.y,175);aura.addColorStop(0,'#ffdb6e77');aura.addColorStop(1,'#ffdb6e00');ctx.fillStyle=aura;ctx.fillRect(0,0,W,H);
 for(let i=0;i<32;i++){const angle=i*2.4+t*2,r=45+((i*19+t*85)%140);ctx.globalAlpha=1-r/200;ctx.fillStyle=i%2?'#fff4bd':'#ffae31';ctx.beginPath();ctx.arc(ball.x+Math.cos(angle)*r,ball.y+Math.sin(angle)*r,2+i%3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 ctx.strokeStyle='#ffe8a1';ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(ball.x,ball.y,70+i*24+Math.sin(t*7)*8,30+i*12,t*.9+i,0,Math.PI*2);ctx.stroke();}
 if(t>=3.1&&t<3.6){const u=(t-3.1)/.5;ctx.globalAlpha=1-u;ctx.strokeStyle='#fff4cb';ctx.lineWidth=8;ctx.beginPath();ctx.arc(special.hit.x,special.hit.y,25+u*190,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff1b433';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
 ctx.restore();
 ctx.save();ctx.translate(ball.x,ball.y);ctx.scale(direction*(1.15+Math.min(t/1.2,1)*.35),1.15+Math.min(t/1.2,1)*.35);
 ctx.shadowColor='#ffc94f';ctx.shadowBlur=25;
 ctx.fillStyle='#d59832';ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-65,-42-flap);ctx.lineTo(-50,0);ctx.lineTo(-69,12);ctx.lineTo(-22,13);ctx.lineTo(-35,37);ctx.lineTo(0,22);ctx.lineTo(35,37);ctx.lineTo(22,13);ctx.lineTo(69,12);ctx.lineTo(50,0);ctx.lineTo(65,-42-flap);ctx.lineTo(8,0);ctx.closePath();ctx.fill();
 ctx.fillStyle='#fff1b5';ctx.beginPath();ctx.ellipse(0,6,17,25,0,0,Math.PI*2);ctx.fill();
 for(const dir of [-1,1]){ctx.save();ctx.scale(dir,1);ctx.strokeStyle='#fff1b5';ctx.lineWidth=12;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(3,-4);ctx.lineTo(13,-21);ctx.lineTo(22,-23);ctx.stroke();ctx.fillStyle='#ffb632';ctx.beginPath();ctx.moveTo(24,-25);ctx.lineTo(37,-19);ctx.lineTo(24,-16);ctx.fill();ctx.fillStyle='#332812';ctx.beginPath();ctx.arc(22,-25,2.5,0,Math.PI*2);ctx.fill();ctx.restore();}
 ctx.restore();ctx.save();ctx.textAlign='center';ctx.font='bold 19px sans-serif';ctx.fillStyle='#ffdd77';ctx.fillText('DOPPELKOPFADLER',W/2,90);ctx.font='12px sans-serif';ctx.fillText(t<1.2?'DIE MACHT ERWACHT':t<3.1?'ADLERANGRIFF':t<4.5?'VOLLTREFFER!':'UNHALTBAR INS TOR',W/2,111);ctx.restore();
}
function fieldLine(offset,start=0,end=W){ctx.beginPath();for(let x=start;x<=end;x+=5){const y=groundAt(x)+offset;if(x===start)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
function drawField(){
 ctx.fillStyle='#183f31';ctx.fillRect(0,235,W,55);
 for(let i=0;i<10;i++){ctx.fillStyle=field==='farm'?(i%2?'#80603f':'#705233'):(i%2?'#527949':'#4a7143');ctx.beginPath();for(let x=i*110;x<=(i+1)*110;x+=5){const y=groundAt(x)-158;if(x===i*110)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.lineTo((i+1)*110,H);ctx.lineTo(i*110,H);ctx.closePath();ctx.fill();}
 ctx.strokeStyle=field==='farm'?'#b7956555':'#d0dfab55';ctx.lineWidth=2;fieldLine(-130,55,W-55);fieldLine(30,55,W-55);
 ctx.beginPath();ctx.moveTo(W/2,groundAt(W/2)-130);ctx.lineTo(W/2,groundAt(W/2)+30);ctx.stroke();
 ctx.beginPath();for(let n=0;n<=80;n++){const a=n*Math.PI*2/80,x=W/2+75*Math.cos(a),y=groundAt(x)-50+40*Math.sin(a);if(!n)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
 if(field==='farm'){ctx.strokeStyle='#b897623d';ctx.lineWidth=1;for(let y=-110;y<20;y+=24)fieldLine(y);}
 ctx.strokeStyle='#d8e6aa';ctx.lineWidth=3;fieldLine(3);
 if(field==='tilt'){ctx.fillStyle='#f1d78e';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText(fieldSlope()<0?'◀ GEFÄLLE NACH LINKS':'GEFÄLLE NACH RECHTS ▶',W/2,235);}
}
function draw(){ctx.clearRect(0,0,W,H);const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#244a3d');sky.addColorStop(1,'#4b6b48');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
ctx.fillStyle='#e3f2bf';for(let row=0;row<4;row++)for(let i=0;i<65;i++){ctx.globalAlpha=.09+(i%4)*.025;ctx.fillRect(i*18+(row%2)*8,150+row*18,4,4);}ctx.globalAlpha=1;
drawField();
for(const left of [true,false]){const x=left?0:W-40,top=goalHeight(x+20),bottom=groundAt(x+20);ctx.fillStyle='#dceac316';ctx.fillRect(x,top,40,bottom-top);ctx.strokeStyle='#deebd138';ctx.lineWidth=1;for(let n=0;n<5;n++){ctx.beginPath();ctx.moveTo(x+n*10,top);ctx.lineTo(x+n*10,bottom);ctx.stroke();}for(let y=top;y<bottom;y+=12){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+40,y);ctx.stroke();}ctx.strokeStyle='#e7efdc';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(left?0:W,top);ctx.lineTo(left?40:W-40,top);ctx.lineTo(left?40:W-40,bottom);ctx.stroke();}
ctx.fillStyle='#ddecbe60';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('HEADBALL  /  THE BIG HEAD LEAGUE',W/2,266);
drawPerson(player);drawPerson(ai);drawKickEffects();if(special){if(special.type==='train')drawTrain();else drawEagle();return;}ctx.fillStyle='#061b1733';ctx.beginPath();ctx.ellipse(ball.x,groundAt(ball.x)+4,Math.max(7,18-(groundAt(ball.x)-ball.y)/40),5,0,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(ball.x,ball.y);ctx.rotate(ball.x/25);ctx.fillStyle='#fbf4df';ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.fillStyle='#233c32';ctx.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.lineTo(Math.cos(a)*7,Math.sin(a)*7);}ctx.closePath();ctx.fill();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.arc(Math.cos(a)*15,Math.sin(a)*15,4,0,Math.PI*2);ctx.fill();}ctx.restore();if(goalWait>0){ctx.font='800 80px Impact,sans-serif';ctx.fillStyle='#e6fa9c';ctx.fillText('TOOOOR!',W/2,210);}}
resetField();updatePowerHUD();function frame(now){const elapsed=Math.min((now-last)/1000,.05);last=now;accumulator+=elapsed;while(accumulator>=1/120){tick(1/120);accumulator-=1/120;}draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
