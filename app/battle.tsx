'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ABILITY_BAR_KEYS, ABILITY_MILESTONES, AbilityKey, AbilityOption, Era, getAbilityTiers, HEROES, Hero, HeroPortrait } from './game';

type Team = 0 | 1;
type Lane = 0 | 1 | 2;
type UnitType = 'hero' | 'melee' | 'ranged' | 'siege' | 'tower' | 'core' | 'projectile' | 'effect';
type CommandMode = 'idle' | 'move' | 'attackMove' | 'attackTarget';
type AbilityLoadout = Array<AbilityOption|null>;

type Unit = {
  id: string;
  type: UnitType;
  team: Team;
  lane: Lane;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  range: number;
  radius: number;
  color: string;
  dead?: boolean;
  respawn?: number;
  attackWait: number;
  vx?: number;
  vy?: number;
  life?: number;
  targetId?: string;
  heroId?: string;
  abilityPower?: number;
  haste?: number;
};

type Runtime = {
  units: Unit[];
  siegeLanes: [Set<Lane>, Set<Lane>];
  aim: { x: number; y: number };
  command: { mode: CommandMode; x: number; y: number; targetId?: string; marker: number };
  attackPrimed: boolean;
  teamXp: [number, number];
  teamLevel: [number, number];
  kills: [number, number];
  elapsed: number;
  wave: number;
  nextWave: number;
  last: number;
  running: boolean;
  paused: boolean;
  cooldowns: Record<AbilityKey,number>;
  outcome: '' | 'VICTORY' | 'DEFEAT';
};

type MapUnit = { id: string; type: UnitType; team: Team; x: number; y: number };
type Hud = {
  hp: number;
  maxHp: number;
  xp: [number, number];
  need: [number, number];
  level: [number, number];
  kills: [number, number];
  time: number;
  cooldowns: Record<AbilityKey,number>;
  wave: number;
  command: CommandMode | 'primed';
  mapUnits: MapUnit[];
};

const WORLD = { width: 1600, height: 900 };
const LANE_Y: [number, number, number] = [205, 450, 695];
const LANE_NAMES = ['TOP', 'MIDDLE', 'BOTTOM'];
const ABILITY_COOLDOWNS = [5,8,12,18,28];
const xpNeeded = (level:number)=>200+level*60;

const MAPS = {
  medieval: { name: 'CROWNKEEP', sub: 'MEDIEVAL FRONTIER', ground: '#667e42', ground2: '#7e9250', lane: '#b5a272', river: '#4c91a5', team0: '#3e8fdb', team1: '#da5947' },
  modern: { name: 'NEON DIVIDE', sub: 'MODERN WARZONE', ground: '#303b3e', ground2: '#3f4a4a', lane: '#626d6e', river: '#1d727e', team0: '#24a7dc', team1: '#f35e55' },
};

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r},${g},${b})`;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function unit(partial: Partial<Unit> & Pick<Unit, 'id' | 'type' | 'team' | 'lane' | 'x' | 'y'>): Unit {
  return { hp: 100, maxHp: 100, speed: 0, damage: 10, range: 60, radius: 18, color: '#fff', attackWait: 0, ...partial };
}

function setupGame(hero: Hero, era: Era): Runtime {
  const map = MAPS[era];
  const units: Unit[] = [];
  units.push(unit({ id: 'player', type: 'hero', team: 0, lane: 1, x: 245, y: LANE_Y[1], hp: hero.hp, maxHp: hero.hp, speed: hero.speed, damage: hero.power, range: hero.range, radius: 25, color: hero.color, heroId: hero.id, abilityPower: 1, haste: 1 }));

  const allyIds = ['briar', 'rook', 'forge', 'nyx'];
  const allyLanes: Lane[] = [0, 1, 2, 1];
  allyIds.forEach((id, index) => {
    const h = HEROES.find((candidate) => candidate.id === id)!;
    const lane = allyLanes[index];
    units.push(unit({ id: `ally-${index}`, type: 'hero', team: 0, lane, x: 215 + (index % 2) * 42, y: LANE_Y[lane] + (index > 2 ? 34 : -22), hp: h.hp, maxHp: h.hp, speed: h.speed * .88, damage: h.power * .84, range: h.range, radius: 24, color: h.color, heroId: h.id, abilityPower: 1, haste: 1 }));
  });

  const enemyIds = ['bastion', 'volt', 'echo', 'kestrel', 'ember'];
  const enemyLanes: Lane[] = [0, 1, 2, 0, 2];
  enemyIds.forEach((id, index) => {
    const h = HEROES.find((candidate) => candidate.id === id)!;
    const lane = enemyLanes[index];
    units.push(unit({ id: `enemy-${index}`, type: 'hero', team: 1, lane, x: 1385 - (index % 2) * 42, y: LANE_Y[lane] + (index > 2 ? 28 : -24), hp: h.hp, maxHp: h.hp, speed: h.speed * .86, damage: h.power * .82, range: h.range, radius: 24, color: h.color, heroId: h.id, abilityPower: 1, haste: 1 }));
  });

  units.push(unit({ id: 'core-0', type: 'core', team: 0, lane: 1, x: 88, y: 450, hp: 2600, maxHp: 2600, radius: 68, color: map.team0, damage: 78, range: 205 }));
  units.push(unit({ id: 'core-1', type: 'core', team: 1, lane: 1, x: 1512, y: 450, hp: 2600, maxHp: 2600, radius: 68, color: map.team1, damage: 78, range: 205 }));

  LANE_Y.forEach((y, laneIndex) => {
    const lane = laneIndex as Lane;
    [390, 635].forEach((x, index) => units.push(unit({ id: `tower-0-${lane}-${index}`, type: 'tower', team: 0, lane, x, y, hp: 720, maxHp: 720, radius: 31, color: map.team0, damage: 62, range: 190 })));
    [965, 1210].forEach((x, index) => units.push(unit({ id: `tower-1-${lane}-${index}`, type: 'tower', team: 1, lane, x, y, hp: 720, maxHp: 720, radius: 31, color: map.team1, damage: 62, range: 190 })));
  });

  return {
    units,
    siegeLanes: [new Set<Lane>(), new Set<Lane>()],
    aim: { x: 500, y: LANE_Y[1] },
    command: { mode: 'idle', x: 245, y: LANE_Y[1], marker: 0 },
    attackPrimed: false,
    teamXp: [0, 0],
    teamLevel: [1, 1],
    kills: [0, 0],
    elapsed: 0,
    wave: 0,
    nextWave: .45,
    last: performance.now(),
    running: true,
    paused: false,
    cooldowns: { q: 0, w: 0, e: 0, r: 0, t: 0 },
    outcome: '',
  };
}

function drawBox(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, depth: number, color: string) {
  context.fillStyle = shade(color, -42);
  context.beginPath();
  context.moveTo(x + width / 2, y + height / 2);
  context.lineTo(x + width / 2 + depth, y + height / 2 - depth);
  context.lineTo(x + width / 2 + depth, y - height / 2 - depth);
  context.lineTo(x + width / 2, y - height / 2);
  context.closePath();
  context.fill();
  context.fillStyle = shade(color, -22);
  context.beginPath();
  context.moveTo(x - width / 2, y + height / 2);
  context.lineTo(x - width / 2 + depth, y + height / 2 - depth);
  context.lineTo(x + width / 2 + depth, y + height / 2 - depth);
  context.lineTo(x + width / 2, y + height / 2);
  context.closePath();
  context.fill();
  context.fillStyle = color;
  context.fillRect(x - width / 2, y - height / 2, width, height);
  context.strokeStyle = '#10181066';
  context.lineWidth = 2;
  context.strokeRect(x - width / 2, y - height / 2, width, height);
}

function drawHealth(context: CanvasRenderingContext2D, current: Unit, x: number, y: number) {
  const width = current.type === 'core' ? 100 : current.type === 'tower' ? 64 : current.type === 'hero' ? 48 : 32;
  context.fillStyle = '#0d120f';
  context.fillRect(x - width / 2, y, width, 6);
  context.fillStyle = current.team === 0 ? '#51b9ff' : '#ff6558';
  context.fillRect(x - width / 2 + 1, y + 1, (width - 2) * Math.max(0, current.hp / current.maxHp), 4);
}

function drawUnit(context: CanvasRenderingContext2D, current: Unit, scaleX: number, scaleY: number, era: Era, elapsed: number) {
  const x = current.x * scaleX;
  const y = current.y * scaleY;
  if (current.type === 'projectile') {
    context.fillStyle = current.color;
    context.shadowColor = current.color;
    context.shadowBlur = 12;
    context.fillRect(x - 5, y - 5, 10, 10);
    context.shadowBlur = 0;
    return;
  }
  if (current.type === 'effect') {
    context.globalAlpha = Math.max(0, (current.life || 0) / .65);
    context.strokeStyle = current.color;
    context.lineWidth = 7;
    context.beginPath();
    context.ellipse(x, y, current.radius * scaleX, current.radius * scaleY * .65, 0, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
    return;
  }

  context.save();
  context.fillStyle = '#14201640';
  context.beginPath();
  context.ellipse(x + 8, y + 12, current.radius * scaleX * 1.15, current.radius * scaleY * .55, 0, 0, Math.PI * 2);
  context.fill();

  if (current.type === 'core') {
    if (era === 'medieval') {
      drawBox(context, x, y - 24, 122, 88, 13, current.color);
      [-46, 0, 46].forEach((offset) => drawBox(context, x + offset, y - 82, 31, 50, 8, current.color));
      context.fillStyle = '#f7df85';
      context.font = 'bold 32px sans-serif';
      context.textAlign = 'center';
      context.fillText('♥', x, y - 14);
    } else {
      drawBox(context, x, y - 20, 124, 76, 13, current.color);
      drawBox(context, x, y - 77, 48, 56, 9, shade(current.color, 24));
      context.fillStyle = '#d3ff56';
      context.fillRect(x - 6, y - 116, 12, 45);
      context.shadowColor = '#d3ff56';
      context.shadowBlur = 20;
      context.fillRect(x - 7, y - 123, 14, 14);
      context.shadowBlur = 0;
    }
    drawHealth(context, current, x, y - 132);
  } else if (current.type === 'tower') {
    drawBox(context, x, y - 8, 48, 67, 9, current.color);
    drawBox(context, x, y - 50, 62, 23, 9, shade(current.color, 12));
    if (era === 'modern') {
      context.fillStyle = '#c5f7ff';
      context.fillRect(x - 17, y - 60, 34, 5);
    }
    drawHealth(context, current, x, y - 79);
  } else if (current.type === 'siege') {
    drawBox(context, x, y, 58, 29, 7, current.color);
    context.fillStyle = '#1d241f';
    context.fillRect(x - 26, y + 11, 12, 15);
    context.fillRect(x + 16, y + 11, 12, 15);
    context.save();
    context.translate(x, y - 20);
    context.rotate(current.team === 0 ? .12 : -.12);
    context.fillStyle = era === 'medieval' ? '#5e3b24' : '#30383c';
    context.fillRect(-5, -7, 48, 12);
    context.restore();
    drawHealth(context, current, x, y - 39);
  } else if (current.type === 'hero') {
    const bob = Math.sin(elapsed * 5 + current.x) * 1.3;
    drawBox(context, x, y - 12 + bob, 32, 39, 6, current.color);
    drawBox(context, x, y - 44 + bob, 27, 25, 5, shade(current.color, 28));
    context.fillStyle = current.team === 0 ? '#bce9ff' : '#ffd0c9';
    context.fillRect(x - 8, y - 49 + bob, 5, 5);
    context.fillRect(x + 4, y - 49 + bob, 5, 5);
    drawHealth(context, current, x, y - 72);
    if (current.id === 'player') {
      context.strokeStyle = '#d3ff56';
      context.lineWidth = 3;
      context.beginPath();
      context.ellipse(x, y + 11, 27, 13, 0, 0, Math.PI * 2);
      context.stroke();
    }
  } else {
    const size = current.type === 'ranged' ? 20 : 23;
    drawBox(context, x, y - 3, size, 27, 5, current.color);
    drawBox(context, x, y - 26, 18, 16, 4, shade(current.color, 26));
    if (current.type === 'ranged') {
      context.fillStyle = '#29302a';
      context.fillRect(x + (current.team === 0 ? 7 : -23), y - 16, 25, 6);
    } else {
      context.fillStyle = era === 'medieval' ? '#ece3c2' : '#29302a';
      context.fillRect(x + (current.team === 0 ? 10 : -27), y - 19, 20, 5);
    }
    drawHealth(context, current, x, y - 43);
  }
  context.restore();
}

function spawnProjectile(runtime: Runtime, source: Unit, targetX: number, targetY: number, damage = source.damage, color = source.color, speed = 480) {
  const length = Math.max(1, Math.hypot(targetX - source.x, targetY - source.y));
  runtime.units.push(unit({ id: `p-${Math.random()}`, type: 'projectile', team: source.team, lane: source.lane, x: source.x, y: source.y - 8, hp: 1, maxHp: 1, speed, damage, range: 0, radius: 7, color, vx: (targetX - source.x) / length * speed, vy: (targetY - source.y) / length * speed, life: 1.5 }));
}

function BattleCanvas({ hero, era, selectedAbilities, onLevelUp, onOutcome, onHud }: { hero: Hero; era: Era; selectedAbilities: AbilityLoadout; onLevelUp: (level:number) => void; onOutcome: (outcome: 'VICTORY' | 'DEFEAT') => void; onHud: (hud: Hud) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef(hero);
  const eraRef = useRef(era);
  const selectedAbilitiesRef = useRef(selectedAbilities);
  selectedAbilitiesRef.current = selectedAbilities;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext('2d')!;
    const runtime = setupGame(heroRef.current, eraRef.current);
    const map = MAPS[eraRef.current];

    const point = (event: MouseEvent) => {
      const bounds = canvas.getBoundingClientRect();
      runtime.aim.x = (event.clientX - bounds.left) / bounds.width * WORLD.width;
      runtime.aim.y = (event.clientY - bounds.top) / bounds.height * WORLD.height;
    };

    const ring = (x: number, y: number, radius: number, color: string, team: Team = 0) => runtime.units.push(unit({ id: `fx-${Math.random()}`, type: 'effect', team, lane: 1, x, y, hp: 1, maxHp: 1, radius, color, life: .65 }));

    const kill = (target: Unit, killer: Team) => {
      if (target.dead) return;
      target.dead = true;
      target.hp = 0;
      if (target.type === 'tower') runtime.siegeLanes[killer].add(target.lane);
      const xp = target.type === 'hero' ? 90 : target.type === 'siege' ? 35 : target.type === 'tower' ? 120 : target.type === 'core' ? 0 : 18;
      runtime.teamXp[killer] += xp;
      if (target.type === 'hero') {
        runtime.kills[killer]++;
        target.respawn = 5;
      } else if (target.type === 'core') {
        runtime.outcome = killer === 0 ? 'VICTORY' : 'DEFEAT';
        runtime.running = false;
        onOutcome(runtime.outcome);
      }
    };

    const hit = (target: Unit, amount: number, team: Team) => {
      if (target.dead) return;
      target.hp -= amount;
      if (target.hp <= 0) kill(target, team);
    };

    const nearestEnemy = (source: Unit, maximum: number, laneLocked = false) => {
      let best: Unit | undefined;
      let bestDistance = maximum;
      for (const candidate of runtime.units) {
        if (candidate.team === source.team || candidate.dead || candidate.type === 'projectile' || candidate.type === 'effect') continue;
        if (laneLocked && candidate.type !== 'core' && Math.abs(candidate.y - LANE_Y[source.lane]) > 125) continue;
        const currentDistance = distance(source, candidate);
        if (currentDistance < bestDistance) {
          best = candidate;
          bestDistance = currentDistance;
        }
      }
      return best;
    };

    const enemyUnderPointer = () => {
      let best: Unit | undefined;
      let bestDistance = 44;
      for (const candidate of runtime.units) {
        if (candidate.team === 0 || candidate.dead || candidate.type === 'projectile' || candidate.type === 'effect') continue;
        const currentDistance = Math.hypot(candidate.x - runtime.aim.x, candidate.y - runtime.aim.y);
        if (currentDistance < Math.max(34, candidate.radius + 14) && currentDistance < bestDistance) {
          best = candidate;
          bestDistance = currentDistance;
        }
      }
      return best;
    };

    const issueCommand = (mode: CommandMode, targetId?: string) => {
      runtime.command = { mode, x: runtime.aim.x, y: runtime.aim.y, targetId, marker: .8 };
      runtime.attackPrimed = false;
    };

    const mouseDown = (event: MouseEvent) => {
      point(event);
      if (event.button === 2) {
        event.preventDefault();
        issueCommand('move');
        return;
      }
      if (event.button === 0 && runtime.attackPrimed) {
        const target = enemyUnderPointer();
        issueCommand(target ? 'attackTarget' : 'attackMove', target?.id);
      }
    };

    const cast = (key: AbilityKey) => {
      const player = runtime.units.find((current) => current.id === 'player');
      const abilityIndex = ABILITY_BAR_KEYS.indexOf(key);
      const ability = selectedAbilitiesRef.current[abilityIndex];
      if (!player || player.dead || !ability || runtime.cooldowns[key] > 0 || runtime.outcome) return;
      const selectedHero = heroRef.current;
      const multiplier = player.abilityPower || 1;
      const dx = runtime.aim.x - player.x;
      const dy = runtime.aim.y - player.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / length;
      const ny = dy / length;
      runtime.cooldowns[key] = ABILITY_COOLDOWNS[abilityIndex] / (player.haste || 1);
      const enemiesNear=(x:number,y:number,radius:number)=>runtime.units.filter((current)=>current.team===1&&!current.dead&&current.type!=='projectile'&&current.type!=='effect'&&Math.hypot(current.x-x,current.y-y)<radius);
      if (ability.effect === 'dash') {
        const leap = selectedHero.id === 'volt' ? 190 : 150;
        player.x = Math.max(35, Math.min(1565, player.x + nx * leap));
        player.y = Math.max(55, Math.min(845, player.y + ny * leap));
        enemiesNear(player.x,player.y,110).forEach((current)=>hit(current,selectedHero.power*1.55*multiplier,0));
        ring(player.x,player.y,95,selectedHero.color);
      } else if (ability.effect === 'bolt') {
        for(let index=-1;index<=1;index++){
          const angle=Math.atan2(dy,dx)+index*(selectedHero.id==='rook'?0:.11);
          spawnProjectile(runtime,player,player.x+Math.cos(angle)*520,player.y+Math.sin(angle)*520,selectedHero.power*1.7*multiplier,selectedHero.color,700);
        }
      } else if (ability.effect === 'nova' || ability.effect === 'novaStrong') {
        const radius=ability.effect==='novaStrong'?215:150,damage=ability.effect==='novaStrong'?2.15:1.3;
        ring(player.x,player.y,radius,selectedHero.color);
        if (['briar', 'echo'].includes(selectedHero.id)) runtime.units.filter((current) => current.type === 'hero' && current.team === 0 && distance(current, player) < 170).forEach((current) => { current.hp = Math.min(current.maxHp, current.hp + 150 * multiplier); });
        enemiesNear(player.x,player.y,radius+10).forEach((current)=>hit(current,selectedHero.power*damage*multiplier,0));
      } else if (ability.effect === 'blast' || ability.effect === 'blastStrong') {
        const radius=ability.effect==='blastStrong'?310:235,damage=ability.effect==='blastStrong'?4.25:3.1;
        ring(runtime.aim.x,runtime.aim.y,radius,selectedHero.accent);
        enemiesNear(runtime.aim.x,runtime.aim.y,radius+10).forEach((current)=>hit(current,selectedHero.power*damage*multiplier,0));
      } else if (ability.effect === 'volley' || ability.effect === 'rapid') {
        const count=ability.effect==='rapid'?7:5,step=ability.effect==='rapid'?.055:.095,damage=ability.effect==='rapid'?.92:1.18;
        for(let index=0;index<count;index++){
          const angle=Math.atan2(dy,dx)+(index-(count-1)/2)*step;
          spawnProjectile(runtime,player,player.x+Math.cos(angle)*570,player.y+Math.sin(angle)*570,selectedHero.power*damage*multiplier,selectedHero.color,760);
        }
      } else if (ability.effect === 'surge') {
        ring(player.x,player.y,285,selectedHero.accent);
        enemiesNear(player.x,player.y,295).forEach((current)=>hit(current,selectedHero.power*3.4*multiplier,0));
        runtime.units.filter((current)=>current.type==='hero'&&current.team===0).forEach((current)=>{current.hp=Math.min(current.maxHp,current.hp+current.maxHp*.25);});
      }
    };

    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['a', ...ABILITY_BAR_KEYS].includes(key)) event.preventDefault();
      if (key === 'a' && !event.repeat) runtime.attackPrimed = true;
      if (key === 'escape') runtime.attackPrimed = false;
      if (!event.repeat && ABILITY_BAR_KEYS.includes(key as AbilityKey)) cast(key as AbilityKey);
    };

    const spawnWave = (team: Team) => {
      const direction = team === 0 ? 1 : -1;
      const startX = team === 0 ? 155 : 1445;
      LANE_Y.forEach((laneY, laneIndex) => {
        const lane = laneIndex as Lane;
        const includeSiege = runtime.wave % 3 === 0 && runtime.siegeLanes[team].has(lane);
        const types: UnitType[] = ['melee', 'melee', 'melee', 'ranged', 'ranged', ...(includeSiege ? ['siege' as UnitType] : [])];
        types.forEach((type, index) => {
          const health = type === 'siege' ? 270 : type === 'melee' ? 130 : 96;
          runtime.units.push(unit({
            id: `m-${team}-${runtime.wave}-${lane}-${index}`,
            type,
            team,
            lane,
            x: startX - direction * index * 15,
            y: laneY + (index % 2 === 0 ? -18 : 18),
            hp: health,
            maxHp: health,
            speed: type === 'siege' ? 45 : 63,
            damage: type === 'siege' ? 47 : type === 'melee' ? 22 : 28,
            range: type === 'siege' ? 170 : type === 'melee' ? 40 : 140,
            radius: type === 'siege' ? 27 : 14,
            color: team === 0 ? map.team0 : map.team1,
          }));
        });
      });
    };

    const moveToward = (current: Unit, targetX: number, targetY: number, delta: number, stoppingDistance = 0) => {
      const dx = targetX - current.x;
      const dy = targetY - current.y;
      const length = Math.hypot(dx, dy);
      if (length <= stoppingDistance || length < 1) return true;
      const travel = Math.min(length - stoppingDistance, current.speed * delta);
      current.x = Math.max(28, Math.min(1572, current.x + dx / length * travel));
      current.y = Math.max(48, Math.min(852, current.y + dy / length * travel));
      return false;
    };

    const attack = (source: Unit, target: Unit, delta: number, canMove = true) => {
      source.attackWait = Math.max(0, source.attackWait - delta);
      const currentDistance = distance(source, target);
      if (currentDistance > source.range) {
        if (canMove) moveToward(source, target.x, target.y, delta, Math.max(0, source.range - 8));
        return;
      }
      if (source.attackWait > 0) return;
      if (source.range > 75) spawnProjectile(runtime, source, target.x, target.y, source.damage, source.color, source.type === 'tower' ? 390 : 520);
      else hit(target, source.damage, source.team);
      source.attackWait = source.type === 'hero' ? .62 : source.type === 'tower' ? 1.12 : source.type === 'siege' ? 1.6 : .88;
    };

    const objectiveFor = (current: Unit) => {
      const direction = current.team === 0 ? 1 : -1;
      const laneTowers = runtime.units
        .filter((candidate) => candidate.type === 'tower' && candidate.team !== current.team && candidate.lane === current.lane && !candidate.dead && (candidate.x - current.x) * direction > -20)
        .sort((a, b) => direction * (a.x - b.x));
      if (laneTowers.length) return laneTowers[0];
      return runtime.units.find((candidate) => candidate.type === 'core' && candidate.team !== current.team && !candidate.dead);
    };

    const levelTeam = (team: Team) => {
      const required = xpNeeded(runtime.teamLevel[team]);
      if (runtime.teamXp[team] < required || runtime.teamLevel[team] >= 20) return;
      runtime.teamXp[team] -= required;
      runtime.teamLevel[team]++;
      runtime.units.filter((current) => current.type === 'hero' && current.team === team).forEach((current) => {
        current.maxHp *= 1.09;
        current.hp = Math.min(current.maxHp, current.hp + current.maxHp * .18);
        current.damage *= 1.055;
      });
      if (team === 0) {
        if (ABILITY_MILESTONES.includes(runtime.teamLevel[team] as typeof ABILITY_MILESTONES[number])) runtime.paused = true;
        onLevelUp(runtime.teamLevel[team]);
      }
    };

    const updatePlayer = (player: Unit, delta: number) => {
      player.attackWait = Math.max(0, player.attackWait - delta);
      if (runtime.command.mode === 'move') {
        if (moveToward(player, runtime.command.x, runtime.command.y, delta, 5)) runtime.command.mode = 'idle';
        return;
      }
      if (runtime.command.mode === 'attackTarget') {
        const target = runtime.units.find((current) => current.id === runtime.command.targetId && !current.dead);
        if (target) attack(player, target, delta);
        else runtime.command.mode = 'idle';
        return;
      }
      if (runtime.command.mode === 'attackMove') {
        const target = nearestEnemy(player, Math.max(245, player.range + 80));
        if (target) attack(player, target, delta);
        else if (moveToward(player, runtime.command.x, runtime.command.y, delta, 5)) runtime.command.mode = 'idle';
        return;
      }
      const nearbyTarget = nearestEnemy(player, Math.max(180, player.range + 45));
      if (nearbyTarget) attack(player, nearbyTarget, delta);
    };

    const update = (delta: number) => {
      runtime.elapsed += delta;
      runtime.command.marker = Math.max(0, runtime.command.marker - delta);
      (Object.keys(runtime.cooldowns) as Array<keyof typeof runtime.cooldowns>).forEach((key) => { runtime.cooldowns[key] = Math.max(0, runtime.cooldowns[key] - delta); });
      if (runtime.elapsed >= runtime.nextWave) {
        runtime.wave++;
        spawnWave(0);
        spawnWave(1);
        runtime.nextWave = runtime.elapsed + 8;
      }

      const player = runtime.units.find((current) => current.id === 'player')!;
      if (!player.dead) updatePlayer(player, delta);

      for (const current of [...runtime.units]) {
        if (current.dead) {
          if (current.type === 'hero' && current.respawn !== undefined) {
            current.respawn -= delta;
            if (current.respawn <= 0) {
              current.dead = false;
              current.hp = current.maxHp;
              current.x = current.team === 0 ? 215 : 1385;
              current.y = LANE_Y[current.lane];
              if (current.id === 'player') runtime.command.mode = 'idle';
            }
          }
          continue;
        }
        if (current.type === 'effect') {
          current.life = (current.life || 0) - delta;
          if ((current.life || 0) <= 0) current.dead = true;
          continue;
        }
        if (current.type === 'projectile') {
          current.x += (current.vx || 0) * delta;
          current.y += (current.vy || 0) * delta;
          current.life = (current.life || 0) - delta;
          const target = runtime.units.find((candidate) => candidate.team !== current.team && !candidate.dead && candidate.type !== 'projectile' && candidate.type !== 'effect' && distance(candidate, current) < candidate.radius + current.radius);
          if (target) {
            hit(target, current.damage, current.team);
            current.dead = true;
          }
          if ((current.life || 0) <= 0 || current.x < 0 || current.x > WORLD.width || current.y < 0 || current.y > WORLD.height) current.dead = true;
          continue;
        }
        if (current.id === 'player') continue;
        if (current.type === 'tower' || current.type === 'core') {
          const target = nearestEnemy(current, current.range, current.type === 'tower');
          if (target) attack(current, target, delta, false);
          else current.attackWait = Math.max(0, current.attackWait - delta);
          continue;
        }

        current.attackWait = Math.max(0, current.attackWait - delta);
        const awareness = current.type === 'hero' ? 235 : 165;
        const target = nearestEnemy(current, awareness, true);
        if (target) attack(current, target, delta);
        else {
          const objective = objectiveFor(current);
          if (objective) {
            const laneY = LANE_Y[current.lane];
            if (Math.abs(current.y - laneY) > 22 && Math.abs(current.x - objective.x) > 110) moveToward(current, current.x, laneY, delta);
            else moveToward(current, objective.x, objective.y, delta, Math.max(0, current.range - 8));
          }
        }
      }

      runtime.units = runtime.units.filter((current) => !current.dead || current.type === 'hero' || current.type === 'core');
      levelTeam(0);
      levelTeam(1);
    };

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const scaleX = width / WORLD.width;
      const scaleY = height / WORLD.height;
      context.clearRect(0, 0, width, height);
      context.fillStyle = map.ground;
      context.fillRect(0, 0, width, height);
      for (let y = 0; y < WORLD.height; y += 90) for (let x = 0; x < WORLD.width; x += 100) {
        context.fillStyle = (x / 100 + y / 90) % 2 === 0 ? map.ground2 : map.ground;
        context.globalAlpha = .25;
        context.fillRect(x * scaleX, y * scaleY, 100 * scaleX, 90 * scaleY);
      }
      context.globalAlpha = 1;

      context.fillStyle = map.river;
      context.fillRect(760 * scaleX, 0, 80 * scaleX, height);
      context.fillStyle = eraRef.current === 'medieval' ? '#6f6a54' : '#273337';
      context.fillRect(0, 0, 175 * scaleX, height);
      context.fillRect(1425 * scaleX, 0, 175 * scaleX, height);

      LANE_Y.forEach((laneY, index) => {
        context.fillStyle = shade(map.lane, -14);
        context.fillRect(0, (laneY - 58) * scaleY, width, 116 * scaleY);
        context.fillStyle = map.lane;
        context.fillRect(0, (laneY - 50) * scaleY, width, 100 * scaleY);
        context.fillStyle = shade(map.lane, 10);
        context.fillRect(760 * scaleX, (laneY - 54) * scaleY, 80 * scaleX, 108 * scaleY);
        context.strokeStyle = eraRef.current === 'modern' ? '#d7ffff38' : '#fff3c833';
        context.lineWidth = 2;
        context.setLineDash(eraRef.current === 'modern' ? [18, 15] : [5, 18]);
        context.beginPath();
        context.moveTo(0, laneY * scaleY);
        context.lineTo(width, laneY * scaleY);
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = '#10150f55';
        context.font = '800 9px monospace';
        context.textAlign = 'center';
        context.fillText(`${LANE_NAMES[index]} LANE`, 800 * scaleX, (laneY - 66) * scaleY);
      });

      const jungleY = [78, 325, 575, 826];
      jungleY.forEach((jungleRow, row) => {
        for (let index = 0; index < 8; index++) {
          const worldX = 220 + ((index * 181 + row * 67) % 1160);
          drawBox(context, worldX * scaleX, jungleRow * scaleY, 20 + index % 3 * 6, 22 + index % 2 * 8, 5, eraRef.current === 'medieval' ? (index % 3 ? '#355f37' : '#58753d') : (index % 3 ? '#263034' : '#566064'));
        }
      });

      [...runtime.units].sort((a, b) => a.y - b.y).forEach((current) => { if (!current.dead) drawUnit(context, current, scaleX, scaleY, eraRef.current, runtime.elapsed); });

      if (runtime.command.marker > 0) {
        const x = runtime.command.x * scaleX;
        const y = runtime.command.y * scaleY;
        context.globalAlpha = Math.min(1, runtime.command.marker * 2);
        context.strokeStyle = runtime.command.mode === 'move' ? '#d3ff56' : '#ff695c';
        context.lineWidth = 4;
        context.beginPath();
        context.ellipse(x, y, 18, 10, 0, 0, Math.PI * 2);
        context.stroke();
        if (runtime.command.mode !== 'move') {
          context.beginPath();
          context.moveTo(x - 12, y - 12);
          context.lineTo(x + 12, y + 12);
          context.moveTo(x + 12, y - 12);
          context.lineTo(x - 12, y + 12);
          context.stroke();
        }
        context.globalAlpha = 1;
      }

      if (runtime.attackPrimed) {
        const x = runtime.aim.x * scaleX;
        const y = runtime.aim.y * scaleY;
        context.strokeStyle = '#ff695c';
        context.lineWidth = 3;
        context.strokeRect(x - 12, y - 12, 24, 24);
      }
    };

    let hudWait = 0;
    const frame = (now: number) => {
      const delta = Math.min(.033, (now - runtime.last) / 1000);
      runtime.last = now;
      if (runtime.running && !runtime.paused) update(delta);
      render();
      hudWait -= delta;
      if (hudWait <= 0) {
        hudWait = .12;
        const player = runtime.units.find((current) => current.id === 'player')!;
        const mapUnits = runtime.units.filter((current) => !current.dead && current.type !== 'projectile' && current.type !== 'effect').map((current) => ({ id: current.id, type: current.type, team: current.team, x: current.x, y: current.y }));
        onHud({ hp: player.hp, maxHp: player.maxHp, xp: [...runtime.teamXp] as [number, number], need: [xpNeeded(runtime.teamLevel[0]),xpNeeded(runtime.teamLevel[1])], level: [...runtime.teamLevel] as [number, number], kills: [...runtime.kills] as [number, number], time: runtime.elapsed, cooldowns: { ...runtime.cooldowns }, wave: runtime.wave, command: runtime.attackPrimed ? 'primed' : runtime.command.mode, mapUnits });
      }
      if (runtime.running || runtime.outcome) requestAnimationFrame(frame);
    };

    const resumeAfterAbilityChoice = () => { runtime.paused = false; };

    const preventContextMenu = (event: MouseEvent) => event.preventDefault();

    window.addEventListener('keydown', keyDown);
    window.addEventListener('blockbound-ability-selected',resumeAfterAbilityChoice);
    canvas.addEventListener('mousemove', point);
    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('contextmenu', preventContextMenu);
    requestAnimationFrame(frame);

    return () => {
      runtime.running = false;
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('blockbound-ability-selected',resumeAfterAbilityChoice);
      canvas.removeEventListener('mousemove', point);
      canvas.removeEventListener('mousedown', mouseDown);
      canvas.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [onHud,onLevelUp,onOutcome]);

  return <canvas ref={canvasRef} width={1280} height={720} className="battleCanvas" aria-label="Playable three-lane Blockbound Arena battlefield" />;
}

function Minimap({ units }: { units: MapUnit[] }) {
  return <div className="minimap" aria-label="Battlefield minimap">
    <i className="mapRiver" />
    {LANE_Y.map((laneY) => <i key={laneY} className="mapLane" style={{ top: `${laneY / WORLD.height * 100}%` }} />)}
    {units.map((current) => <i
      key={current.id}
      className={`mapUnit map${current.type[0].toUpperCase()}${current.type.slice(1)} ${current.team === 0 ? 'mapBlue' : 'mapRed'} ${current.id === 'player' ? 'mapPlayer' : ''}`}
      style={{ left: `${current.x / WORLD.width * 100}%`, top: `${current.y / WORLD.height * 100}%` }}
    />)}
  </div>;
}

export function Battle({ hero, era, onExit }: { hero: Hero; era: Era; onExit: () => void }) {
  const abilityTiers=useMemo(()=>getAbilityTiers(hero),[hero]);
  const [selectedAbilities,setSelectedAbilities]=useState<AbilityLoadout>(()=>[abilityTiers[0].choices[0],null,null,null,null]);
  const [choiceLevel,setChoiceLevel]=useState<number|null>(null);
  const [levelNotice,setLevelNotice]=useState<number|null>(null);
  const noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [hud, setHud] = useState<Hud>({ hp: hero.hp, maxHp: hero.hp, xp: [0, 0], need: [xpNeeded(1),xpNeeded(1)], level: [1, 1], kills: [0, 0], time: 0, cooldowns: { q: 0, w: 0, e: 0, r: 0, t: 0 }, wave: 0, command: 'idle', mapUnits: [] });
  const [outcome, setOutcome] = useState<'' | 'VICTORY' | 'DEFEAT'>('');
  const [tip, setTip] = useState(true);
  const gameKey = useMemo(() => `${hero.id}-${era}`, [hero.id, era]);
  const handleLevelUp=useCallback((level:number)=>{
    setLevelNotice(level);
    if(noticeTimer.current)clearTimeout(noticeTimer.current);
    noticeTimer.current=setTimeout(()=>setLevelNotice(null),2600);
    if(ABILITY_MILESTONES.includes(level as typeof ABILITY_MILESTONES[number]))setChoiceLevel(level);
  },[]);
  const handleOutcome = useCallback((result: 'VICTORY' | 'DEFEAT') => setOutcome(result), []);
  const handleHud = useCallback((nextHud: Hud) => setHud(nextHud), []);
  const chooseAbility=(selected:AbilityOption)=>{
    const slot=abilityTiers.findIndex(tier=>tier.level===choiceLevel);
    if(slot<0)return;
    setSelectedAbilities(current=>current.map((ability,index)=>index===slot?selected:ability));
    setChoiceLevel(null);
    window.dispatchEvent(new Event('blockbound-ability-selected'));
  };

  useEffect(() => {
    const timer = setTimeout(() => setTip(false), 9000);
    return () => {clearTimeout(timer);if(noticeTimer.current)clearTimeout(noticeTimer.current);};
  }, []);

  const commandLabel = hud.command === 'primed' ? 'SELECT ATTACK DESTINATION' : hud.command === 'attackMove' ? 'ATTACK-MOVING' : hud.command === 'attackTarget' ? 'FOCUSING TARGET' : hud.command === 'move' ? 'MOVING' : 'AWAITING COMMAND';
  const choiceTier=abilityTiers.find(tier=>tier.level===choiceLevel);
  const noticeIsMilestone=levelNotice!==null&&ABILITY_MILESTONES.includes(levelNotice as typeof ABILITY_MILESTONES[number]);

  return <main className="battleScreen" style={{ '--hero': hero.color } as React.CSSProperties}>
    <header className="battleTop">
      <div className="battleBrand"><span className="brandMark">B</span><span><small>{MAPS[era].sub}</small><b>{MAPS[era].name} · THREE LANES</b></span></div>
      <div className="score"><span className="blueScore">{hud.kills[0]}</span><b>{formatTime(hud.time)}</b><span className="redScore">{hud.kills[1]}</span></div>
      <div className="waveCounter">WAVE <b>{hud.wave}</b><button onClick={onExit}>LEAVE</button></div>
    </header>
    <div className="arenaFrame">
      <BattleCanvas key={gameKey} hero={hero} era={era} selectedAbilities={selectedAbilities} onLevelUp={handleLevelUp} onOutcome={handleOutcome} onHud={handleHud} />
      <div className="teamXp teamXpBlue"><span><b>YOUR TEAM · LEVEL {hud.level[0]}</b><small>{Math.floor(hud.xp[0])} / {hud.need[0]} XP</small></span><i><b style={{ width: `${Math.min(100,hud.xp[0] / hud.need[0] * 100)}%` }} /></i></div>
      <div className="teamXp teamXpRed"><span><small>{Math.floor(hud.xp[1])} / {hud.need[1]} XP</small><b>ENEMY · LEVEL {hud.level[1]}</b></span><i><b style={{ width: `${Math.min(100,hud.xp[1] / hud.need[1] * 100)}%` }} /></i></div>
      <div className={`commandModeTag ${hud.command === 'primed' ? 'commandPrimed' : ''}`}>{commandLabel}</div>
      {tip && <div className="controlTip"><button onClick={() => setTip(false)}>×</button><b><kbd>RIGHT-CLICK</kbd> TO MOVE</b><span>After arriving, you attack nearby enemies. Press <kbd>A</kbd>, then left-click to attack-move. Abilities use <kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd> <kbd>T</kbd>.</span></div>}
      {levelNotice!==null&&<div className={`levelNotice ${noticeIsMilestone?'specialLevel':''}`}><small>TEAM LEVEL</small><b>{levelNotice}</b><span>{noticeIsMilestone?'ABILITY CHOICE AVAILABLE':'BASE STATS INCREASED'}</span></div>}
      {choiceTier&&<div className="abilityChoicePanel"><p>LEVEL {choiceTier.level} · <kbd>{choiceTier.key.toUpperCase()}</kbd> SLOT</p><h3>CHOOSE AN ABILITY</h3><span>This choice fills the next space in your bottom ability bar.</span><div>{choiceTier.choices.map(choice=><button key={choice.name} onClick={()=>chooseAbility(choice)}><i>{choice.icon}</i><b>{choice.name}</b><small>{choice.description}</small></button>)}</div></div>}
      {outcome && <div className="outcomeOverlay"><p>{outcome === 'VICTORY' ? 'ENEMY HEART SHATTERED' : 'YOUR HEART HAS FALLEN'}</p><h2>{outcome}</h2><div><span>TEAM LEVEL <b>{hud.level[0]}</b></span><span>TAKEDOWNS <b>{hud.kills[0]}</b></span><span>TIME <b>{formatTime(hud.time)}</b></span></div><button onClick={onExit}>RETURN TO HQ</button></div>}
    </div>
    <footer className="battleHud">
      <div className="playerPanel"><HeroPortrait hero={hero} /><span><small>{hero.role}</small><b>{hero.name}</b><i><b style={{ width: `${Math.max(0, hud.hp / hud.maxHp * 100)}%` }} /></i><em>{Math.ceil(Math.max(0, hud.hp))} / {Math.ceil(hud.maxHp)}</em></span></div>
      <div className="abilities" aria-label="Ability bar">{abilityTiers.map((tier,index)=>{const selected=selectedAbilities[index],cooldown=hud.cooldowns[tier.key],locked=!selected;return <div key={tier.level} className={`${cooldown>0?'cooling':''} ${locked?'locked':''}`} aria-label={selected?`${selected.name} ability`:`Ability slot unlocks at level ${tier.level}`}><kbd>{tier.key.toUpperCase()}</kbd><i style={{'--cool':`${Math.min(100,cooldown/ABILITY_COOLDOWNS[index]*100)}%`} as React.CSSProperties}>{locked?`LVL ${tier.level}`:cooldown>0?cooldown.toFixed(1):selected.icon}</i><span>{selected?.name??'Unchosen'}</span></div>})}</div>
      <Minimap units={hud.mapUnits} />
    </footer>
  </main>;
}
