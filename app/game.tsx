'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type Era = 'medieval' | 'modern';
type Team = 0 | 1;
type Role = 'TANK' | 'ASSASSIN' | 'MAGE' | 'SUPPORT' | 'MARKSMAN' | 'FIGHTER';

type Upgrade = { name: string; description: string; kind: 'power' | 'health' | 'speed' | 'haste' | 'ability' };
export type Hero = {
  id: string; name: string; title: string; role: Role; color: string; accent: string;
  hp: number; speed: number; power: number; range: number;
  abilities: [string, string, string]; abilityNotes: [string, string, string];
  upgrades: [Upgrade, Upgrade, Upgrade];
};

export const HEROES: Hero[] = [
  { id:'bastion', name:'BASTION', title:'The Living Wall', role:'TANK', color:'#d79a43', accent:'#ffe0a3', hp:980, speed:142, power:36, range:92,
    abilities:['Shield Rush','Fault Line','Citadel'], abilityNotes:['Charge through enemies','Stun in a wide arc','Become nearly unbreakable'],
    upgrades:[{name:'Iron Geometry',description:'+260 maximum health',kind:'health'},{name:'Heavy Hand',description:'+24% attack damage',kind:'power'},{name:'Rolling Fortress',description:'Faster ability recovery',kind:'haste'}]},
  { id:'volt', name:'VOLT', title:'Live Wire', role:'ASSASSIN', color:'#72e6f4', accent:'#e1fdff', hp:590, speed:224, power:64, range:120,
    abilities:['Arc Blink','Static Fan','Overcharge'], abilityNotes:['Blink and strike','Scatter electric bolts','Move and attack at light speed'],
    upgrades:[{name:'Chain Current',description:'+26% ability power',kind:'ability'},{name:'Quick Circuit',description:'+18% movement speed',kind:'speed'},{name:'Hot Wire',description:'+24% attack damage',kind:'power'}]},
  { id:'nyx', name:'NYX', title:'Starless Mind', role:'MAGE', color:'#9a78ff', accent:'#e4dcff', hp:550, speed:172, power:72, range:230,
    abilities:['Void Lance','Gravity Well','Black Star'], abilityNotes:['Piercing shadow bolt','Collapse an area','Call down a dark meteor'],
    upgrades:[{name:'Event Horizon',description:'+26% ability power',kind:'ability'},{name:'Dark Matter',description:'+210 maximum health',kind:'health'},{name:'Shorter Orbit',description:'Faster ability recovery',kind:'haste'}]},
  { id:'briar', name:'BRIAR', title:'Wildheart', role:'SUPPORT', color:'#7dde67', accent:'#ddffd7', hp:650, speed:180, power:42, range:190,
    abilities:['Seedshot','Bramble Ring','Verdant Dawn'], abilityNotes:['A living ranged attack','Hurt foes, heal friends','Massive team restoration'],
    upgrades:[{name:'Deep Roots',description:'+240 maximum health',kind:'health'},{name:'Superbloom',description:'+26% ability power',kind:'ability'},{name:'Trail Runner',description:'+18% movement speed',kind:'speed'}]},
  { id:'rook', name:'ROOK', title:'Deadeye', role:'MARKSMAN', color:'#ee6b50', accent:'#ffd4ca', hp:570, speed:188, power:68, range:270,
    abilities:['Longshot','Combat Roll','Full Salvo'], abilityNotes:['A high-impact round','Reposition instantly','Unload a storm of shots'],
    upgrades:[{name:'Hollow Point',description:'+24% attack damage',kind:'power'},{name:'Hair Trigger',description:'Faster ability recovery',kind:'haste'},{name:'Light Kit',description:'+18% movement speed',kind:'speed'}]},
  { id:'ember', name:'EMBER', title:'The Last Spark', role:'MAGE', color:'#ff743d', accent:'#ffe2b5', hp:560, speed:175, power:75, range:220,
    abilities:['Cinder Bolt','Flame Ring','Wildfire'], abilityNotes:['Explosive fireball','Ignite nearby enemies','Scorch a huge area'],
    upgrades:[{name:'White Heat',description:'+26% ability power',kind:'ability'},{name:'Kindling',description:'Faster ability recovery',kind:'haste'},{name:'Burn Bright',description:'+24% attack damage',kind:'power'}]},
  { id:'tide', name:'TIDE', title:'Breaker of Shores', role:'TANK', color:'#318dcc', accent:'#c4eeff', hp:920, speed:150, power:40, range:100,
    abilities:['Riptide','Undertow','Maelstrom'], abilityNotes:['Ride a crushing wave','Drag foes inward','Trap enemies in a whirlpool'],
    upgrades:[{name:'High Water',description:'+260 maximum health',kind:'health'},{name:'Crushing Depth',description:'+26% ability power',kind:'ability'},{name:'Fast Current',description:'+18% movement speed',kind:'speed'}]},
  { id:'kestrel', name:'KESTREL', title:'Skyknife', role:'ASSASSIN', color:'#e8d358', accent:'#fff8bf', hp:580, speed:218, power:66, range:125,
    abilities:['Vault','Blade Fan','Final Flight'], abilityNotes:['Leap over the frontline','Throw three sharp blades','Dive through every target'],
    upgrades:[{name:'Razorwind',description:'+24% attack damage',kind:'power'},{name:'Tailwind',description:'+18% movement speed',kind:'speed'},{name:'Second Wing',description:'Faster ability recovery',kind:'haste'}]},
  { id:'forge', name:'FORGE', title:'Ironhand', role:'FIGHTER', color:'#c66e3c', accent:'#ffd1aa', hp:780, speed:165, power:56, range:105,
    abilities:['Hammerfall','Molten Ring','Redline'], abilityNotes:['Leap with your hammer','Shatter the ground','Overclock every stat'],
    upgrades:[{name:'Tempered',description:'+220 maximum health',kind:'health'},{name:'Quenched Edge',description:'+24% attack damage',kind:'power'},{name:'Bellows',description:'+26% ability power',kind:'ability'}]},
  { id:'echo', name:'ECHO', title:'Resonant One', role:'SUPPORT', color:'#e878cb', accent:'#ffd9f5', hp:630, speed:184, power:45, range:205,
    abilities:['Soundbite','Pulse Field','Resonance'], abilityNotes:['A bouncing sonic shot','Heal allies in range','Empower the whole squad'],
    upgrades:[{name:'Feedback',description:'+26% ability power',kind:'ability'},{name:'Fast Tempo',description:'+18% movement speed',kind:'speed'},{name:'Endless Chorus',description:'+220 maximum health',kind:'health'}]},
];

type UnitType = 'hero'|'melee'|'ranged'|'siege'|'tower'|'core'|'projectile'|'effect';
type Unit = {
  id:string; type:UnitType; team:Team; x:number; y:number; hp:number; maxHp:number; speed:number;
  damage:number; range:number; radius:number; color:string; name:string; dead?:boolean; respawn?:number;
  attackWait?:number; vx?:number; vy?:number; life?:number; ownerType?:UnitType; targetId?:string;
  heroId?:string; abilityPower?:number; haste?:number; kills?:number; deaths?:number; slow?:number;
};
type Runtime = {
  units:Unit[]; keys:Set<string>; aim:{x:number;y:number}; teamXp:[number,number]; teamLevel:[number,number];
  kills:[number,number]; elapsed:number; wave:number; nextWave:number; last:number; running:boolean;
  cooldowns:{q:number;e:number;r:number;basic:number}; outcome:''|'VICTORY'|'DEFEAT';
};
type Hud = { hp:number; maxHp:number; xp:[number,number]; need:[number,number]; level:[number,number]; kills:[number,number]; time:number; cooldowns:{q:number;e:number;r:number}; wave:number };

const MAPS = {
  medieval:{name:'CROWNKEEP',sub:'MEDIEVAL FRONTIER',ground:'#667e42',ground2:'#7e9250',lane:'#b5a272',river:'#4c91a5',team0:'#3e8fdb',team1:'#da5947',heart:'CASTLE',tower:'GUARD TOWER',melee:'SWORDSMAN',ranged:'ARCHER',siege:'CATAPULT'},
  modern:{name:'NEON DIVIDE',sub:'MODERN WARZONE',ground:'#303b3e',ground2:'#3f4a4a',lane:'#626d6e',river:'#1d727e',team0:'#24a7dc',team1:'#f35e55',heart:'COMMAND CORE',tower:'DEFENSE GRID',melee:'RIFLEMAN',ranged:'ROCKETEER',siege:'MISSILE CARRIER'}
};

function shade(hex:string, amount:number) {
  const n=parseInt(hex.slice(1),16), r=Math.max(0,Math.min(255,(n>>16)+amount)), g=Math.max(0,Math.min(255,((n>>8)&255)+amount)), b=Math.max(0,Math.min(255,(n&255)+amount));
  return `rgb(${r},${g},${b})`;
}

function dist(a:{x:number;y:number},b:{x:number;y:number}) { return Math.hypot(a.x-b.x,a.y-b.y); }
function formatTime(s:number){ const m=Math.floor(s/60); return `${m}:${Math.floor(s%60).toString().padStart(2,'0')}`; }

export function HeroPortrait({hero, large=false}:{hero:Hero;large?:boolean}) {
  return <div className={`heroPortrait ${large?'portraitLarge':''}`} style={{'--hero':hero.color,'--accent':hero.accent} as React.CSSProperties}>
    <i className="portraitHair"/><i className="portraitHead"/><i className="portraitEye eyeOne"/><i className="portraitEye eyeTwo"/><i className="portraitBody"/><i className="portraitShoulder shoulderOne"/><i className="portraitShoulder shoulderTwo"/>
  </div>;
}

export function HeroSelect({onLaunch,onBack}:{onLaunch:(hero:Hero,era:Era)=>void;onBack:()=>void}) {
  const [selected,setSelected]=useState(HEROES[1]);
  const [era,setEra]=useState<Era>('medieval');
  return <main className="selectScreen">
    <header className="selectHeader"><button className="textButton" onClick={onBack}>‹ BACK</button><div className="brand smallBrand"><span className="brandMark">B</span><b>BLOCKBOUND</b></div><div className="queueTag"><i/> SQUAD READY · 5/5</div></header>
    <section className="selectIntro"><p className="eyebrow">QUICK MATCH · 5V5</p><h2>CHOOSE YOUR HERO</h2><p>Ten fighters. One shared team level. Your choice changes how the whole push feels.</p></section>
    <section className="selectLayout">
      <div className="heroGrid">
        {HEROES.map((hero,index)=><button key={hero.id} className={`heroCard ${selected.id===hero.id?'active':''}`} style={{'--hero':hero.color} as React.CSSProperties} onClick={()=>setSelected(hero)}>
          <span className="heroNumber">{String(index+1).padStart(2,'0')}</span><HeroPortrait hero={hero}/><span className="heroRole">{hero.role}</span><b>{hero.name}</b>
        </button>)}
      </div>
      <aside className="heroDetail" style={{'--hero':selected.color} as React.CSSProperties}>
        <div className="detailPortrait"><HeroPortrait hero={selected} large/><span className="roleFlag">{selected.role}</span></div>
        <p className="eyebrow">{selected.title}</p><h3>{selected.name}</h3>
        <div className="statRows"><Stat label="VITALITY" value={selected.hp/10}/><Stat label="POWER" value={selected.power}/><Stat label="MOBILITY" value={selected.speed/2.5}/></div>
        <div className="abilityList">{selected.abilities.map((a,i)=><div key={a}><kbd>{['Q','E','R'][i]}</kbd><span><b>{a}</b><small>{selected.abilityNotes[i]}</small></span></div>)}</div>
      </aside>
    </section>
    <footer className="selectFooter">
      <div className="eraPicker"><small>SELECT BATTLEGROUND</small><div><button className={era==='medieval'?'active':''} onClick={()=>setEra('medieval')}><i className="mapThumb medievalThumb"/><span><b>CROWNKEEP</b><small>MEDIEVAL</small></span></button><button className={era==='modern'?'active':''} onClick={()=>setEra('modern')}><i className="mapThumb modernThumb"/><span><b>NEON DIVIDE</b><small>MODERN</small></span></button></div></div>
      <button className="launchButton" onClick={()=>onLaunch(selected,era)}><span>ENTER THE ARENA</span><b>{selected.name} · {MAPS[era].name}</b><i>›</i></button>
    </footer>
  </main>;
}

function Stat({label,value}:{label:string;value:number}) { return <div><span>{label}</span><i><b style={{width:`${Math.min(100,value)}%`}}/></i></div>; }

function createUnit(partial:Partial<Unit>&Pick<Unit,'id'|'type'|'team'|'x'|'y'>):Unit {
  return {hp:100,maxHp:100,speed:0,damage:10,range:60,radius:18,color:'#fff',name:'UNIT',attackWait:0,...partial};
}

function setupGame(hero:Hero, era:Era):Runtime {
  const m=MAPS[era];
  const player=createUnit({id:'player',type:'hero',team:0,x:210,y:540,hp:hero.hp,maxHp:hero.hp,speed:hero.speed,damage:hero.power,range:hero.range,radius:25,color:hero.color,name:hero.name,heroId:hero.id,abilityPower:1,haste:1,kills:0,deaths:0});
  const units:Unit[]=[player];
  const allyHeroes=['briar','rook','forge','nyx'].map((id,i)=>{const h=HEROES.find(v=>v.id===id)!;return createUnit({id:`ally-${id}`,type:'hero',team:0,x:150-i*12,y:385+i*48,hp:h.hp,maxHp:h.hp,speed:h.speed*.88,damage:h.power*.84,range:h.range,radius:24,color:h.color,name:h.name,heroId:h.id,abilityPower:1,kills:0,deaths:0})});
  const enemyIds=['bastion','volt','echo','kestrel','ember'];
  const enemyHeroes=enemyIds.map((id,i)=>{const h=HEROES.find(v=>v.id===id)!;return createUnit({id:`enemy-${id}`,type:'hero',team:1,x:1450+i*12,y:350+i*48,hp:h.hp,maxHp:h.hp,speed:h.speed*.86,damage:h.power*.82,range:h.range,radius:24,color:h.color,name:h.name,heroId:h.id,abilityPower:1,kills:0,deaths:0})});
  units.push(...allyHeroes,...enemyHeroes);
  units.push(createUnit({id:'core-0',type:'core',team:0,x:90,y:450,hp:2200,maxHp:2200,radius:62,color:m.team0,name:m.heart,damage:70,range:180}));
  units.push(createUnit({id:'core-1',type:'core',team:1,x:1510,y:450,hp:2200,maxHp:2200,radius:62,color:m.team1,name:m.heart,damage:70,range:180}));
  [340,590].forEach((x,i)=>units.push(createUnit({id:`tower-0-${i}`,type:'tower',team:0,x,y:450,hp:620,maxHp:620,radius:32,color:m.team0,name:m.tower,damage:56,range:205})));
  [1010,1260].forEach((x,i)=>units.push(createUnit({id:`tower-1-${i}`,type:'tower',team:1,x,y:450,hp:620,maxHp:620,radius:32,color:m.team1,name:m.tower,damage:56,range:205})));
  return {units,keys:new Set(),aim:{x:600,y:450},teamXp:[0,0],teamLevel:[1,1],kills:[0,0],elapsed:0,wave:0,nextWave:.7,last:performance.now(),running:true,cooldowns:{q:0,e:0,r:0,basic:0},outcome:''};
}

function drawBox(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,d:number,color:string){
  c.fillStyle=shade(color,-42);c.beginPath();c.moveTo(x+w/2,y+h/2);c.lineTo(x+w/2+d,y+h/2-d);c.lineTo(x+w/2+d,y-h/2-d);c.lineTo(x+w/2,y-h/2);c.closePath();c.fill();
  c.fillStyle=shade(color,-22);c.beginPath();c.moveTo(x-w/2,y+h/2);c.lineTo(x-w/2+d,y+h/2-d);c.lineTo(x+w/2+d,y+h/2-d);c.lineTo(x+w/2,y+h/2);c.closePath();c.fill();
  c.fillStyle=color;c.fillRect(x-w/2,y-h/2,w,h);
  c.strokeStyle='#10181066';c.lineWidth=2;c.strokeRect(x-w/2,y-h/2,w,h);
}

function drawHealth(c:CanvasRenderingContext2D,u:Unit,x:number,y:number){
  const w=u.type==='core'?92:u.type==='tower'?66:u.type==='hero'?52:36;
  c.fillStyle='#111713';c.fillRect(x-w/2,y,w,7);c.fillStyle=u.team===0?'#52b8ff':'#ff6658';c.fillRect(x-w/2+1,y+1,(w-2)*Math.max(0,u.hp/u.maxHp),5);
}

function drawUnit(c:CanvasRenderingContext2D,u:Unit,sx:number,sy:number,era:Era,elapsed:number){
  const x=u.x*sx,y=u.y*sy;
  if(u.type==='projectile'){c.fillStyle=u.color;c.shadowColor=u.color;c.shadowBlur=12;c.fillRect(x-5,y-5,10,10);c.shadowBlur=0;return;}
  if(u.type==='effect'){c.globalAlpha=Math.max(0,(u.life||0)/.65);c.strokeStyle=u.color;c.lineWidth=7;c.beginPath();c.ellipse(x,y,u.radius*sx,u.radius*sy*.6,0,0,Math.PI*2);c.stroke();c.globalAlpha=1;return;}
  c.save();
  c.globalAlpha=u.dead?.45:1;
  c.fillStyle='#14201638';c.beginPath();c.ellipse(x+9,y+12,u.radius*sx*1.15,u.radius*sy*.55,0,0,Math.PI*2);c.fill();
  if(u.type==='core'){
    if(era==='medieval'){
      drawBox(c,x,y-24,106,78,12,u.color);[-38,0,38].forEach(dx=>{drawBox(c,x+dx,y-76,28,45,8,u.color)});c.fillStyle='#f5df87';c.font='bold 27px sans-serif';c.textAlign='center';c.fillText('♥',x,y-15);
    } else { drawBox(c,x,y-20,112,68,12,u.color);drawBox(c,x,y-72,42,48,9,shade(u.color,22));c.fillStyle='#d3ff56';c.fillRect(x-5,y-100,10,38);c.shadowColor='#d3ff56';c.shadowBlur=18;c.fillRect(x-4,y-104,8,8);c.shadowBlur=0; }
    drawHealth(c,u,x,y-122);
  } else if(u.type==='tower'){
    drawBox(c,x,y-12,54,74,10,u.color);drawBox(c,x,y-59,70,25,10,shade(u.color,12));
    if(era==='modern'){c.fillStyle='#b9f6ff';c.fillRect(x-19,y-69,38,5);}
    drawHealth(c,u,x,y-89);
  } else if(u.type==='siege'){
    drawBox(c,x,y,68,32,8,u.color);c.fillStyle='#1d241f';c.fillRect(x-30,y+13,14,17);c.fillRect(x+18,y+13,14,17);
    c.save();c.translate(x,y-23);c.rotate(u.team===0?.12:-.12);c.fillStyle=era==='medieval'?'#5e3b24':'#30383c';c.fillRect(-5,-8,55,14);c.restore();drawHealth(c,u,x,y-43);
  } else if(u.type==='hero'){
    const bob=Math.sin(elapsed*5+u.x)*1.5;drawBox(c,x,y-13+bob,34,42,7,u.color);drawBox(c,x,y-48+bob,29,27,6,shade(u.color,28));
    c.fillStyle=u.team===0?'#bce9ff':'#ffd0c9';c.fillRect(x-8,y-53+bob,5,5);c.fillRect(x+5,y-53+bob,5,5);c.fillStyle='#151b17';c.fillRect(x-18,y-72+bob,36,9);
    drawHealth(c,u,x,y-86);c.fillStyle='#101610d9';c.fillRect(x-25,y-104,50,12);c.fillStyle='#fff';c.font='700 8px monospace';c.textAlign='center';c.fillText(u.id==='player'?'YOU':u.name,x,y-95);
    if(u.id==='player'){c.strokeStyle='#d3ff56';c.lineWidth=3;c.beginPath();c.ellipse(x,y+11,27,13,0,0,Math.PI*2);c.stroke();}
  } else {
    const body=u.type==='ranged'?22:26;drawBox(c,x,y-4,body,30,5,u.color);drawBox(c,x,y-28,20,17,4,shade(u.color,26));
    if(u.type==='ranged'){c.fillStyle='#2a302b';c.fillRect(x+(u.team===0?7:-24),y-17,27,7);}else{c.fillStyle=era==='medieval'?'#e8e2c4':'#2a302b';c.fillRect(x+(u.team===0?11:-29),y-21,22,5);}
    drawHealth(c,u,x,y-49);
  }
  c.restore();
}

function spawnProjectile(g:Runtime,source:Unit,tx:number,ty:number,damage=source.damage,color=source.color,speed=480){
  const d=Math.max(1,Math.hypot(tx-source.x,ty-source.y));
  g.units.push(createUnit({id:`p-${Math.random()}`,type:'projectile',team:source.team,x:source.x,y:source.y-8,hp:1,maxHp:1,speed,damage,range:0,radius:8,color,name:'SHOT',vx:(tx-source.x)/d*speed,vy:(ty-source.y)/d*speed,life:1.3,ownerType:source.type}));
}

function BattleCanvas({hero,era,onUpgrade,onOutcome,onHud}:{hero:Hero;era:Era;onUpgrade:()=>void;onOutcome:(o:'VICTORY'|'DEFEAT')=>void;onHud:(h:Hud)=>void}) {
  const canvasRef=useRef<HTMLCanvasElement>(null); const gameRef=useRef<Runtime|null>(null); const heroRef=useRef(hero); const eraRef=useRef(era);
  const levelTeam=useCallback((g:Runtime,team:Team)=>{
    const need=g.teamLevel[team]*220;
    if(g.teamXp[team]<need||g.teamLevel[team]>=10)return;
    g.teamXp[team]-=need;g.teamLevel[team]++;
    g.units.filter(u=>u.type==='hero'&&u.team===team).forEach(u=>{u.maxHp*=1.09;u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.18);u.damage*=1.055;});
    if(team===0)onUpgrade();
  },[onUpgrade]);

  useEffect(()=>{
    const canvas=canvasRef.current!; const ctx=canvas.getContext('2d')!; const g=setupGame(heroRef.current,eraRef.current);gameRef.current=g;
    const keys=g.keys; const prevent=[' ','arrowup','arrowdown','arrowleft','arrowright','q','e','r'];
    const kd=(ev:KeyboardEvent)=>{const k=ev.key.toLowerCase();keys.add(k);if(prevent.includes(k))ev.preventDefault();if(!ev.repeat&&['q','e','r'].includes(k))cast(k as 'q'|'e'|'r');};
    const ku=(ev:KeyboardEvent)=>keys.delete(ev.key.toLowerCase());
    const point=(ev:MouseEvent)=>{const b=canvas.getBoundingClientRect();g.aim.x=(ev.clientX-b.left)/b.width*1600;g.aim.y=(ev.clientY-b.top)/b.height*900;};
    const shoot=(ev:MouseEvent)=>{point(ev);const p=g.units.find(u=>u.id==='player');if(p&&!p.dead&&g.cooldowns.basic<=0){spawnProjectile(g,p,g.aim.x,g.aim.y,p.damage,p.color,620);g.cooldowns.basic=.34;}};
    const cast=(key:'q'|'e'|'r')=>{
      const p=g.units.find(u=>u.id==='player');if(!p||p.dead||g.cooldowns[key]>0||g.outcome)return;
      const h=heroRef.current, mult=p.abilityPower||1, dx=g.aim.x-p.x,dy=g.aim.y-p.y,len=Math.max(1,Math.hypot(dx,dy)),nx=dx/len,ny=dy/len;
      if(key==='q'){
        g.cooldowns.q=5/(p.haste||1);
        if(['bastion','volt','tide','kestrel','forge'].includes(h.id)){const leap=h.id==='volt'?185:130;p.x=Math.max(35,Math.min(1565,p.x+nx*leap));p.y=Math.max(90,Math.min(810,p.y+ny*leap));g.units.filter(u=>u.team===1&&!u.dead&&u.type!=='projectile'&&dist(u,p)<105).forEach(u=>hit(u,h.power*1.5*mult,0));ring(p.x,p.y,90,h.color);}else{for(let i=-1;i<=1;i++){const a=Math.atan2(dy,dx)+i*(h.id==='rook'?0:.11);spawnProjectile(g,p,p.x+Math.cos(a)*500,p.y+Math.sin(a)*500,h.power*1.7*mult,h.color,700);}}
      } else if(key==='e'){
        g.cooldowns.e=8/(p.haste||1);ring(p.x,p.y,145,h.color);g.units.filter(u=>u.type==='hero'&&u.team===0&&dist(u,p)<170).forEach(u=>{if(['briar','echo'].includes(h.id))u.hp=Math.min(u.maxHp,u.hp+150*mult);});g.units.filter(u=>u.team===1&&!u.dead&&u.type!=='projectile'&&dist(u,p)<155).forEach(u=>hit(u,h.power*1.25*mult,0));
      } else {
        g.cooldowns.r=24/(p.haste||1);ring(g.aim.x,g.aim.y,230,h.accent);g.units.filter(u=>u.team===1&&!u.dead&&u.type!=='projectile'&&Math.hypot(u.x-g.aim.x,u.y-g.aim.y)<240).forEach(u=>hit(u,h.power*3.1*mult,0));if(['briar','echo','bastion'].includes(h.id))g.units.filter(u=>u.type==='hero'&&u.team===0).forEach(u=>u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.32));
      }
    };
    const ring=(x:number,y:number,r:number,color:string)=>g.units.push(createUnit({id:`fx-${Math.random()}`,type:'effect',team:0,x,y,hp:1,maxHp:1,radius:r,color,name:'EFFECT',life:.65}));
    const hit=(u:Unit,amount:number,team:Team)=>{if(u.dead)return;u.hp-=amount;if(u.hp<=0)kill(u,team);};
    const kill=(u:Unit,killer:Team)=>{
      if(u.dead)return;u.dead=true;u.hp=0;const xp=u.type==='hero'?90:u.type==='siege'?35:u.type==='tower'?120:u.type==='core'?0:18;g.teamXp[killer]+=xp;if(u.type==='hero'){g.kills[killer]++;u.deaths=(u.deaths||0)+1;u.respawn=5;}else if(u.type==='core'){g.outcome=killer===0?'VICTORY':'DEFEAT';g.running=false;onOutcome(g.outcome);}
    };
    const spawnWave=(team:Team)=>{const dir=team===0?1:-1,start=team===0?135:1465;const siege=g.wave%3===0;const types:UnitType[]=['melee','melee','melee','ranged','ranged',...(siege?['siege' as UnitType]:[])];types.forEach((type,i)=>{const base=type==='siege'?260:type==='melee'?125:92;g.units.push(createUnit({id:`m-${team}-${g.wave}-${i}`,type,team,x:start-dir*i*18,y:430+(i%2)*38,hp:base,maxHp:base,speed:type==='siege'?42:58,damage:type==='siege'?46:type==='melee'?22:28,range:type==='siege'?175:type==='melee'?42:145,radius:type==='siege'?28:15,color:team===0?MAPS[eraRef.current].team0:MAPS[eraRef.current].team1,name:type==='melee'?MAPS[eraRef.current].melee:type==='ranged'?MAPS[eraRef.current].ranged:MAPS[eraRef.current].siege}));});};
    const nearest=(u:Unit,max=Infinity)=>{let best:Unit|undefined,bd=max;for(const v of g.units){if(v.team===u.team||v.dead||['projectile','effect'].includes(v.type))continue;const d=dist(u,v);if(d<bd){bd=d;best=v;}}return best;};
    const update=(dt:number)=>{
      g.elapsed+=dt;Object.keys(g.cooldowns).forEach(k=>g.cooldowns[k as keyof typeof g.cooldowns]=Math.max(0,g.cooldowns[k as keyof typeof g.cooldowns]-dt));
      if(g.elapsed>=g.nextWave){g.wave++;spawnWave(0);spawnWave(1);g.nextWave=g.elapsed+8.5;}
      const player=g.units.find(u=>u.id==='player')!;
      if(!player.dead){let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);const l=Math.hypot(dx,dy)||1;player.x=Math.max(35,Math.min(1565,player.x+dx/l*player.speed*dt));player.y=Math.max(90,Math.min(810,player.y+dy/l*player.speed*dt));}
      for(const u of [...g.units]){
        if(u.dead){if(u.type==='hero'&&u.respawn!==undefined){u.respawn-=dt;if(u.respawn<=0){u.dead=false;u.hp=u.maxHp;u.x=u.team===0?170:1430;u.y=360+Math.random()*180;}}continue;}
        if(u.type==='effect'){u.life=(u.life||0)-dt;if((u.life||0)<=0)u.dead=true;continue;}
        if(u.type==='projectile'){
          u.x+=(u.vx||0)*dt;u.y+=(u.vy||0)*dt;u.life=(u.life||0)-dt;const target=g.units.find(v=>v.team!==u.team&&!v.dead&&!['projectile','effect'].includes(v.type)&&dist(v,u)<v.radius+u.radius);if(target){hit(target,u.damage,u.team);u.dead=true;}if((u.life||0)<=0||u.x<0||u.x>1600||u.y<0||u.y>900)u.dead=true;continue;
        }
        if(u.id==='player')continue;
        u.attackWait=Math.max(0,(u.attackWait||0)-dt);const target=nearest(u,u.type==='tower'||u.type==='core'?u.range:260);
        if(target){const d=dist(u,target);if(d<=u.range){if((u.attackWait||0)<=0){if(u.range>80)spawnProjectile(g,u,target.x,target.y,u.damage,u.color,u.type==='tower'?390:450);else hit(target,u.damage,u.team);u.attackWait=u.type==='hero'?.62:u.type==='tower'?1.15:u.type==='siege'?1.65:.88;}}else if(!['tower','core'].includes(u.type)){const dx=target.x-u.x,dy=target.y-u.y,l=Math.max(1,d);u.x+=dx/l*u.speed*dt;u.y+=dy/l*u.speed*dt;}}
        else if(!['tower','core'].includes(u.type)){const objective=g.units.find(v=>v.team!==u.team&&!v.dead&&(v.type==='tower'||v.type==='core'));if(objective){const dx=objective.x-u.x,dy=objective.y-u.y,l=Math.max(1,Math.hypot(dx,dy));u.x+=dx/l*u.speed*dt;u.y+=dy/l*u.speed*dt;}else u.x+=(u.team===0?1:-1)*u.speed*dt;}
      }
      g.units=g.units.filter(u=>!u.dead||u.type==='hero'||u.type==='core');levelTeam(g,0);levelTeam(g,1);
    };
    const render=()=>{
      const w=1280,h=720,sx=w/1600,sy=h/900,m=MAPS[eraRef.current];ctx.clearRect(0,0,w,h);ctx.fillStyle=m.ground;ctx.fillRect(0,0,w,h);
      for(let y=0;y<900;y+=90)for(let x=0;x<1600;x+=100){ctx.fillStyle=(x/100+y/90)%2===0?m.ground2:m.ground;ctx.globalAlpha=.28;ctx.fillRect(x*sx,y*sy,100*sx,90*sy);}ctx.globalAlpha=1;
      ctx.fillStyle=m.river;ctx.fillRect(0,60*sy,w,82*sy);ctx.fillRect(0,760*sy,w,78*sy);
      ctx.fillStyle=m.lane;ctx.fillRect(0,365*sy,w,175*sy);ctx.fillStyle=shade(m.lane,-15);ctx.fillRect(0,440*sy,w,10*sy);
      ctx.strokeStyle=eraRef.current==='modern'?'#aeeaf044':'#e9ddb52b';ctx.lineWidth=2;ctx.setLineDash(eraRef.current==='modern'?[18,15]:[5,20]);ctx.beginPath();ctx.moveTo(0,450*sy);ctx.lineTo(w,450*sy);ctx.stroke();ctx.setLineDash([]);
      // Decorative block clusters make the flat battlefield read as a chunky 3D world.
      for(let i=0;i<18;i++){const x=((i*149)%1580+10)*sx,y=(i%2===0?190+(i%3)*35:650+(i%3)*27)*sy;drawBox(ctx,x,y,22+(i%3)*7,24+(i%2)*9,5,eraRef.current==='medieval'?(i%3?'#355f37':'#58753d'):(i%3?'#263034':'#566064'));}
      [...g.units].sort((a,b)=>a.y-b.y).forEach(u=>{if(!u.dead)drawUnit(ctx,u,sx,sy,eraRef.current,g.elapsed);});
      const a=g.aim.x*sx,b=g.aim.y*sy;ctx.strokeStyle='#d3ff56aa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a-9,b);ctx.lineTo(a+9,b);ctx.moveTo(a,b-9);ctx.lineTo(a,b+9);ctx.stroke();
    };
    let hudWait=0;const frame=(now:number)=>{const dt=Math.min(.033,(now-g.last)/1000);g.last=now;if(g.running)update(dt);render();hudWait-=dt;if(hudWait<=0){hudWait=.12;const p=g.units.find(u=>u.id==='player')!;onHud({hp:p.hp,maxHp:p.maxHp,xp:[...g.teamXp] as [number,number],need:[g.teamLevel[0]*220,g.teamLevel[1]*220],level:[...g.teamLevel] as [number,number],kills:[...g.kills] as [number,number],time:g.elapsed,cooldowns:{q:g.cooldowns.q,e:g.cooldowns.e,r:g.cooldowns.r},wave:g.wave});}if(g.running||g.outcome)requestAnimationFrame(frame);};
    const applyUpgrade=(ev:Event)=>{const upgrade=(ev as CustomEvent<Upgrade>).detail,p=g.units.find(u=>u.id==='player');if(!p)return;if(upgrade.kind==='power')p.damage*=1.24;if(upgrade.kind==='health'){p.maxHp+=upgrade.description.includes('260')?260:upgrade.description.includes('240')?240:upgrade.description.includes('210')?210:220;p.hp=p.maxHp;}if(upgrade.kind==='speed')p.speed*=1.18;if(upgrade.kind==='haste')p.haste=(p.haste||1)*1.22;if(upgrade.kind==='ability')p.abilityPower=(p.abilityPower||1)*1.26;};
    window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);window.addEventListener('blockbound-upgrade',applyUpgrade);canvas.addEventListener('mousemove',point);canvas.addEventListener('mousedown',shoot);canvas.addEventListener('contextmenu',e=>e.preventDefault());requestAnimationFrame(frame);
    return()=>{g.running=false;window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);window.removeEventListener('blockbound-upgrade',applyUpgrade);canvas.removeEventListener('mousemove',point);canvas.removeEventListener('mousedown',shoot);};
  },[levelTeam,onHud,onOutcome]);
  return <canvas ref={canvasRef} width={1280} height={720} className="battleCanvas" aria-label="Playable Blockbound Arena battlefield"/>;
}

export function Battle({hero,era,onExit}:{hero:Hero;era:Era;onExit:()=>void}) {
  const [hud,setHud]=useState<Hud>({hp:hero.hp,maxHp:hero.hp,xp:[0,0],need:[220,220],level:[1,1],kills:[0,0],time:0,cooldowns:{q:0,e:0,r:0},wave:0});
  const [upgrade,setUpgrade]=useState(false);const [outcome,setOutcome]=useState<''|'VICTORY'|'DEFEAT'>('');const [tip,setTip]=useState(true);const gameKey=useMemo(()=>`${hero.id}-${era}-${Date.now()}`,[hero.id,era]);
  const applyUpgrade=(u:Upgrade)=>{window.dispatchEvent(new CustomEvent('blockbound-upgrade',{detail:u}));setUpgrade(false);};
  useEffect(()=>{const t=setTimeout(()=>setTip(false),6000);return()=>clearTimeout(t);},[]);
  return <main className="battleScreen" style={{'--hero':hero.color} as React.CSSProperties}>
    <header className="battleTop"><div className="battleBrand"><span className="brandMark">B</span><span><small>{MAPS[era].sub}</small><b>{MAPS[era].name}</b></span></div><div className="score"><span className="blueScore">{hud.kills[0]}</span><b>{formatTime(hud.time)}</b><span className="redScore">{hud.kills[1]}</span></div><div className="waveCounter">WAVE <b>{hud.wave}</b><button onClick={onExit}>LEAVE</button></div></header>
    <div className="arenaFrame">
      <BattleCanvas key={gameKey} hero={hero} era={era} onUpgrade={()=>setUpgrade(true)} onOutcome={setOutcome} onHud={setHud}/>
      <div className="teamXp teamXpBlue"><span><b>YOUR TEAM · LEVEL {hud.level[0]}</b><small>{Math.floor(hud.xp[0])} / {hud.need[0]} XP</small></span><i><b style={{width:`${hud.xp[0]/hud.need[0]*100}%`}}/></i></div>
      <div className="teamXp teamXpRed"><span><small>{Math.floor(hud.xp[1])} / {hud.need[1]} XP</small><b>ENEMY · LEVEL {hud.level[1]}</b></span><i><b style={{width:`${hud.xp[1]/hud.need[1]*100}%`}}/></i></div>
      {tip&&<div className="controlTip"><button onClick={()=>setTip(false)}>×</button><b>MOVE WITH <kbd>WASD</kbd></b><span>Aim with your mouse · Click to attack · Cast with <kbd>Q</kbd> <kbd>E</kbd> <kbd>R</kbd></span></div>}
      {upgrade&&<div className="upgradeOverlay"><div className="upgradeModal"><p className="eyebrow">TEAM LEVEL {hud.level[0]} REACHED</p><h2>CHOOSE YOUR UPGRADE</h2><p>Every ally gained base stats. Choose one bonus unique to {hero.name}.</p><div>{hero.upgrades.map((u,i)=><button key={u.name} onClick={()=>applyUpgrade(u)}><kbd>{i+1}</kbd><span><b>{u.name}</b><small>{u.description}</small></span><i>›</i></button>)}</div></div></div>}
      {outcome&&<div className="outcomeOverlay"><p>{outcome==='VICTORY'?'ENEMY HEART SHATTERED':'YOUR HEART HAS FALLEN'}</p><h2>{outcome}</h2><div><span>TEAM LEVEL <b>{hud.level[0]}</b></span><span>TAKEDOWNS <b>{hud.kills[0]}</b></span><span>TIME <b>{formatTime(hud.time)}</b></span></div><button onClick={onExit}>RETURN TO HQ</button></div>}
    </div>
    <footer className="battleHud"><div className="playerPanel"><HeroPortrait hero={hero}/><span><small>{hero.role}</small><b>{hero.name}</b><i><b style={{width:`${Math.max(0,hud.hp/hud.maxHp*100)}%`}}/></i><em>{Math.ceil(Math.max(0,hud.hp))} / {Math.ceil(hud.maxHp)}</em></span></div><div className="abilities">{hero.abilities.map((name,i)=>{const key=['q','e','r'][i] as 'q'|'e'|'r',cd=hud.cooldowns[key];return <div key={name} className={cd>0?'cooling':''}><kbd>{key.toUpperCase()}</kbd><i style={{'--cool':`${Math.min(100,cd/(i===2?24:i===1?8:5)*100)}%`} as React.CSSProperties}>{cd>0?cd.toFixed(1):['◆','✦','✹'][i]}</i><span>{name}</span></div>})}<div className="basicAbility"><kbd>CLICK</kbd><i>➤</i><span>Basic attack</span></div></div><div className="minimap"><i className="miniLane"/><i className="miniBase blueMini"/><i className="miniBase redMini"/><b className="miniPlayer"/></div></footer>
  </main>;
}
