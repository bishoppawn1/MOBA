'use client';

import { useState } from 'react';

export type Era = 'medieval' | 'modern';
type Role = 'TANK' | 'ASSASSIN' | 'MAGE' | 'SUPPORT' | 'MARKSMAN' | 'FIGHTER';

type Upgrade = { name: string; description: string; kind: 'power' | 'health' | 'speed' | 'haste' | 'ability' };
export type AbilityKey = 'q'|'w'|'e'|'r'|'t';
export type AbilityKind = 'active'|'passive'|'summon'|'stat';
export type SummonStyle = 'guardian'|'drone'|'rift'|'ward'|'turret';
export type AbilityEffect = 'bolt'|'dash'|'nova'|'blast'|'volley'|'rapid'|'novaStrong'|'blastStrong'|'surge'|'reinforce'|'summon'|'tempo'|'reflow';
export type AbilityOption = { name:string; description:string; effect:AbilityEffect; icon:string; kind:AbilityKind; summonStyle?:SummonStyle };
export type AbilityTier = { level:1|5|10|15|20; key:AbilityKey; choices:AbilityOption[] };
export const ABILITY_BAR_KEYS:AbilityKey[] = ['q','w','e','r','t'];
export const ABILITY_MILESTONES = [1,5,10,15,20] as const;

export type Hero = {
  id: string; name: string; title: string; role: Role; color: string; accent: string;
  hp: number; speed: number; power: number; range: number;
  abilities: [string, string, string]; abilityNotes: [string, string, string];
  abilityBranches: [string,string,string,string];
  upgrades: [Upgrade, Upgrade, Upgrade];
};

export const HEROES: Hero[] = [
  { id:'bastion', name:'BASTION', title:'The Living Wall', role:'TANK', color:'#d79a43', accent:'#ffe0a3', hp:980, speed:142, power:36, range:105,
    abilities:['Shield Rush','Fault Line','Citadel'], abilityNotes:['Charge through enemies','Stun in a wide arc','Become nearly unbreakable'],
    abilityBranches:['Bulwark Slam','Rampart March','Iron Dominion','Last Bastion'],
    upgrades:[{name:'Iron Geometry',description:'+260 maximum health',kind:'health'},{name:'Heavy Hand',description:'+24% attack damage',kind:'power'},{name:'Rolling Fortress',description:'Faster ability recovery',kind:'haste'}]},
  { id:'volt', name:'VOLT', title:'Live Wire', role:'ASSASSIN', color:'#72e6f4', accent:'#e1fdff', hp:590, speed:224, power:64, range:125,
    abilities:['Arc Blink','Static Fan','Overcharge'], abilityNotes:['Blink and strike','Scatter electric bolts','Move and attack at light speed'],
    abilityBranches:['Lightning Step','Chain Storm','Flashpoint','Absolute Voltage'],
    upgrades:[{name:'Chain Current',description:'+26% ability power',kind:'ability'},{name:'Quick Circuit',description:'+18% movement speed',kind:'speed'},{name:'Hot Wire',description:'+24% attack damage',kind:'power'}]},
  { id:'nyx', name:'NYX', title:'Starless Mind', role:'MAGE', color:'#9a78ff', accent:'#e4dcff', hp:550, speed:172, power:72, range:350,
    abilities:['Void Lance','Gravity Well','Black Star'], abilityNotes:['Piercing shadow bolt','Collapse an area','Call down a dark meteor'],
    abilityBranches:['Phase Rift','Umbral Cascade','Event Horizon','Endless Night'],
    upgrades:[{name:'Event Horizon',description:'+26% ability power',kind:'ability'},{name:'Dark Matter',description:'+210 maximum health',kind:'health'},{name:'Shorter Orbit',description:'Faster ability recovery',kind:'haste'}]},
  { id:'briar', name:'BRIAR', title:'Wildheart', role:'SUPPORT', color:'#7dde67', accent:'#ddffd7', hp:650, speed:180, power:42, range:285,
    abilities:['Seedshot','Bramble Ring','Verdant Dawn'], abilityNotes:['A living ranged attack','Hurt foes, heal friends','Massive team restoration'],
    abilityBranches:['Vinewalk','Thornwake','Ancient Grove','Worldroot'],
    upgrades:[{name:'Deep Roots',description:'+240 maximum health',kind:'health'},{name:'Superbloom',description:'+26% ability power',kind:'ability'},{name:'Trail Runner',description:'+18% movement speed',kind:'speed'}]},
  { id:'rook', name:'ROOK', title:'Deadeye', role:'MARKSMAN', color:'#ee6b50', accent:'#ffd4ca', hp:570, speed:188, power:68, range:420,
    abilities:['Longshot','Combat Roll','Full Salvo'], abilityNotes:['A high-impact round','Reposition instantly','Unload a storm of shots'],
    abilityBranches:['Quickdraw','Ricochet','Kill Zone','Deadeye Protocol'],
    upgrades:[{name:'Hollow Point',description:'+24% attack damage',kind:'power'},{name:'Hair Trigger',description:'Faster ability recovery',kind:'haste'},{name:'Light Kit',description:'+18% movement speed',kind:'speed'}]},
  { id:'ember', name:'EMBER', title:'The Last Spark', role:'MAGE', color:'#ff743d', accent:'#ffe2b5', hp:560, speed:175, power:75, range:340,
    abilities:['Cinder Bolt','Flame Ring','Wildfire'], abilityNotes:['Explosive fireball','Ignite nearby enemies','Scorch a huge area'],
    abilityBranches:['Ash Step','Meteor Brand','Firestorm','Phoenix Dawn'],
    upgrades:[{name:'White Heat',description:'+26% ability power',kind:'ability'},{name:'Kindling',description:'Faster ability recovery',kind:'haste'},{name:'Burn Bright',description:'+24% attack damage',kind:'power'}]},
  { id:'tide', name:'TIDE', title:'Breaker of Shores', role:'TANK', color:'#318dcc', accent:'#c4eeff', hp:920, speed:150, power:40, range:100,
    abilities:['Riptide','Undertow','Maelstrom'], abilityNotes:['Ride a crushing wave','Drag foes inward','Trap enemies in a whirlpool'],
    abilityBranches:['Breakwater','Tidal Surge','Drowning Field','Leviathan'],
    upgrades:[{name:'High Water',description:'+260 maximum health',kind:'health'},{name:'Crushing Depth',description:'+26% ability power',kind:'ability'},{name:'Fast Current',description:'+18% movement speed',kind:'speed'}]},
  { id:'kestrel', name:'KESTREL', title:'Skyknife', role:'ASSASSIN', color:'#e8d358', accent:'#fff8bf', hp:580, speed:218, power:66, range:115,
    abilities:['Vault','Blade Fan','Final Flight'], abilityNotes:['Leap over the frontline','Throw three sharp blades','Dive through every target'],
    abilityBranches:['Windstep','Razor Cyclone','Skyfall','Apex Predator'],
    upgrades:[{name:'Razorwind',description:'+24% attack damage',kind:'power'},{name:'Tailwind',description:'+18% movement speed',kind:'speed'},{name:'Second Wing',description:'Faster ability recovery',kind:'haste'}]},
  { id:'forge', name:'FORGE', title:'Ironhand', role:'FIGHTER', color:'#c66e3c', accent:'#ffd1aa', hp:780, speed:165, power:56, range:135,
    abilities:['Hammerfall','Molten Ring','Redline'], abilityNotes:['Leap with your hammer','Shatter the ground','Overclock every stat'],
    abilityBranches:['Anvil Charge','Furnace Blast','Iron Tempest','Worldbreaker'],
    upgrades:[{name:'Tempered',description:'+220 maximum health',kind:'health'},{name:'Quenched Edge',description:'+24% attack damage',kind:'power'},{name:'Bellows',description:'+26% ability power',kind:'ability'}]},
  { id:'echo', name:'ECHO', title:'Resonant One', role:'SUPPORT', color:'#e878cb', accent:'#ffd9f5', hp:630, speed:184, power:45, range:300,
    abilities:['Soundbite','Pulse Field','Resonance'], abilityNotes:['A bouncing sonic shot','Heal allies in range','Empower the whole squad'],
    abilityBranches:['Refrain','Sonic Boom','Chorus Field','Grand Crescendo'],
    upgrades:[{name:'Feedback',description:'+26% ability power',kind:'ability'},{name:'Fast Tempo',description:'+18% movement speed',kind:'speed'},{name:'Endless Chorus',description:'+220 maximum health',kind:'health'}]},
];

const HERO_SUMMONS:Record<string,{name:string;description:string;icon:string;style:SummonStyle}> = {
  bastion:{name:'Rampart Sentinel',description:'Call a shield construct that follows you and intercepts nearby enemies.',icon:'▰',style:'guardian'},
  volt:{name:'Arc Drones',description:'Deploy two orbiting drones that follow you and fire at nearby enemies.',icon:'⌁',style:'drone'},
  nyx:{name:'Void Anchor',description:'Place a stationary rift that repeatedly damages enemies around it.',icon:'◈',style:'rift'},
  briar:{name:'Bloom Totem',description:'Plant a stationary totem that repeatedly heals nearby allied heroes.',icon:'♣',style:'ward'},
  rook:{name:'Deadeye Turret',description:'Deploy a stationary long-range turret at the cursor.',icon:'⌖',style:'turret'},
  ember:{name:'Cinder Wisps',description:'Conjure two orbiting fire wisps that follow you and launch embers.',icon:'♨',style:'drone'},
  tide:{name:'Tidal Ward',description:'Raise a stationary ward that repeatedly restores nearby allied heroes.',icon:'♒',style:'ward'},
  kestrel:{name:'Razor Flock',description:'Release two orbiting blade drones that follow you and strike nearby enemies.',icon:'⌁',style:'drone'},
  forge:{name:'Anvil Sentry',description:'Build a stationary armored turret that fires heavy voxel rounds.',icon:'⚒',style:'turret'},
  echo:{name:'Resonance Beacon',description:'Place a stationary beacon that sends healing pulses through nearby allies.',icon:'◌',style:'ward'},
};

export function getAbilityTiers(hero:Hero):AbilityTier[] {
  const starterEffect:AbilityEffect=['bastion','volt','tide','kestrel','forge'].includes(hero.id)?'dash':'bolt';
  const summon=HERO_SUMMONS[hero.id] ?? HERO_SUMMONS.bastion;
  return [
    {level:1,key:'q',choices:[{name:hero.abilities[0],description:hero.abilityNotes[0],effect:starterEffect,icon:'◆',kind:'active'}]},
    {level:5,key:'w',choices:[
      {name:hero.abilities[1],description:hero.abilityNotes[1],effect:'nova',icon:'✦',kind:'active'},
      {name:hero.abilityBranches[0],description:'Dash toward the cursor and strike enemies at your destination.',effect:'dash',icon:'➜',kind:'active'},
      {name:'Reinforced Core',description:'Permanent: gain 8% maximum health and 4 armor.',effect:'reinforce',icon:'▣',kind:'stat'},
    ]},
    {level:10,key:'e',choices:[
      {name:hero.abilities[2],description:hero.abilityNotes[2],effect:'blast',icon:'✹',kind:'active'},
      {name:hero.abilityBranches[1],description:'Launch a wide five-shot volley toward the cursor.',effect:'volley',icon:'⋰',kind:'active'},
      {name:summon.name,description:summon.description,effect:'summon',icon:summon.icon,kind:'summon',summonStyle:summon.style},
    ]},
    {level:15,key:'r',choices:[
      {name:`${hero.abilities[0]} Barrage`,description:'Rapidly fire seven empowered shots in a tight spread.',effect:'rapid',icon:'✧',kind:'active'},
      {name:hero.abilityBranches[2],description:'Release a powerful field around you that punishes nearby enemies.',effect:'novaStrong',icon:'◉',kind:'active'},
      {name:'Predator Rhythm',description:'Passive: gain 10% attack speed and 4% movement speed.',effect:'tempo',icon:'»',kind:'passive'},
    ]},
    {level:20,key:'t',choices:[
      {name:`Ascendant ${hero.abilities[2]}`,description:'Detonate a massive high-damage area at the cursor.',effect:'blastStrong',icon:'✺',kind:'active'},
      {name:hero.abilityBranches[3],description:'Unleash your final form, damaging foes and restoring nearby allies.',effect:'surge',icon:'★',kind:'active'},
      {name:'Perfect Cycle',description:'Capstone passive: abilities recover 12% faster.',effect:'reflow',icon:'∞',kind:'passive'},
    ]},
  ];
}

const MAPS = {
  medieval:{name:'CROWNKEEP',sub:'MEDIEVAL FRONTIER',ground:'#667e42',ground2:'#7e9250',lane:'#b5a272',river:'#4c91a5',team0:'#3e8fdb',team1:'#da5947',heart:'CASTLE',tower:'GUARD TOWER',melee:'SWORDSMAN',ranged:'ARCHER',siege:'CATAPULT'},
  modern:{name:'NEON DIVIDE',sub:'MODERN WARZONE',ground:'#303b3e',ground2:'#3f4a4a',lane:'#626d6e',river:'#1d727e',team0:'#24a7dc',team1:'#f35e55',heart:'COMMAND CORE',tower:'DEFENSE GRID',melee:'RIFLEMAN',ranged:'ROCKETEER',siege:'MISSILE CARRIER'}
};

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
        <div className="statRows"><Stat label="HEALTH" value={selected.hp}/><Stat label="ATTACK" value={selected.power}/><Stat label="MOVE SPEED" value={selected.speed}/><Stat label="ATTACK RANGE" value={selected.range}/></div>
        <div className="abilityList">{getAbilityTiers(selected).map((tier)=><div key={tier.level}><kbd>{tier.key.toUpperCase()}</kbd><span><b>{tier.choices.map(choice=>choice.name).join(' / ')}</b><small>{tier.level===1?tier.choices[0].description:'Choose one ability during the match'}</small></span><em>LEVEL {tier.level}</em></div>)}</div>
      </aside>
    </section>
    <footer className="selectFooter">
      <div className="eraPicker"><small>SELECT BATTLEGROUND</small><div><button className={era==='medieval'?'active':''} onClick={()=>setEra('medieval')}><i className="mapThumb medievalThumb"/><span><b>CROWNKEEP</b><small>MEDIEVAL</small></span></button><button className={era==='modern'?'active':''} onClick={()=>setEra('modern')}><i className="mapThumb modernThumb"/><span><b>NEON DIVIDE</b><small>MODERN</small></span></button></div></div>
      <button className="launchButton" onClick={()=>onLaunch(selected,era)}><span>ENTER THE ARENA</span><b>{selected.name} · {MAPS[era].name}</b><i>›</i></button>
    </footer>
  </main>;
}

function Stat({label,value}:{label:string;value:number}) { return <div><span>{label}</span><b>{Math.round(value)}</b></div>; }
