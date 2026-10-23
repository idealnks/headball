const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
const W = 1100, H = 520, floor = 448, radius = 16;
const keys = new Set();
const portrait = new Image();
portrait.src='/player-face.png';
const aiPortrait=new Image();aiPortrait.src='/ai-face.png';
let special=null, specialReady=[false,false], specialGranted=[false,false];
let kickEffects=[];
let state = 'ready', time = 90, scores = [0, 0], goalWait = 0, last = 0, accumulator = 0;
let player, ai, ball;
let kickQueued=false, kickCooldown=0, pressCooldown=0;
const overlay = document.querySelector('#overlay'), start = document.querySelector('#start');
function resetField(){kickQueued=false;kickCooldown=0;pressCooldown=0;kickEffects=[];player={x:300,y:floor-48,vx:0,vy:0,color:'#69c5ed',face:1,kickTime:0,kickDirection:1,cooldown:0};ai={x:800,y:floor-48,vx:0,vy:0,color:'#f1a36e',face:-1,kickTime:0,kickDirection:-1,cooldown:0};ball={x:550,y:160,vx:(Math.random()-.5)*160,vy:0};}
function begin(){special=null;specialReady=[false,false];specialGranted=[false,false];scores=[0,0];time=90;goalWait=0;resetField();state='playing';overlay.hidden=true;canvas.focus();updateUI();}
function updateUI(){document.querySelector('#score').textContent=`${scores[0]} : ${scores[1]}`;document.querySelector('#clock').textContent=`${String(Math.floor(Math.ceil(time)/60)).padStart(2,'0')}:${String(Math.ceil(time)%60).padStart(2,'0')}`;document.querySelector('#special').disabled=state!=='playing'||!specialReady[0]||!!special||goalWait>0;document.querySelector('#special').textContent=specialReady[0]?'S · ADLER BEREIT':'S · Adler (bei 0:3)';document.querySelector('#status').textContent=special?'DOPPELKOPFADLER!':specialReady[0]&&state==='playing'?'SPEZIAL BEREIT · S DRÜCKEN':state==='playing'?'MATCH LÄUFT':state==='paused'?'MATCH PAUSIERT':state==='ended'?'ABPFIFF':'BEREIT ZUM ANPFIFF';}
function show(title,sub,label){overlay.hidden=false;overlay.querySelector('h2').textContent=title;overlay.querySelector('p').textContent=sub;start.innerHTML=label+' <span>↗</span>';}
function pause(){kickQueued=false;if(state==='playing'){state='paused';show('Kurze Halbzeit.','Durchatmen. Dein Match wartet.','Weiterspielen');}else if(state==='paused'){state='playing';overlay.hidden=true;canvas.focus();}updateUI();}
start.onclick=()=>state==='paused'?pause():begin();document.querySelector('#restart').onclick=begin;document.querySelector('#pause').onclick=pause;document.querySelector('#special').onclick=()=>activateSpecial(0);
window.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')){e.preventDefault();keys.add(e.key);}if(e.code==='KeyS'&&!e.repeat){e.preventDefault();activateSpecial(0);}if(e.code==='Space'){e.preventDefault();if(!e.repeat&&state==='playing')kickQueued=true;}});
window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{keys.clear();kickQueued=false;if(state==='playing')pause();});
document.querySelectorAll('[data-key]').forEach(button=>{button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(button.dataset.key==='Space'){if(state==='playing')kickQueued=true;}else keys.add(button.dataset.key);};button.onpointerup=button.onpointercancel=()=>keys.delete(button.dataset.key);});
function personStep(p,dir,jump,dt){if(p.knocked)return;p.vx=dir*290;p.x=Math.max(65,Math.min(W-65,p.x+p.vx*dt));if(jump&&p.y>=floor-48-.1)p.vy=-570;p.vy+=1300*dt;p.y+=p.vy*dt;if(p.y>floor-48){p.y=floor-48;p.vy=0;}if(dir)p.face=dir;}
// A short, directional kick lifts low balls back into heading range.
function kick(p=player){
  if(special||p.knocked)return;
  if(p.cooldown>0)return;
  p.cooldown=.3;p.kickTime=.24;p.kickDirection=p.face;
  if(p===player)kickCooldown=.3;
  const forward=(ball.x-p.x)*p.face;
  if(forward>=-12&&forward<=85&&ball.y>=p.y-22&&ball.y<=p.y+55){
    ball.vx=p.face*460+p.vx*.2;
    kickEffects.push({x:ball.x,y:ball.y,time:.22});
    ball.vy=-650;
  }
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
 for(let i=0;i<2;i++)if(!specialGranted[i]&&scores[i]===0&&scores[1-i]===3){specialGranted[i]=true;specialReady[i]=true;}
}
function goal(side){scores[side]++;goalWait=1.5;grantSpecial();updateUI();document.querySelector('#status').textContent='TOOOOR!';}
function activateSpecial(side){
 if(state!=='playing'||goalWait>0||special||!specialReady[side])return false;
 specialReady[side]=false;const attacker=side===0?player:ai,victim=side===0?ai:player;
 attacker.kickTime=.24;attacker.kickDirection=side===0?1:-1;
 special={side,elapsed:0,from:{x:ball.x,y:ball.y},hit:{x:victim.x,y:victim.y-30},victim};
 kickQueued=false;updateUI();return true;
}
function stepSpecial(dt){
 const a=special;a.elapsed+=dt;const t=a.elapsed;
 if(t<.85){const u=t/.85,e=u*u*(3-2*u);ball.x=a.from.x+(a.hit.x-a.from.x)*e;ball.y=a.from.y+(a.hit.y-a.from.y)*e-Math.sin(u*Math.PI)*100;}
 else if(t<1.4){a.victim.knocked=true;const u=(t-.85)/.55;ball.x=a.hit.x;ball.y=a.hit.y-Math.sin(u*Math.PI)*48;}
 else {a.victim.knocked=true;const u=Math.min(1,(t-1.4)/.9);ball.x=a.hit.x+((a.side===0?W+20:-20)-a.hit.x)*u;ball.y=a.hit.y+(395-a.hit.y)*u-Math.sin(u*Math.PI)*65;}
 if(t>=2.3){const side=a.side;special=null;goal(side);}
 else updateUI();
}
function tick(dt){if(state!=='playing')return;if(special){stepSpecial(dt);return;}grantSpecial();if(goalWait>0){goalWait-=dt;if(goalWait<=0)resetField();return;}if(specialReady[1]){activateSpecial(1);return;}time=Math.max(0,time-dt);if(time===0){state='ended';show(scores[0]===scores[1]?'Unentschieden.':scores[0]>scores[1]?'Dein Sieg!':'Die KI gewinnt.',`${scores[0]} : ${scores[1]} — Zeit für die Revanche?`,'Noch ein Match');updateUI();return;}
for(const p of [player,ai]){p.kickTime=Math.max(0,p.kickTime-dt);p.cooldown=Math.max(0,p.cooldown-dt);}
for(const effect of kickEffects)effect.time-=dt;kickEffects=kickEffects.filter(effect=>effect.time>0);
kickCooldown=Math.max(0,kickCooldown-dt);pressCooldown=Math.max(0,pressCooldown-dt);
personStep(player,(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),keys.has('ArrowUp'),dt);
// Approach from the right on both halves to attack the human's goal.
const target=Math.max(65,Math.min(W-65,ball.x+48+Math.max(-60,Math.min(60,ball.vx*.12))));
personStep(ai,Math.abs(target-ai.x)>12?Math.sign(target-ai.x):0,Math.abs(ball.x-ai.x)<105&&ball.y>230&&ball.y<370&&ball.vy>0,dt);
if(Math.abs(ball.x-ai.x)<90)ai.face=ball.x<ai.x?-1:1;
if(ball.x<=ai.x+12&&ai.x-ball.x<=85&&ball.y>=ai.y-22&&ball.y<=ai.y+55)kick(ai);
if(kickQueued){kickQueued=false;kick();}
ball.vy+=920*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=Math.pow(.998,dt*120);
if(ball.y<radius){ball.y=radius;ball.vy=Math.abs(ball.vy)*.9;}if(ball.y>floor-radius){ball.y=floor-radius;ball.vy=-Math.abs(ball.vy)*.87;if(Math.abs(ball.vy)<100)ball.vy=-170;}
pressBall();
for(const p of [player,ai]){const headY=p.y-35,dx=ball.x-p.x,dy=ball.y-headY,dist=Math.hypot(dx,dy),reach=radius+35;if(dist<reach){const nx=dist?dx/dist:p.face,ny=dist?dy/dist:-1;ball.x=p.x+nx*reach;ball.y=headY+ny*reach;const rel=(ball.vx-p.vx)*nx+(ball.vy-p.vy)*ny;if(rel<0){ball.vx-=1.85*rel*nx;ball.vy-=1.85*rel*ny;}ball.vx+=p.vx*.22;ball.vy-=p.vy<0?85:0;}
// The torso also blocks the ball instead of letting it pass through a player.
if(Math.abs(ball.x-p.x)<32&&ball.y>p.y-5&&ball.y<floor){ball.vx=(ball.x>=p.x?1:-1)*Math.max(180,Math.abs(ball.vx));ball.x=p.x+Math.sign(ball.vx)*33;}}
ball.vx=Math.max(-780,Math.min(780,ball.vx));ball.vy=Math.max(-850,Math.min(850,ball.vy));
// Crossbars and side walls leave only the goal mouth open.
for(const x of [40,W-40]){const dx=ball.x-x,dy=ball.y-325,d=Math.hypot(dx,dy);if(d<radius+5){const nx=dx/(d||1),ny=dy/(d||1),v=ball.vx*nx+ball.vy*ny;ball.x=x+nx*(radius+5);ball.y=325+ny*(radius+5);if(v<0){ball.vx-=1.9*v*nx;ball.vy-=1.9*v*ny;}}}
if(ball.x<radius||ball.x>W-radius){if(ball.y>325+radius){goal(ball.x<radius?1:0);}else{ball.x=Math.max(radius,Math.min(W-radius,ball.x));ball.vx*=-.9;}}if(goalWait<=0)updateUI();else document.querySelector('#score').textContent=`${scores[0]} : ${scores[1]}`;
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
function drawPerson(p){ctx.save();if(p.knocked){ctx.translate(p.x,floor);ctx.rotate((p===player?-1:1)*Math.PI/2*(special?Math.min(1,Math.max(0,(special.elapsed-.85)/.25)):1));ctx.translate(-p.x,-floor);}ctx.fillStyle='#061b173b';ctx.beginPath();ctx.ellipse(p.x,floor+5,36,7,0,0,Math.PI*2);ctx.fill();roundRect(p.x-19,p.y-5,38,38,12,p.color);roundRect(p.x-23,p.y+25,20,17,6,'#102d30');roundRect(p.x+3,p.y+25,20,17,6,'#102d30');drawKick(p);const head=p===player?portrait:aiPortrait;if(head.complete&&head.naturalWidth){ctx.drawImage(head,p.x-50,p.y-79,100,84);ctx.restore();return;}ctx.fillStyle='#e9b28d';ctx.beginPath();ctx.arc(p.x,p.y-35,35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#29342e';ctx.beginPath();ctx.arc(p.x,p.y-43,33,Math.PI,Math.PI*2);ctx.lineTo(p.x+27,p.y-45);ctx.quadraticCurveTo(p.x,p.y-65,p.x-32,p.y-38);ctx.fill();ctx.fillStyle='#fff5df';for(const x of [-11,13]){ctx.beginPath();ctx.ellipse(p.x+x,p.y-34,7,9,0,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#26362c';for(const x of [-11,13]){ctx.beginPath();ctx.arc(p.x+x+p.face*2,p.y-33,3,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='#955c43';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x+3,p.y-20,9,.2,2.6);ctx.stroke();ctx.restore();}
function drawEagle(){
 const direction=special.side===0?1:-1,flap=Math.sin(special.elapsed*22)*15;
 ctx.save();ctx.translate(ball.x,ball.y);ctx.scale(direction,1);
 ctx.shadowColor='#ffc94f';ctx.shadowBlur=25;
 ctx.fillStyle='#d59832';ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-65,-42-flap);ctx.lineTo(-50,0);ctx.lineTo(-69,12);ctx.lineTo(-22,13);ctx.lineTo(-35,37);ctx.lineTo(0,22);ctx.lineTo(35,37);ctx.lineTo(22,13);ctx.lineTo(69,12);ctx.lineTo(50,0);ctx.lineTo(65,-42-flap);ctx.lineTo(8,0);ctx.closePath();ctx.fill();
 ctx.fillStyle='#fff1b5';ctx.beginPath();ctx.ellipse(0,6,17,25,0,0,Math.PI*2);ctx.fill();
 for(const dir of [-1,1]){ctx.save();ctx.scale(dir,1);ctx.strokeStyle='#fff1b5';ctx.lineWidth=12;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(3,-4);ctx.lineTo(13,-21);ctx.lineTo(22,-23);ctx.stroke();ctx.fillStyle='#ffb632';ctx.beginPath();ctx.moveTo(24,-25);ctx.lineTo(37,-19);ctx.lineTo(24,-16);ctx.fill();ctx.fillStyle='#332812';ctx.beginPath();ctx.arc(22,-25,2.5,0,Math.PI*2);ctx.fill();ctx.restore();}
 ctx.restore();ctx.save();ctx.textAlign='center';ctx.font='bold 19px sans-serif';ctx.fillStyle='#ffdd77';ctx.fillText('DOPPELKOPFADLER',W/2,90);ctx.font='12px sans-serif';ctx.fillText('AUFHOL-SPEZIAL · UNHALTBAR',W/2,111);ctx.restore();
}
function draw(){ctx.clearRect(0,0,W,H);const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#244a3d');sky.addColorStop(1,'#4b6b48');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
ctx.fillStyle='#e3f2bf';for(let row=0;row<4;row++)for(let i=0;i<65;i++){ctx.globalAlpha=.09+(i%4)*.025;ctx.fillRect(i*18+(row%2)*8,150+row*18,4,4);}ctx.globalAlpha=1;
ctx.fillStyle='#183f31';ctx.fillRect(0,235,W,48);ctx.fillStyle='#759161';ctx.fillRect(0,283,W,5);ctx.fillStyle='#446d43';ctx.fillRect(0,288,W,H-288);for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#527949':'#4a7143';ctx.fillRect(i*110,290,110,H-290);}ctx.strokeStyle='#d0dfab40';ctx.lineWidth=2;ctx.strokeRect(55,310,W-110,175);ctx.beginPath();ctx.moveTo(W/2,310);ctx.lineTo(W/2,485);ctx.moveTo(W/2+75,397);ctx.ellipse(W/2,397,75,45,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#cde0a7';ctx.fillRect(0,floor+3,W,3);ctx.fillStyle='#314e31';ctx.fillRect(0,480,W,40);
for(const left of [true,false]){const x=left?0:W-40;ctx.fillStyle='#dceac316';ctx.fillRect(x,325,40,floor-325);ctx.strokeStyle='#deebd138';ctx.lineWidth=1;for(let n=0;n<5;n++){ctx.beginPath();ctx.moveTo(x+n*10,325);ctx.lineTo(x+n*10,floor);ctx.stroke();}for(let y=325;y<floor;y+=12){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+40,y);ctx.stroke();}ctx.strokeStyle='#e7efdc';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(left?0:W,325);ctx.lineTo(left?40:W-40,325);ctx.lineTo(left?40:W-40,floor);ctx.stroke();}
ctx.fillStyle='#ddecbe60';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('HEADBALL  /  THE BIG HEAD LEAGUE',W/2,266);
drawPerson(player);drawPerson(ai);drawKickEffects();if(special){drawEagle();return;}ctx.fillStyle='#061b1733';ctx.beginPath();ctx.ellipse(ball.x,floor+4,Math.max(7,18-(floor-ball.y)/40),5,0,0,Math.PI*2);ctx.fill();ctx.save();ctx.translate(ball.x,ball.y);ctx.rotate(ball.x/25);ctx.fillStyle='#fbf4df';ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.fillStyle='#233c32';ctx.beginPath();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.lineTo(Math.cos(a)*7,Math.sin(a)*7);}ctx.closePath();ctx.fill();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.beginPath();ctx.arc(Math.cos(a)*15,Math.sin(a)*15,4,0,Math.PI*2);ctx.fill();}ctx.restore();if(goalWait>0){ctx.font='800 80px Impact,sans-serif';ctx.fillStyle='#e6fa9c';ctx.fillText('TOOOOR!',W/2,210);}}
resetField();function frame(now){const elapsed=Math.min((now-last)/1000,.05);last=now;accumulator+=elapsed;while(accumulator>=1/120){tick(1/120);accumulator-=1/120;}draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
