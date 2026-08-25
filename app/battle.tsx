'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ABILITY_BAR_KEYS, ABILITY_MILESTONES, AbilityKey, AbilityOption, Era, getAbilityTiers, HEROES, Hero, HeroPortrait, SummonStyle } from './game';

type Team = 0 | 1;
type Faction = Team | 2;
type Lane = 0 | 1 | 2;
type WorldPoint = { x: number; y: number };
type TerrainObstacle = WorldPoint & { radius: number; variant: number };
type UnitType = 'hero' | 'melee' | 'ranged' | 'siege' | 'mercenary' | 'summon' | 'tower' | 'core' | 'projectile' | 'effect';
type ProjectileStyle = 'energy' | 'arrow' | 'bullet' | 'stone' | 'rocket';
type CommandMode = 'idle' | 'move' | 'attackMove' | 'attackTarget';
type AbilityLoadout = Array<AbilityOption|null>;

type MercenaryCamp = {
  id: string;
  x: number;
  y: number;
  radius: number;
  lane: Lane;
  unitIds: string[];
  owner: Team | null;
  respawnAt: number;
};

type Unit = {
  id: string;
  type: UnitType;
  team: Faction;
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
  armor?: number;
  attackSpeed?: number;
  expiresAt?: number;
  summonStyle?: SummonStyle;
  summonSlot?: number;
  renderX?: number;
  renderY?: number;
  projectileStyle?: ProjectileStyle;
  campId?: string;
  homeX?: number;
  homeY?: number;
  leashRadius?: number;
  captured?: boolean;
};

type Runtime = {
  units: Unit[];
  siegeLanes: [Set<Lane>, Set<Lane>];
  mercenaryCamps: MercenaryCamp[];
  camera: { x: number; y: number; zoom: number };
  aim: { x: number; y: number };
  command: { mode: CommandMode; x: number; y: number; targetId?: string; marker: number };
  attackPrimed: boolean;
  pendingAbility?: AbilityKey;
  teamXp: [number, number];
  teamLevel: [number, number];
  kills: [number, number];
  elapsed: number;
  wave: number;
  nextWave: number;
  last: number;
  running: boolean;
  cooldowns: Record<AbilityKey,number>;
  outcome: '' | 'VICTORY' | 'DEFEAT';
};

type MapUnit = { id: string; type: UnitType; team: Faction; x: number; y: number };
type MapCamp = { id: string; owner: Team | null; x: number; y: number; respawning: boolean };
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
  command: CommandMode | 'primed' | 'abilityTargeting';
  aimingAbility: { key: AbilityKey; name: string } | null;
  mapUnits: MapUnit[];
  mapCamps: MapCamp[];
  camera: { x: number; y: number; zoom: number };
};

const WORLD = { width: 4800, height: 2700 };
const VIEW_WIDTH = 1600;
const MIN_ZOOM = .65;
const MAX_ZOOM = 1.7;
const LANE_Y: [number, number, number] = [480, 1350, 2220];
const LANE_NAMES = ['TOP', 'MIDDLE', 'BOTTOM'];
const LANE_HALF_WIDTH = 150;
const ROTATION_X = [1100, 2400, 3700];
const CASTLE_X: [number, number] = [180, 4620];
const HERO_SPAWN_X: [number, number] = [480, 4320];
const MINION_SPAWN_X: [number, number] = [260, 4540];
const ABILITY_COOLDOWNS = [5,8,12,18,28];
const xpNeeded = (level:number)=>200+level*60;
const abilityRequiresAim = (ability: AbilityOption) => !['nova', 'novaStrong', 'surge'].includes(ability.effect)
  && !(ability.effect === 'summon' && (ability.summonStyle === 'guardian' || ability.summonStyle === 'drone'));
const abilityMaximumRange = (ability: AbilityOption, hero: Hero) => ability.effect === 'dash'
  ? hero.id === 'volt' ? 190 : 150
  : ability.effect === 'summon' ? 360
    : ability.effect === 'blastStrong' ? 720
    : ability.effect === 'blast' ? 620
      : ability.effect === 'bolt' ? 520
        : 570;

const MAPS = {
  medieval: { name: 'CROWNKEEP', sub: 'MEDIEVAL FRONTIER', ground: '#667e42', ground2: '#7e9250', lane: '#b5a272', river: '#4c91a5', team0: '#3e8fdb', team1: '#da5947' },
  modern: { name: 'NEON DIVIDE', sub: 'MODERN WARZONE', ground: '#303b3e', ground2: '#3f4a4a', lane: '#626d6e', river: '#1d727e', team0: '#24a7dc', team1: '#f35e55' },
};

const LANE_PATHS: Record<Lane, WorldPoint[]> = {
  0: [{ x: 0, y: 1350 }, { x: 300, y: 1350 }, { x: 600, y: 1080 }, { x: 1100, y: 520 }, { x: 1600, y: 260 }, { x: 2400, y: 360 }, { x: 3200, y: 520 }, { x: 3700, y: 850 }, { x: 4200, y: 1220 }, { x: 4500, y: 1350 }, { x: 4800, y: 1350 }],
  1: [{ x: 0, y: 1350 }, { x: 600, y: 1350 }, { x: 1400, y: 1250 }, { x: 2400, y: 1450 }, { x: 3400, y: 1250 }, { x: 4200, y: 1350 }, { x: 4800, y: 1350 }],
  2: [{ x: 0, y: 1350 }, { x: 300, y: 1350 }, { x: 600, y: 1620 }, { x: 1100, y: 2180 }, { x: 1600, y: 2440 }, { x: 2400, y: 2340 }, { x: 3200, y: 2180 }, { x: 3700, y: 1850 }, { x: 4200, y: 1480 }, { x: 4500, y: 1350 }, { x: 4800, y: 1350 }],
};

const MERCENARY_CAMP_SITES = [
  { id: 'west-north-camp', x: 1550, y: 900 },
  { id: 'east-north-camp', x: 3250, y: 900 },
  { id: 'west-south-camp', x: 1550, y: 1800 },
  { id: 'east-south-camp', x: 3250, y: 1800 },
] as const;
const MERCENARY_NEUTRAL_COLOR = '#c69242';
const MERCENARY_RESPAWN_SECONDS = 35;

function pointOnLane(lane: Lane, x: number) {
  const path = LANE_PATHS[lane];
  const clampedX = Math.max(path[0].x, Math.min(path[path.length - 1].x, x));
  for (let index = 1; index < path.length; index++) {
    const start = path[index - 1];
    const end = path[index];
    if (clampedX > end.x) continue;
    const ratio = (clampedX - start.x) / Math.max(1, end.x - start.x);
    return { x: clampedX, y: start.y + (end.y - start.y) * ratio };
  }
  return { ...path[path.length - 1] };
}

function pointSegmentDistance(point: WorldPoint, start: WorldPoint, end: WorldPoint) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * ratio), point.y - (start.y + dy * ratio));
}

function pointPathDistance(point: WorldPoint, path: WorldPoint[]) {
  let closest = Infinity;
  for (let index = 1; index < path.length; index++) closest = Math.min(closest, pointSegmentDistance(point, path[index - 1], path[index]));
  return closest;
}

const ROTATION_PATHS: WorldPoint[][] = ROTATION_X.map((centerX, index) => {
  const direction = index % 2 === 0 ? 1 : -1;
  const topX = centerX - direction * 70;
  const middleX = centerX + direction * 80;
  const bottomX = centerX - direction * 45;
  return [pointOnLane(0, topX), pointOnLane(1, middleX), pointOnLane(2, bottomX)];
});

const TERRAIN_OBSTACLES: TerrainObstacle[] = [];
const TERRAIN_STEP = 160;
for (let y = 120; y < WORLD.height - 100; y += TERRAIN_STEP) for (let xBase = 430; xBase < WORLD.width - 430; xBase += TERRAIN_STEP) {
  const x = xBase + ((y / TERRAIN_STEP) % 2) * 54;
  const point = { x, y };
  const inLane = ([0, 1, 2] as Lane[]).some((lane) => pointPathDistance(point, LANE_PATHS[lane]) < LANE_HALF_WIDTH + 74);
  const inRotation = ROTATION_PATHS.some((path) => pointPathDistance(point, path) < 122);
  const nearMercenaryCamp = MERCENARY_CAMP_SITES.some((camp) => Math.hypot(x - camp.x, y - camp.y) < 220);
  if (!inLane && !inRotation && !nearMercenaryCamp) TERRAIN_OBSTACLES.push({ x, y, radius: 43, variant: Math.floor(xBase / TERRAIN_STEP + y / TERRAIN_STEP) % 2 });
}

function collidingObstacle(x: number, y: number, radius: number) {
  return TERRAIN_OBSTACLES.find((obstacle) => Math.hypot(x - obstacle.x, y - obstacle.y) < obstacle.radius + radius);
}

function navigableDestination(x: number, y: number, radius: number, origin: WorldPoint) {
  const obstacle = collidingObstacle(x, y, radius);
  if (!obstacle) return { x, y };
  const dx = origin.x - obstacle.x;
  const dy = origin.y - obstacle.y;
  const length = Math.max(.001, Math.hypot(dx, dy));
  const clearance = obstacle.radius + radius + 4;
  return { x: obstacle.x + dx / length * clearance, y: obstacle.y + dy / length * clearance };
}

function moveWithTerrainCollision(current: Unit, deltaX: number, deltaY: number) {
  const clampedX = Math.max(35, Math.min(WORLD.width - 35, current.x + deltaX));
  const clampedY = Math.max(55, Math.min(WORLD.height - 55, current.y + deltaY));
  const obstacle = collidingObstacle(clampedX, clampedY, current.radius);
  if (!obstacle) {
    current.x = clampedX;
    current.y = clampedY;
    return true;
  }

  const separation = Math.max(.001, Math.hypot(current.x - obstacle.x, current.y - obstacle.y));
  const normalX = (current.x - obstacle.x) / separation;
  const normalY = (current.y - obstacle.y) / separation;
  const inward = Math.min(0, deltaX * normalX + deltaY * normalY);
  let slideX = deltaX - normalX * inward;
  let slideY = deltaY - normalY * inward;
  if (Math.hypot(slideX, slideY) < .05) {
    const turn = obstacle.variant === 0 ? 1 : -1;
    slideX = -normalY * Math.hypot(deltaX, deltaY) * turn;
    slideY = normalX * Math.hypot(deltaX, deltaY) * turn;
  }
  const slideTargetX = Math.max(35, Math.min(WORLD.width - 35, current.x + slideX));
  const slideTargetY = Math.max(55, Math.min(WORLD.height - 55, current.y + slideY));
  if (collidingObstacle(slideTargetX, slideTargetY, current.radius)) return false;
  current.x = slideTargetX;
  current.y = slideTargetY;
  return true;
}

function traceWorldPath(context: CanvasRenderingContext2D, path: WorldPoint[]) {
  context.beginPath();
  context.moveTo(path[0].x, path[0].y);
  path.slice(1).forEach((point) => context.lineTo(point.x, point.y));
}

function minimapPath(lane: Lane) {
  return LANE_PATHS[lane].map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function shade(hex: string, amount: number) {
  const channels = hex.startsWith('#')
    ? [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
    : (hex.match(/\d+/g)?.slice(0, 3).map(Number) ?? [128, 128, 128]);
  const [r, g, b] = channels.map((channel) => Math.max(0, Math.min(255, channel + amount)));
  return `rgb(${r},${g},${b})`;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function heroAttackDelay(heroId?: string) {
  const role = HEROES.find((candidate) => candidate.id === heroId)?.role;
  if (role === 'MARKSMAN') return .48;
  if (role === 'ASSASSIN') return .58;
  if (role === 'FIGHTER') return .68;
  if (role === 'MAGE') return .78;
  if (role === 'SUPPORT') return .86;
  return .94;
}

function unit(partial: Partial<Unit> & Pick<Unit, 'id' | 'type' | 'team' | 'lane' | 'x' | 'y'>): Unit {
  const created = { hp: 100, maxHp: 100, speed: 0, damage: 10, range: 60, radius: 18, color: '#fff', attackWait: 0, ...partial } as Unit;
  created.renderX ??= created.x;
  created.renderY ??= created.y;
  return created;
}

function setupGame(hero: Hero, era: Era): Runtime {
  const map = MAPS[era];
  const units: Unit[] = [];
  units.push(unit({ id: 'player', type: 'hero', team: 0, lane: 1, x: HERO_SPAWN_X[0], y: LANE_Y[1], hp: hero.hp, maxHp: hero.hp, speed: hero.speed, damage: hero.power, range: hero.range, radius: 30, color: hero.color, heroId: hero.id, abilityPower: 1, haste: 1, armor: 8, attackSpeed: 1 }));

  const allyIds = ['briar', 'rook', 'forge', 'nyx'];
  const allyLanes: Lane[] = [0, 1, 2, 1];
  allyIds.forEach((id, index) => {
    const h = HEROES.find((candidate) => candidate.id === id)!;
    const lane = allyLanes[index];
    const x = HERO_SPAWN_X[0] - 30 + (index % 2) * 54;
    units.push(unit({ id: `ally-${index}`, type: 'hero', team: 0, lane, x, y: pointOnLane(lane, x).y + (index > 2 ? 42 : -34), hp: h.hp, maxHp: h.hp, speed: h.speed * .88, damage: h.power * .84, range: h.range, radius: 29, color: h.color, heroId: h.id, abilityPower: 1, haste: 1, armor: 8, attackSpeed: 1 }));
  });

  const enemyIds = ['bastion', 'volt', 'echo', 'kestrel', 'ember'];
  const enemyLanes: Lane[] = [0, 1, 2, 0, 2];
  enemyIds.forEach((id, index) => {
    const h = HEROES.find((candidate) => candidate.id === id)!;
    const lane = enemyLanes[index];
    const x = HERO_SPAWN_X[1] + 30 - (index % 2) * 54;
    units.push(unit({ id: `enemy-${index}`, type: 'hero', team: 1, lane, x, y: pointOnLane(lane, x).y + (index > 2 ? 42 : -34), hp: h.hp, maxHp: h.hp, speed: h.speed * .86, damage: h.power * .82, range: h.range, radius: 29, color: h.color, heroId: h.id, abilityPower: 1, haste: 1, armor: 8, attackSpeed: 1 }));
  });

  units.push(unit({ id: 'core-0', type: 'core', team: 0, lane: 1, x: CASTLE_X[0], y: LANE_Y[1], hp: 7200, maxHp: 7200, radius: 96, color: map.team0, damage: 185, range: 500 }));
  units.push(unit({ id: 'core-1', type: 'core', team: 1, lane: 1, x: CASTLE_X[1], y: LANE_Y[1], hp: 7200, maxHp: 7200, radius: 96, color: map.team1, damage: 185, range: 500 }));

  LANE_Y.forEach((_y, laneIndex) => {
    const lane = laneIndex as Lane;
    [1000, 1750].forEach((x, index) => units.push(unit({ id: `tower-0-${lane}-${index}`, type: 'tower', team: 0, lane, x, y: pointOnLane(lane, x).y, hp: 2400, maxHp: 2400, radius: 48, color: map.team0, damage: 138, range: 430 })));
    [3050, 3800].forEach((x, index) => units.push(unit({ id: `tower-1-${lane}-${index}`, type: 'tower', team: 1, lane, x, y: pointOnLane(lane, x).y, hp: 2400, maxHp: 2400, radius: 48, color: map.team1, damage: 138, range: 430 })));
  });

  const mercenaryCamps: MercenaryCamp[] = MERCENARY_CAMP_SITES.map((site) => {
    const lane = ([0, 1, 2] as Lane[]).reduce((closest, candidate) => pointPathDistance(site, LANE_PATHS[candidate]) < pointPathDistance(site, LANE_PATHS[closest]) ? candidate : closest, 0 as Lane);
    const offsets = [{ x: -48, y: 0 }, { x: 34, y: -48 }, { x: 34, y: 48 }];
    const unitIds = offsets.map((offset, index) => {
      const id = `${site.id}-merc-${index}`;
      units.push(unit({
        id,
        type: 'mercenary',
        team: 2,
        lane,
        x: site.x + offset.x,
        y: site.y + offset.y,
        homeX: site.x + offset.x,
        homeY: site.y + offset.y,
        campId: site.id,
        leashRadius: 170,
        hp: 480,
        maxHp: 480,
        speed: 108,
        damage: 18,
        range: 72,
        radius: 28,
        color: MERCENARY_NEUTRAL_COLOR,
      }));
      return id;
    });
    return { ...site, radius: 170, lane, unitIds, owner: null, respawnAt: 0 };
  });

  return {
    units,
    siegeLanes: [new Set<Lane>(), new Set<Lane>()],
    mercenaryCamps,
    camera: { x: VIEW_WIDTH / 2, y: LANE_Y[1], zoom: 1 },
    aim: { x: 800, y: LANE_Y[1] },
    command: { mode: 'idle', x: HERO_SPAWN_X[0], y: LANE_Y[1], marker: 0 },
    attackPrimed: false,
    pendingAbility: undefined,
    teamXp: [0, 0],
    teamLevel: [1, 1],
    kills: [0, 0],
    elapsed: 0,
    wave: 0,
    nextWave: .45,
    last: performance.now(),
    running: true,
    cooldowns: { q: 0, w: 0, e: 0, r: 0, t: 0 },
    outcome: '',
  };
}

function drawBox(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, depth: number, color: string) {
  const left = x - width / 2;
  const right = x + width / 2;
  const top = y - height / 2;
  const bottom = y + height / 2;
  context.fillStyle = shade(color, 24);
  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(right, top);
  context.lineTo(right + depth, top - depth);
  context.lineTo(left + depth, top - depth);
  context.closePath();
  context.fill();
  context.fillStyle = shade(color, -38);
  context.beginPath();
  context.moveTo(right, top);
  context.lineTo(right + depth, top - depth);
  context.lineTo(right + depth, bottom - depth);
  context.lineTo(right, bottom);
  context.closePath();
  context.fill();
  context.fillStyle = color;
  context.fillRect(left, top, width, height);
  context.strokeStyle = '#10181099';
  context.lineWidth = 2.5;
  context.strokeRect(left, top, width, height);
}

function drawHealth(context: CanvasRenderingContext2D, current: Unit, x: number, y: number) {
  const width = current.type === 'core' ? 150 : current.type === 'tower' ? 92 : current.type === 'hero' || current.type === 'mercenary' ? 58 : current.type === 'melee' ? 34 : 40;
  context.fillStyle = '#0d120f';
  context.fillRect(x - width / 2, y, width, 9);
  context.fillStyle = current.team === 2 ? '#efba52' : current.team === 0 ? '#51b9ff' : '#ff6558';
  context.fillRect(x - width / 2 + 2, y + 2, (width - 4) * Math.max(0, current.hp / current.maxHp), 5);
}

function drawRotatedBox(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, depth: number, color: string, angle: number) {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  drawBox(context, 0, 0, width, height, depth, color);
  context.restore();
}

function drawWheel(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  context.fillStyle = '#171c18';
  context.strokeStyle = '#0a0d0b';
  context.lineWidth = 4;
  context.beginPath();
  for (let index = 0; index < 8; index++) {
    const angle = Math.PI / 8 + index * Math.PI / 4;
    const wheelX = x + Math.cos(angle) * radius;
    const wheelY = y + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(wheelX, wheelY);
    else context.lineTo(wheelX, wheelY);
  }
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = '#727866';
  context.fillRect(x - 5, y - 5, 10, 10);
}

function drawSiegeUnit(context: CanvasRenderingContext2D, current: Unit, era: Era, x: number, y: number) {
  const direction = current.team === 0 ? 1 : -1;
  if (era === 'medieval') {
    const loadedArmDirection = -direction;
    drawBox(context, x, y + 7, 86, 18, 8, shade(current.color, -20));
    drawWheel(context, x - 28, y + 22, 18);
    drawWheel(context, x + 28, y + 22, 18);
    drawBox(context, x + direction * 44, y + 3, 24, 8, 3, '#6e472b');

    context.strokeStyle = '#6e472b';
    context.lineWidth = 10;
    context.lineCap = 'square';
    context.beginPath();
    context.moveTo(x - 27, y + 4);
    context.lineTo(x, y - 38);
    context.lineTo(x + 27, y + 4);
    context.stroke();

    const armAngle = loadedArmDirection === 1 ? -.93 : .93;
    drawRotatedBox(context, x + loadedArmDirection * 8, y - 39, 94, 10, 4, '#8a5b34', armAngle);
    drawBox(context, x + loadedArmDirection * 43, y - 76, 27, 19, 6, '#4c3121');
    drawBox(context, x - loadedArmDirection * 26, y - 11, 24, 27, 6, '#30362f');
    context.fillStyle = '#879080';
    context.strokeStyle = '#30362f';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x + loadedArmDirection * 45, y - 89, 10, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    drawBox(context, x, y - 37, 15, 15, 4, shade(current.color, 22));
    drawHealth(context, current, x, y - 110);
    return;
  }

  drawBox(context, x, y + 5, 92, 28, 9, current.color);
  drawBox(context, x, y + 24, 98, 17, 5, '#20272a');
  [-32, 0, 32].forEach((offset) => drawWheel(context, x + offset, y + 25, 11));
  drawBox(context, x - direction * 7, y - 17, 42, 14, 5, shade(current.color, 18));
  const launcherAngle = direction === 1 ? -.38 : .38;
  [-10, 10].forEach((offset) => {
    drawRotatedBox(context, x + direction * 12, y - 41 + offset, 76, 12, 4, '#39464c', launcherAngle);
    const noseX = x + direction * 50;
    const noseY = y - 57 + offset;
    context.fillStyle = '#d3ff56';
    context.beginPath();
    context.moveTo(noseX + direction * 12, noseY);
    context.lineTo(noseX - direction * 2, noseY - 7);
    context.lineTo(noseX - direction * 2, noseY + 7);
    context.closePath();
    context.fill();
  });
  drawHealth(context, current, x, y - 85);
}

function drawRangedUnit(context: CanvasRenderingContext2D, current: Unit, era: Era, x: number, y: number) {
  const direction = current.team === 0 ? 1 : -1;
  drawBox(context, x - 6, y + 5, 9, 25, 3, shade(current.color, -24));
  drawBox(context, x + 6, y + 5, 9, 25, 3, shade(current.color, -24));
  drawBox(context, x, y - 17, 24, 37, 6, current.color);
  drawBox(context, x, y - 49, 23, 23, 5, shade(current.color, 26));

  if (era === 'medieval') {
    const bowX = x + direction * 27;
    drawRotatedBox(context, x - direction * 17, y - 27, 12, 36, 4, '#573823', direction * .18);
    [-5, 0, 5].forEach((offset) => {
      context.strokeStyle = '#d8c79a';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x - direction * (18 + offset), y - 41);
      context.lineTo(x - direction * (23 + offset), y - 62);
      context.stroke();
    });
    context.strokeStyle = '#d4a85d';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(bowX, y - 54);
    context.quadraticCurveTo(bowX + direction * 22, y - 27, bowX, y);
    context.stroke();
    context.strokeStyle = '#eee7d4';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(bowX, y - 54);
    context.lineTo(x + direction * 14, y - 27);
    context.lineTo(bowX, y);
    context.moveTo(x + direction * 13, y - 27);
    context.lineTo(x + direction * 54, y - 27);
    context.stroke();
    context.fillStyle = '#eee7d4';
    context.beginPath();
    context.moveTo(x + direction * 58, y - 27);
    context.lineTo(x + direction * 49, y - 33);
    context.lineTo(x + direction * 49, y - 21);
    context.closePath();
    context.fill();
  } else {
    drawBox(context, x - direction * 14, y - 25, 15, 25, 4, '#334047');
    drawBox(context, x + direction * 27, y - 27, 64, 11, 4, '#29343b');
    drawBox(context, x + direction * 10, y - 16, 13, 18, 3, '#59666b');
    context.fillStyle = '#d3ff56';
    context.fillRect(x + direction * 58 - (direction < 0 ? 4 : 0), y - 30, 5, 5);
  }
  drawHealth(context, current, x, y - 82);
}

function drawSword(context: CanvasRenderingContext2D, x: number, y: number, direction: number, modern: boolean) {
  context.save();
  context.translate(x, y);
  context.rotate(direction * .5);
  if (modern) {
    context.shadowColor = '#d3ff56';
    context.shadowBlur = 10;
  }
  drawBox(context, 0, -16, 5, 28, 2, modern ? '#d3ff56' : '#e7e4d5');
  context.fillStyle = modern ? '#d3ff56' : '#e7e4d5';
  context.beginPath();
  context.moveTo(0, -35);
  context.lineTo(-4, -29);
  context.lineTo(4, -29);
  context.closePath();
  context.fill();
  context.shadowBlur = 0;
  drawBox(context, 0, 0, 18, 4, 2, modern ? '#313d42' : '#c29a4a');
  drawBox(context, 0, 8, 5, 12, 2, modern ? '#222b2f' : '#5c3a24');
  context.restore();
}

function drawMeleeUnit(context: CanvasRenderingContext2D, current: Unit, era: Era, x: number, y: number) {
  const direction = current.team === 0 ? 1 : -1;
  drawBox(context, x - 5, y + 4, 7, 18, 2, shade(current.color, -28));
  drawBox(context, x + 5, y + 4, 7, 18, 2, shade(current.color, -28));
  drawBox(context, x, y - 13, 23, 29, 5, current.color);
  drawBox(context, x + direction * 12, y - 13, 7, 22, 2, shade(current.color, -12));
  drawBox(context, x, y - 39, 18, 18, 4, shade(current.color, 25));

  const shieldX = x - direction * 14;
  context.fillStyle = shade(current.color, -18);
  context.strokeStyle = '#101810';
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(shieldX - 8, y - 28);
  context.lineTo(shieldX + 8, y - 28);
  context.lineTo(shieldX + 8, y - 10);
  context.lineTo(shieldX, y - 3);
  context.lineTo(shieldX - 8, y - 10);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = shade(current.color, 30);
  context.fillRect(shieldX - 3, y - 19, 6, 6);

  if (era === 'medieval') {
    drawBox(context, x, y - 49, 23, 8, 3, '#666d64');
    drawBox(context, x - direction * 6, y - 43, 7, 4, 2, '#242a25');
    drawSword(context, x + direction * 15, y - 10, direction, false);
  } else {
    drawBox(context, x, y - 49, 22, 9, 3, '#303a3f');
    context.fillStyle = '#c5f7ff';
    context.fillRect(x - 7, y - 44, 14, 4);
    context.fillStyle = '#1d272b';
    context.fillRect(shieldX - 5, y - 24, 10, 4);
    drawSword(context, x + direction * 15, y - 10, direction, true);
  }
  drawHealth(context, current, x, y - 65);
}

function drawVoxelProjectile(context: CanvasRenderingContext2D, style: ProjectileStyle, color: string) {
  const cube = (x: number, y: number, size: number, cubeColor = color) => drawBox(context, x, y, size, size, Math.max(2, size * .28), cubeColor);
  context.shadowColor = style === 'stone' ? '#e7d7aa' : color;
  context.shadowBlur = style === 'stone' ? 7 : 15;
  if (style === 'arrow') {
    [-13, -7, -1, 5, 11].forEach((x) => cube(x, 0, 5, '#f0dfb8'));
    cube(16, 0, 7, '#d9e0d5');
    cube(11, -5, 5, '#d9e0d5');
    cube(11, 5, 5, '#d9e0d5');
    cube(-13, -5, 5, '#c69355');
    cube(-13, 5, 5, '#c69355');
  } else if (style === 'stone') {
    cube(-6, -4, 10, '#737b70');
    cube(5, -5, 11, '#92998c');
    cube(-4, 6, 11, '#899184');
    cube(7, 6, 9, '#697268');
  } else if (style === 'bullet') {
    [-9, -3, 3, 9].forEach((x, index) => cube(x, 0, index === 3 ? 6 : 5, index === 3 ? '#efffb0' : '#d3ff56'));
  } else if (style === 'rocket') {
    [-8, -1, 6].forEach((x) => cube(x, 0, 8, '#d9e1dc'));
    cube(12, 0, 7, '#9ca9aa');
    cube(-9, -6, 6, '#8c9a9b');
    cube(-9, 6, 6, '#8c9a9b');
    cube(-15, 0, 7, '#ff9a3d');
    cube(-21, 0, 5, '#d3ff56');
  } else {
    cube(0, 0, 9);
    cube(-8, 0, 6, shade(color, -12));
    cube(8, 0, 6, shade(color, 24));
    cube(0, -8, 6, shade(color, 30));
    cube(0, 8, 6, shade(color, -18));
  }
  context.shadowBlur = 0;
}

function drawUnit(context: CanvasRenderingContext2D, current: Unit, era: Era, elapsed: number) {
  const x = current.renderX ?? current.x;
  const y = current.renderY ?? current.y;
  if (current.type === 'projectile') {
    const angle = Math.atan2(current.vy || 0, current.vx || 1);
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    drawVoxelProjectile(context, current.projectileStyle || 'energy', current.color);
    context.restore();
    return;
  }
  if (current.type === 'effect') {
    context.globalAlpha = Math.max(0, (current.life || 0) / .65);
    context.strokeStyle = current.color;
    context.lineWidth = 7;
    context.beginPath();
    context.ellipse(x, y, current.radius, current.radius * .65, 0, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
    return;
  }

  context.save();
  context.fillStyle = '#14201640';
  context.beginPath();
  const shadowScale = current.type === 'melee' ? .88 : 1.25;
  context.ellipse(x + 10, y + 16, current.radius * shadowScale, current.radius * (current.type === 'melee' ? .42 : .58), 0, 0, Math.PI * 2);
  context.fill();

  if (current.type === 'core') {
    if (era === 'medieval') {
      drawBox(context, x, y - 32, 180, 116, 22, current.color);
      [-68, 0, 68].forEach((offset) => drawBox(context, x + offset, y - 116, 46, 76, 14, shade(current.color, offset === 0 ? 18 : -4)));
      [-68, 0, 68].forEach((offset) => drawBox(context, x + offset, y - 166, 57, 22, 11, shade(current.color, 28)));
      context.fillStyle = '#f7df85';
      context.font = 'bold 44px sans-serif';
      context.textAlign = 'center';
      context.fillText('♥', x, y - 30);
    } else {
      drawBox(context, x, y - 25, 184, 104, 22, current.color);
      drawBox(context, x, y - 116, 70, 82, 15, shade(current.color, 24));
      context.fillStyle = '#d3ff56';
      context.fillRect(x - 8, y - 186, 16, 62);
      context.shadowColor = '#d3ff56';
      context.shadowBlur = 20;
      context.fillRect(x - 11, y - 205, 22, 22);
      context.shadowBlur = 0;
    }
    drawHealth(context, current, x, y - 222);
  } else if (current.type === 'tower') {
    drawBox(context, x, y - 26, 68, 104, 15, current.color);
    drawBox(context, x, y - 93, 88, 34, 14, shade(current.color, 12));
    drawBox(context, x, y - 126, 38, 38, 10, shade(current.color, 28));
    if (era === 'modern') {
      context.fillStyle = '#c5f7ff';
      context.fillRect(x - 27, y - 126, 54, 8);
    }
    drawHealth(context, current, x, y - 163);
  } else if (current.type === 'siege') {
    drawSiegeUnit(context, current, era, x, y);
  } else if (current.type === 'mercenary') {
    const direction = current.team === 1 ? -1 : 1;
    drawBox(context, x - 12, y + 8, 18, 31, 5, shade(current.color, -28));
    drawBox(context, x + 12, y + 8, 18, 31, 5, shade(current.color, -28));
    drawBox(context, x, y - 28, 50, 53, 10, current.color);
    drawBox(context, x - 35, y - 31, 24, 31, 7, shade(current.color, -8));
    drawBox(context, x + 35, y - 31, 24, 31, 7, shade(current.color, -8));
    drawBox(context, x, y - 73, 37, 34, 8, shade(current.color, 24));
    context.fillStyle = '#211a12';
    context.fillRect(x - 11, y - 78, 7, 6);
    context.fillRect(x + 5, y - 78, 7, 6);
    drawBox(context, x + direction * 43, y - 29, 11, 66, 4, '#6a4930');
    drawBox(context, x + direction * 43, y - 64, 43, 19, 6, era === 'medieval' ? '#9b9b8d' : '#58676c');
    drawHealth(context, current, x, y - 108);
  } else if (current.type === 'summon') {
    const style = current.summonStyle || 'guardian';
    const pulse = 1 + Math.sin(elapsed * 7 + (current.summonSlot || 0)) * .06;
    context.save();
    context.translate(x, y);
    context.scale(pulse, pulse);
    context.shadowColor = current.color;
    context.shadowBlur = 14;
    if (style === 'guardian') {
      drawBox(context, 0, -22, 58, 62, 12, shade(current.color, -8));
      drawBox(context, 0, -23, 38, 45, 8, current.color);
      drawBox(context, 0, -58, 30, 18, 6, shade(current.color, 30));
      drawBox(context, 35, -22, 13, 54, 4, '#e9f7e5');
    } else if (style === 'drone') {
      const hover = Math.sin(elapsed * 8 + (current.summonSlot || 0)) * 5;
      drawBox(context, 0, -38 + hover, 27, 21, 7, current.color);
      drawBox(context, -23, -38 + hover, 17, 10, 4, shade(current.color, 20));
      drawBox(context, 23, -38 + hover, 17, 10, 4, shade(current.color, 20));
      drawBox(context, 0, -38 + hover, 9, 9, 3, '#f4fff0');
    } else if (style === 'rift') {
      context.rotate(elapsed * .7);
      [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => drawBox(context, Math.cos(angle) * 28, Math.sin(angle) * 15 - 29, 17, 17, 5, current.color));
      drawBox(context, 0, -29, 25, 25, 7, shade(current.color, 28));
    } else if (style === 'ward') {
      drawBox(context, 0, -15, 42, 20, 7, shade(current.color, -18));
      drawBox(context, 0, -47, 13, 55, 4, current.color);
      drawBox(context, -21, -65, 18, 18, 5, shade(current.color, 22));
      drawBox(context, 21, -65, 18, 18, 5, shade(current.color, 22));
      drawBox(context, 0, -76, 20, 20, 6, '#e9ffe4');
    } else {
      const direction = current.team === 1 ? -1 : 1;
      drawBox(context, 0, -12, 48, 28, 9, shade(current.color, -18));
      drawBox(context, 0, -43, 34, 35, 8, current.color);
      drawBox(context, direction * 32, -50, 58, 12, 4, '#dbe8dd');
      drawBox(context, direction * 61, -50, 13, 15, 4, shade(current.color, 25));
    }
    context.shadowBlur = 0;
    context.restore();
    drawHealth(context, current, x, y - 102);
  } else if (current.type === 'hero') {
    const phase = [...current.id].reduce((total, letter) => total + letter.charCodeAt(0), 0) * .07;
    const moving = Math.hypot(current.x - (current.renderX ?? current.x), current.y - (current.renderY ?? current.y)) > 1;
    const bob = moving ? Math.sin(elapsed * 7 + phase) * .65 : 0;
    drawBox(context, x - 10, y + 3 + bob, 15, 31, 4, shade(current.color, -22));
    drawBox(context, x + 10, y + 3 - bob, 15, 31, 4, shade(current.color, -22));
    drawBox(context, x, y - 30 + bob, 42, 48, 8, current.color);
    drawBox(context, x - 29, y - 29 + bob, 12, 42, 4, shade(current.color, -12));
    drawBox(context, x + 29, y - 29 + bob, 12, 42, 4, shade(current.color, -12));
    drawBox(context, x, y - 72 + bob, 34, 33, 7, shade(current.color, 28));
    context.fillStyle = current.team === 0 ? '#bce9ff' : '#ffd0c9';
    context.fillRect(x - 10, y - 78 + bob, 6, 6);
    context.fillRect(x + 5, y - 78 + bob, 6, 6);
    const direction = current.team === 0 ? 1 : -1;
    const heroRole = HEROES.find((candidate) => candidate.id === current.heroId)?.role;
    if (current.range < 160 && era === 'medieval') {
      drawBox(context, x + direction * 35, y - 30 + bob, 10, 54, 3, '#ece3c2');
      drawBox(context, x + direction * 35, y - 3 + bob, 28, 8, 3, '#7a4e2d');
    } else if (current.range < 160 && heroRole === 'TANK') {
      const shieldX = x + direction * 42;
      drawBox(context, shieldX, y - 30 + bob, 30, 58, 7, '#53666c');
      drawBox(context, shieldX + direction * 3, y - 31 + bob, 20, 42, 4, '#75898d');
      context.fillStyle = current.team === 0 ? '#77e9ff' : '#ff8f79';
      context.fillRect(shieldX - 10, y - 37 + bob, 20, 6);
      drawBox(context, x - direction * 29, y - 24 + bob, 18, 27, 5, '#354247');
    } else if (current.range < 160) {
      drawBox(context, x + direction * 30, y - 29 + bob, 24, 15, 4, '#405159');
      drawBox(context, x + direction * 54, y - 31 + bob, 46, 10, 4, '#8ea6aa');
      context.fillStyle = current.team === 0 ? '#8ef1ff' : '#ff9b80';
      context.fillRect(direction > 0 ? x + 52 : x - 72, y - 34 + bob, 20, 4);
    } else {
      drawBox(context, x + direction * 43, y - 36 + bob, 62, 10, 4, era === 'medieval' ? '#6c452b' : '#29343b');
    }
    drawHealth(context, current, x, y - 105);
    if (current.id === 'player') {
      context.strokeStyle = '#d3ff56';
      context.lineWidth = 4;
      context.beginPath();
      context.ellipse(x, y + 22, 35, 17, 0, 0, Math.PI * 2);
      context.stroke();
    }
  } else {
    if (current.type === 'ranged') {
      drawRangedUnit(context, current, era, x, y);
      context.restore();
      return;
    }
    drawMeleeUnit(context, current, era, x, y);
  }
  context.restore();
}

function spawnProjectile(runtime: Runtime, source: Unit, targetX: number, targetY: number, damage = source.damage, color = source.color, speed = 480, projectileStyle: ProjectileStyle = 'energy', targetId?: string) {
  const length = Math.max(1, Math.hypot(targetX - source.x, targetY - source.y));
  runtime.units.push(unit({ id: `p-${Math.random()}`, type: 'projectile', team: source.team, lane: source.lane, x: source.x, y: source.y - 8, hp: 1, maxHp: 1, speed, damage, range: 0, radius: 7, color, vx: (targetX - source.x) / length * speed, vy: (targetY - source.y) / length * speed, life: targetId ? 3 : 1.5, targetId, projectileStyle }));
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

    const viewWidth = () => VIEW_WIDTH / runtime.camera.zoom;
    const viewHeight = () => viewWidth() * canvas.height / canvas.width;
    const cameraLeft = () => runtime.camera.x - viewWidth() / 2;
    const cameraTop = () => runtime.camera.y - viewHeight() / 2;

    const point = (event: MouseEvent) => {
      const bounds = canvas.getBoundingClientRect();
      runtime.aim.x = Math.max(0, Math.min(WORLD.width, cameraLeft() + (event.clientX - bounds.left) / bounds.width * viewWidth()));
      runtime.aim.y = Math.max(0, Math.min(WORLD.height, cameraTop() + (event.clientY - bounds.top) / bounds.height * viewHeight()));
    };

    const setZoom = (nextZoom: number) => {
      runtime.camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
      runtime.camera.x = Math.max(viewWidth() / 2, Math.min(WORLD.width - viewWidth() / 2, runtime.camera.x));
      runtime.camera.y = Math.max(viewHeight() / 2, Math.min(WORLD.height - viewHeight() / 2, runtime.camera.y));
    };

    const zoomWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom(runtime.camera.zoom * (event.deltaY > 0 ? .9 : 1.1));
      point(event);
    };

    const ring = (x: number, y: number, radius: number, color: string, team: Team = 0) => runtime.units.push(unit({ id: `fx-${Math.random()}`, type: 'effect', team, lane: 1, x, y, hp: 1, maxHp: 1, radius, color, life: .65 }));

    const mercenariesFor = (camp: MercenaryCamp) => camp.unitIds.map((id) => runtime.units.find((current) => current.id === id)).filter((current): current is Unit => Boolean(current));

    const restoreMercenary = (current: Unit, team: Faction) => {
      current.dead = false;
      current.hp = current.maxHp;
      current.team = team;
      current.captured = team !== 2;
      current.color = team === 2 ? MERCENARY_NEUTRAL_COLOR : team === 0 ? map.team0 : map.team1;
      current.x = current.homeX ?? current.x;
      current.y = current.homeY ?? current.y;
      current.renderX = current.x;
      current.renderY = current.y;
      current.targetId = undefined;
      current.attackWait = 0;
    };

    const recruitMercenary = (current: Unit, camp: MercenaryCamp, team: Team) => {
      camp.owner = team;
      camp.respawnAt = 0;
      current.dead = false;
      current.hp = current.maxHp;
      current.team = team;
      current.captured = true;
      current.color = team === 0 ? map.team0 : map.team1;
      current.targetId = undefined;
      current.attackWait = 0;
      ring(current.x, current.y, 68, current.color, team);
    };

    const resetMercenaryCamp = (camp: MercenaryCamp) => {
      camp.owner = null;
      camp.respawnAt = 0;
      mercenariesFor(camp).forEach((current) => restoreMercenary(current, 2));
      ring(camp.x, camp.y, camp.radius, MERCENARY_NEUTRAL_COLOR);
    };

    const kill = (target: Unit, killer: Faction) => {
      if (target.dead) return;
      target.dead = true;
      target.hp = 0;
      if (target.type === 'tower' && killer !== 2) runtime.siegeLanes[killer].add(target.lane);
      const xp = target.type === 'hero' ? 90 : target.type === 'siege' ? 35 : target.type === 'mercenary' ? 30 : target.type === 'tower' ? 120 : target.type === 'core' || target.type === 'summon' ? 0 : 18;
      if (killer !== 2) runtime.teamXp[killer] += xp;
      if (target.type === 'hero') {
        if (killer !== 2) runtime.kills[killer]++;
        target.respawn = 5;
        if (target.id === 'player') runtime.pendingAbility = undefined;
      } else if (target.type === 'core' && killer !== 2) {
        runtime.outcome = killer === 0 ? 'VICTORY' : 'DEFEAT';
        runtime.running = false;
        onOutcome(runtime.outcome);
      } else if (target.type === 'mercenary') {
        const camp = runtime.mercenaryCamps.find((candidate) => candidate.id === target.campId);
        if (camp && !target.captured && killer !== 2) recruitMercenary(target, camp, killer);
        else if (camp && target.captured && mercenariesFor(camp).every((current) => current.captured && current.dead)) {
          camp.owner = null;
          camp.respawnAt = runtime.elapsed + MERCENARY_RESPAWN_SECONDS;
        }
      }
    };

    const hit = (target: Unit, amount: number, team: Faction) => {
      if (target.dead) return;
      const armorMultiplier = 100 / (100 + Math.max(0, target.armor || 0));
      target.hp -= amount * armorMultiplier;
      if (target.hp <= 0) kill(target, team);
    };

    const nearestEnemy = (source: Unit, maximum: number, laneLocked = false) => {
      let best: Unit | undefined;
      let bestDistance = maximum;
      for (const candidate of runtime.units) {
        if (candidate.team === source.team || candidate.dead || candidate.type === 'projectile' || candidate.type === 'effect') continue;
        if (candidate.team === 2 && source.id !== 'player') continue;
        if (laneLocked && candidate.type !== 'core' && candidate.lane !== source.lane) continue;
        const currentDistance = distance(source, candidate);
        if (currentDistance < bestDistance) {
          best = candidate;
          bestDistance = currentDistance;
        }
      }
      return best;
    };

    const nearestEnemyHero = (source: Unit, maximum: number) => {
      let best: Unit | undefined;
      let bestDistance = maximum;
      for (const candidate of runtime.units) {
        if (candidate.type !== 'hero' || candidate.team === source.team || candidate.dead) continue;
        const currentDistance = distance(source, candidate);
        if (currentDistance < bestDistance) {
          best = candidate;
          bestDistance = currentDistance;
        }
      }
      return best;
    };

    const nearestMercenaryEnemy = (source: Unit) => {
      const camp = runtime.mercenaryCamps.find((candidate) => candidate.id === source.campId);
      if (!camp) return undefined;
      let best: Unit | undefined;
      let bestDistance = camp.radius * 2 + source.range;
      for (const candidate of runtime.units) {
        if (candidate.type !== 'hero' || candidate.team === 2 || candidate.dead || distance(candidate, camp) > camp.radius) continue;
        const currentDistance = distance(source, candidate);
        if (currentDistance < bestDistance) {
          best = candidate;
          bestDistance = currentDistance;
        }
      }
      source.targetId = best?.id;
      return best;
    };

    const trackedEnemy = (source: Unit, maximum: number, laneLocked = false) => {
      const tracked = runtime.units.find((candidate) => candidate.id === source.targetId && !candidate.dead && candidate.team !== source.team);
      if (tracked && distance(source, tracked) <= maximum * 1.35) return tracked;
      const next = nearestEnemy(source, maximum, laneLocked);
      source.targetId = next?.id;
      return next;
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
      const player = runtime.units.find((current) => current.id === 'player');
      const destination = player ? navigableDestination(runtime.aim.x, runtime.aim.y, player.radius, player) : runtime.aim;
      runtime.command = { mode, x: destination.x, y: destination.y, targetId, marker: .8 };
      runtime.attackPrimed = false;
      if (player) player.targetId = mode === 'attackTarget' ? targetId : undefined;
    };

    const abilityTargetPoint = (player: Unit, ability: AbilityOption) => {
      const dx = runtime.aim.x - player.x;
      const dy = runtime.aim.y - player.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / length;
      const ny = dy / length;
      if (ability.effect === 'dash') {
        const travel = Math.min(Math.hypot(dx, dy), abilityMaximumRange(ability, heroRef.current));
        const destination = navigableDestination(player.x + nx * travel, player.y + ny * travel, player.radius, player);
        return { x: destination.x, y: destination.y, nx, ny };
      }
      if (ability.effect === 'blast' || ability.effect === 'blastStrong' || ability.effect === 'summon') {
        const castRange = abilityMaximumRange(ability, heroRef.current);
        const travel = Math.min(length, castRange);
        const x = player.x + nx * travel;
        const y = player.y + ny * travel;
        if (ability.effect === 'summon') {
          const destination = navigableDestination(x, y, 30, player);
          return { x: destination.x, y: destination.y, nx, ny };
        }
        return { x, y, nx, ny };
      }
      return { x: runtime.aim.x, y: runtime.aim.y, nx, ny };
    };

    const mouseDown = (event: MouseEvent) => {
      point(event);
      if (event.button === 2) {
        event.preventDefault();
        issueCommand('move');
        return;
      }
      if (event.button === 0 && runtime.pendingAbility) {
        const pendingAbility = runtime.pendingAbility;
        cast(pendingAbility);
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
      if (!player || player.dead || !ability || runtime.cooldowns[key] > 0 || runtime.outcome) {
        runtime.pendingAbility = undefined;
        return;
      }
      if (ability.kind === 'passive' || ability.kind === 'stat') {
        runtime.pendingAbility = undefined;
        return;
      }
      const selectedHero = heroRef.current;
      const multiplier = player.abilityPower || 1;
      const targetPoint = abilityTargetPoint(player, ability);
      const dx = targetPoint.x - player.x;
      const dy = targetPoint.y - player.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / length;
      const ny = dy / length;
      runtime.pendingAbility = undefined;
      runtime.cooldowns[key] = ABILITY_COOLDOWNS[abilityIndex] / (player.haste || 1);
      const enemiesNear=(x:number,y:number,radius:number)=>runtime.units.filter((current)=>current.team!==0&&!current.dead&&current.type!=='projectile'&&current.type!=='effect'&&Math.hypot(current.x-x,current.y-y)<radius);
      if (ability.effect === 'dash') {
        player.x = Math.max(40, Math.min(WORLD.width - 40, targetPoint.x));
        player.y = Math.max(60, Math.min(WORLD.height - 60, targetPoint.y));
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
        ring(targetPoint.x,targetPoint.y,radius,selectedHero.accent);
        enemiesNear(targetPoint.x,targetPoint.y,radius+10).forEach((current)=>hit(current,selectedHero.power*damage*multiplier,0));
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
      } else if (ability.effect === 'summon') {
        const summonStyle = ability.summonStyle || 'guardian';
        const stationary = summonStyle === 'rift' || summonStyle === 'ward' || summonStyle === 'turret';
        const centerX = stationary ? Math.max(45, Math.min(WORLD.width - 45, targetPoint.x)) : player.x;
        const centerY = stationary ? Math.max(60, Math.min(WORLD.height - 60, targetPoint.y)) : player.y;
        const count = summonStyle === 'drone' ? 2 : 1;
        const stats = summonStyle === 'guardian'
          ? { hp: 720, speed: 205, damage: selectedHero.power * .62, range: 96, radius: 29, attackSpeed: .9, duration: 26 }
          : summonStyle === 'drone'
            ? { hp: 210, speed: 265, damage: selectedHero.power * .48, range: 310, radius: 15, attackSpeed: 1.2, duration: 22 }
            : summonStyle === 'rift'
              ? { hp: 420, speed: 0, damage: selectedHero.power * .72, range: 175, radius: 25, attackSpeed: 1, duration: 20 }
              : summonStyle === 'ward'
                ? { hp: 460, speed: 0, damage: 0, range: 190, radius: 24, attackSpeed: 1, duration: 22 }
                : { hp: 520, speed: 0, damage: selectedHero.power * .78, range: 440, radius: 27, attackSpeed: .82, duration: 24 };
        Array.from({length:count},(_,index)=>index).forEach((index) => runtime.units.push(unit({
          id: `summon-${runtime.elapsed}-${index}`,
          type: 'summon',
          team: 0,
          lane: player.lane,
          x: centerX - ny * (index * 48 - (count - 1) * 24),
          y: centerY + nx * (index * 48 - (count - 1) * 24),
          hp: stats.hp,
          maxHp: stats.hp,
          speed: stats.speed,
          damage: stats.damage,
          range: stats.range,
          radius: stats.radius,
          color: selectedHero.color,
          armor: 8,
          attackSpeed: stats.attackSpeed,
          expiresAt: runtime.elapsed + stats.duration,
          summonStyle,
          summonSlot:index,
        })));
        ring(centerX, centerY, stationary ? stats.range : 82, selectedHero.accent);
      }
    };

    const activateAbility = (key: AbilityKey) => {
      const player = runtime.units.find((current) => current.id === 'player');
      const abilityIndex = ABILITY_BAR_KEYS.indexOf(key);
      const ability = selectedAbilitiesRef.current[abilityIndex];
      if (!player || player.dead || !ability || runtime.cooldowns[key] > 0 || runtime.outcome) return;
      if (ability.kind === 'passive' || ability.kind === 'stat') {
        runtime.pendingAbility = undefined;
        return;
      }
      if (!abilityRequiresAim(ability)) {
        runtime.pendingAbility = undefined;
        runtime.attackPrimed = false;
        cast(key);
        return;
      }
      runtime.pendingAbility = runtime.pendingAbility === key ? undefined : key;
      runtime.attackPrimed = false;
    };

    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['a', ...ABILITY_BAR_KEYS].includes(key)) event.preventDefault();
      if (key === 'a' && !event.repeat) {
        runtime.pendingAbility = undefined;
        runtime.attackPrimed = true;
      }
      if (key === 'escape') {
        runtime.attackPrimed = false;
        runtime.pendingAbility = undefined;
      }
      if (!event.repeat && ABILITY_BAR_KEYS.includes(key as AbilityKey)) activateAbility(key as AbilityKey);
    };

    const spawnWave = (team: Team) => {
      const direction = team === 0 ? 1 : -1;
      const startX = MINION_SPAWN_X[team];
      LANE_Y.forEach((_laneY, laneIndex) => {
        const lane = laneIndex as Lane;
        const includeSiege = runtime.wave % 3 === 0 && runtime.siegeLanes[team].has(lane);
        const types: UnitType[] = ['melee', 'melee', 'melee', 'melee', 'ranged', 'ranged', 'ranged', ...(includeSiege ? ['siege' as UnitType] : [])];
        types.forEach((type, index) => {
          const health = type === 'siege' ? 920 : type === 'melee' ? 430 : 310;
          const column = index % 4;
          const row = Math.floor(index / 4);
          runtime.units.push(unit({
            id: `m-${team}-${runtime.wave}-${lane}-${index}`,
            type,
            team,
            lane,
            x: startX - direction * column * 25,
            y: LANE_Y[1] + (lane - 1) * 38 + (row * 18 - 9),
            hp: health,
            maxHp: health,
            speed: type === 'siege' ? 66 : 86,
            damage: type === 'siege' ? 54 : type === 'melee' ? 25 : 30,
            range: type === 'siege' ? 360 : type === 'melee' ? 62 : 260,
            radius: type === 'siege' ? 36 : 21,
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
      moveWithTerrainCollision(current, dx / length * travel, dy / length * travel);
      return Math.hypot(targetX - current.x, targetY - current.y) <= stoppingDistance + 1;
    };

    const attack = (source: Unit, target: Unit, delta: number, canMove = true) => {
      source.attackWait = Math.max(0, source.attackWait - delta);
      const currentDistance = distance(source, target);
      if (currentDistance > source.range) {
        if (canMove) moveToward(source, target.x, target.y, delta, Math.max(0, source.range - 8));
        return;
      }
      if (source.attackWait > 0) return;
      const damage = source.damage;
      if (source.type === 'tower' || source.type === 'core' || source.type === 'ranged' || source.type === 'siege' || ((source.type === 'hero' || source.type === 'summon') && source.range >= 160)) {
        const projectileStyle: ProjectileStyle = source.type === 'ranged'
          ? eraRef.current === 'medieval' ? 'arrow' : 'bullet'
          : source.type === 'siege'
            ? eraRef.current === 'medieval' ? 'stone' : 'rocket'
            : 'energy';
        spawnProjectile(runtime, source, target.x, target.y, damage, source.color, source.type === 'tower' || source.type === 'core' ? 760 : 610, projectileStyle, target.id);
      } else hit(target, damage, source.team);
      const baseDelay = source.type === 'hero' ? heroAttackDelay(source.heroId) : source.type === 'tower' ? .72 : source.type === 'core' ? .62 : source.type === 'siege' ? 1.65 : source.type === 'mercenary' ? 1.2 : source.type === 'summon' ? .8 : .92;
      source.attackWait = baseDelay / (source.attackSpeed || 1);
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
      const nextLevel = runtime.teamLevel[team];
      runtime.units.filter((current) => current.type === 'hero' && current.team === team).forEach((current) => {
        current.maxHp *= 1.025;
        current.hp = Math.min(current.maxHp, current.hp + current.maxHp * .06);
        current.damage *= 1.018;
        current.speed *= 1.004;
        current.armor = (current.armor || 0) + .5;
        if (nextLevel % 3 === 0) current.attackSpeed = (current.attackSpeed || 1) * 1.012;
      });
      if (team === 0) {
        if (ABILITY_MILESTONES.includes(nextLevel as typeof ABILITY_MILESTONES[number])) runtime.pendingAbility = undefined;
        onLevelUp(nextLevel);
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
        const target = trackedEnemy(player, Math.max(330, player.range + 120));
        if (target) attack(player, target, delta);
        else if (moveToward(player, runtime.command.x, runtime.command.y, delta, 5)) runtime.command.mode = 'idle';
        return;
      }
      const nearbyTarget = nearestEnemy(player, Math.max(180, player.range + 45));
      if (nearbyTarget) attack(player, nearbyTarget, delta);
    };

    const updateMercenaryCamps = () => {
      runtime.mercenaryCamps.forEach((camp) => {
        if (camp.respawnAt > 0 && runtime.elapsed >= camp.respawnAt) resetMercenaryCamp(camp);
      });
    };

    const update = (delta: number) => {
      runtime.elapsed += delta;
      runtime.command.marker = Math.max(0, runtime.command.marker - delta);
      (Object.keys(runtime.cooldowns) as Array<keyof typeof runtime.cooldowns>).forEach((key) => { runtime.cooldowns[key] = Math.max(0, runtime.cooldowns[key] - delta); });
      if (runtime.elapsed >= runtime.nextWave) {
        runtime.wave++;
        spawnWave(0);
        spawnWave(1);
        runtime.nextWave = runtime.elapsed + 15;
      }

      updateMercenaryCamps();

      const player = runtime.units.find((current) => current.id === 'player')!;
      if (!player.dead) updatePlayer(player, delta);

      for (const current of [...runtime.units]) {
        if (current.dead) {
          if (current.type === 'hero' && current.respawn !== undefined) {
            current.respawn -= delta;
            if (current.respawn <= 0) {
              current.dead = false;
              current.hp = current.maxHp;
              current.x = current.team === 0 ? HERO_SPAWN_X[0] : HERO_SPAWN_X[1];
              current.y = pointOnLane(current.lane, current.x).y;
              current.renderX = current.x;
              current.renderY = current.y;
              if (current.id === 'player') runtime.command.mode = 'idle';
            }
          }
          continue;
        }
        if (current.type === 'summon' && current.expiresAt !== undefined && runtime.elapsed >= current.expiresAt) {
          current.dead = true;
          ring(current.x, current.y, 45, current.color);
          continue;
        }
        if (current.type === 'effect') {
          current.life = (current.life || 0) - delta;
          if ((current.life || 0) <= 0) current.dead = true;
          continue;
        }
        if (current.type === 'projectile') {
          const lockedTarget = current.targetId ? runtime.units.find((candidate) => candidate.id === current.targetId && !candidate.dead) : undefined;
          if (current.targetId && !lockedTarget) {
            current.dead = true;
            continue;
          }
          if (lockedTarget) {
            const targetDistance = Math.max(1, distance(current, lockedTarget));
            current.vx = (lockedTarget.x - current.x) / targetDistance * current.speed;
            current.vy = (lockedTarget.y - current.y) / targetDistance * current.speed;
          }
          current.x += (current.vx || 0) * delta;
          current.y += (current.vy || 0) * delta;
          current.life = (current.life || 0) - delta;
          const target = lockedTarget && distance(lockedTarget, current) < lockedTarget.radius + current.radius
            ? lockedTarget
            : !current.targetId
              ? runtime.units.find((candidate) => candidate.team !== current.team && !candidate.dead && candidate.type !== 'projectile' && candidate.type !== 'effect' && distance(candidate, current) < candidate.radius + current.radius)
              : undefined;
          if (target) {
            hit(target, current.damage, current.team);
            current.dead = true;
          }
          if ((current.life || 0) <= 0 || current.x < 0 || current.x > WORLD.width || current.y < 0 || current.y > WORLD.height) current.dead = true;
          continue;
        }
        if (current.id === 'player') continue;
        if (current.type === 'mercenary' && !current.captured) {
          const target = nearestMercenaryEnemy(current);
          if (target) attack(current, target, delta);
          else {
            current.targetId = undefined;
            const homeX = current.homeX ?? current.x;
            const homeY = current.homeY ?? current.y;
            if (Math.hypot(current.x - homeX, current.y - homeY) > 5) moveToward(current, homeX, homeY, delta, 3);
            current.hp = Math.min(current.maxHp, current.hp + current.maxHp * .2 * delta);
          }
          continue;
        }
        if (current.type === 'summon') {
          const style = current.summonStyle || 'guardian';
          if (style === 'rift') {
            current.attackWait = Math.max(0, current.attackWait - delta);
            if (current.attackWait <= 0) {
              runtime.units
                .filter((candidate) => candidate.team !== current.team && candidate.team !== 2 && !candidate.dead && candidate.type !== 'projectile' && candidate.type !== 'effect' && distance(candidate, current) < current.range)
                .forEach((candidate) => hit(candidate, current.damage, current.team));
              ring(current.x, current.y, current.range, current.color, current.team as Team);
              current.attackWait = 1.15;
            }
            continue;
          }
          if (style === 'ward') {
            current.attackWait = Math.max(0, current.attackWait - delta);
            if (current.attackWait <= 0) {
              runtime.units
                .filter((candidate) => candidate.team === current.team && candidate.type === 'hero' && !candidate.dead && distance(candidate, current) < current.range)
                .forEach((candidate) => { candidate.hp = Math.min(candidate.maxHp, candidate.hp + Math.max(38, candidate.maxHp * .045)); });
              ring(current.x, current.y, current.range, current.color, current.team as Team);
              current.attackWait = 1.2;
            }
            continue;
          }
          if (style === 'turret') {
            const target = nearestEnemy(current, current.range);
            if (target) attack(current, target, delta, false);
            else current.attackWait = Math.max(0, current.attackWait - delta);
            continue;
          }
          const playerOwner = runtime.units.find((candidate) => candidate.id === 'player' && !candidate.dead);
          const nearbyTarget = nearestEnemy(current, style === 'drone' ? 340 : 285);
          if (nearbyTarget) attack(current, nearbyTarget, delta, style === 'guardian');
          if (playerOwner && (!nearbyTarget || style === 'drone')) {
            const orbitAngle = runtime.elapsed * (style === 'drone' ? 1.9 : .7) + (current.summonSlot || 0) * Math.PI;
            const orbitRadius = style === 'drone' ? 68 : 48;
            moveToward(current, playerOwner.x + Math.cos(orbitAngle) * orbitRadius, playerOwner.y + Math.sin(orbitAngle) * orbitRadius, delta, 6);
          }
          continue;
        }
        if (current.type === 'tower' || current.type === 'core') {
          const target = nearestEnemy(current, current.range);
          if (target) attack(current, target, delta, false);
          else current.attackWait = Math.max(0, current.attackWait - delta);
          continue;
        }

        current.attackWait = Math.max(0, current.attackWait - delta);
        const laneMinion = current.type === 'melee' || current.type === 'ranged' || current.type === 'siege';
        const awareness = current.type === 'hero'
          ? Math.max(430, current.range + 170)
          : laneMinion
            ? Math.max(340, current.range + 130)
            : 270;
        const target = current.type === 'hero'
          ? nearestEnemy(current, awareness)
          : laneMinion
            ? nearestEnemyHero(current, 340) ?? nearestEnemy(current, awareness)
            : trackedEnemy(current, awareness, true);
        if (current.type === 'hero' || laneMinion) current.targetId = target?.id;
        if (target) attack(current, target, delta);
        else {
          const objective = objectiveFor(current);
          if (objective) {
            const direction = current.team === 0 ? 1 : -1;
            if (Math.abs(current.x - objective.x) > 125) {
              const routeX = Math.max(0, Math.min(WORLD.width, current.x + direction * 115));
              const routePoint = pointOnLane(current.lane, routeX);
              moveToward(current, routePoint.x, routePoint.y, delta, 12);
            } else moveToward(current, objective.x, objective.y, delta, Math.max(0, current.range - 8));
          }
        }
      }

      runtime.units = runtime.units.filter((current) => !current.dead || current.type === 'hero' || current.type === 'core' || current.type === 'mercenary');
      const smoothing = 1 - Math.exp(-delta * 14);
      runtime.units.forEach((current) => {
        current.renderX = (current.renderX ?? current.x) + (current.x - (current.renderX ?? current.x)) * smoothing;
        current.renderY = (current.renderY ?? current.y) + (current.y - (current.renderY ?? current.y)) * smoothing;
      });
      levelTeam(0);
      levelTeam(1);
    };

    const drawAbilityPreview = () => {
      const key = runtime.pendingAbility;
      const player = runtime.units.find((current) => current.id === 'player');
      if (!key || !player || player.dead) return;
      const abilityIndex = ABILITY_BAR_KEYS.indexOf(key);
      const ability = selectedAbilitiesRef.current[abilityIndex];
      if (!ability) return;

      const selectedHero = heroRef.current;
      const targetPoint = abilityTargetPoint(player, ability);
      const angle = Math.atan2(targetPoint.y - player.y, targetPoint.x - player.x);
      const maxRange = abilityMaximumRange(ability, selectedHero);
      const pulse = .82 + Math.sin(runtime.elapsed * 7) * .12;
      context.save();
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = selectedHero.accent;
      context.fillStyle = selectedHero.color;
      context.setLineDash([13, 9]);
      context.lineWidth = 4;
      context.globalAlpha = .86;

      if (ability.effect === 'blast' || ability.effect === 'blastStrong' || ability.effect === 'summon') {
        const radius = ability.effect === 'summon'
          ? ability.summonStyle === 'ward' ? 190 : ability.summonStyle === 'rift' ? 175 : 58
          : ability.effect === 'blastStrong' ? 310 : 235;
        context.strokeStyle = '#ff6259';
        context.globalAlpha = .34;
        context.beginPath();
        context.arc(player.x, player.y, maxRange, 0, Math.PI * 2);
        context.stroke();
        context.strokeStyle = selectedHero.accent;
        context.globalAlpha = .3;
        context.beginPath();
        context.moveTo(player.x, player.y);
        context.lineTo(targetPoint.x, targetPoint.y);
        context.stroke();
        context.fillStyle = '#86f06b';
        context.strokeStyle = '#b9ff9f';
        context.globalAlpha = .2;
        context.beginPath();
        context.arc(targetPoint.x, targetPoint.y, radius, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = pulse;
        context.lineWidth = 6;
        context.beginPath();
        context.arc(targetPoint.x, targetPoint.y, radius, 0, Math.PI * 2);
        context.stroke();
      } else if (ability.effect === 'dash') {
        context.strokeStyle = '#ff6259';
        context.setLineDash([13, 9]);
        context.globalAlpha = .34;
        context.lineWidth = 4;
        context.beginPath();
        context.arc(player.x, player.y, maxRange, 0, Math.PI * 2);
        context.stroke();
        context.strokeStyle = '#9cff7b';
        context.setLineDash([]);
        context.globalAlpha = .18;
        context.lineWidth = 72;
        context.beginPath();
        context.moveTo(player.x, player.y);
        context.lineTo(targetPoint.x, targetPoint.y);
        context.stroke();
        context.globalAlpha = pulse;
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(player.x, player.y);
        context.lineTo(targetPoint.x, targetPoint.y);
        context.stroke();
        context.beginPath();
        context.arc(targetPoint.x, targetPoint.y, 110, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = '#9cff7b';
        context.globalAlpha = .32;
        context.beginPath();
        context.arc(targetPoint.x, targetPoint.y, 34, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = pulse;
        context.lineWidth = 6;
        context.beginPath();
        context.arc(targetPoint.x, targetPoint.y, 34, 0, Math.PI * 2);
        context.stroke();
      } else {
        const rapid = ability.effect === 'rapid';
        const volley = ability.effect === 'volley';
        const count = rapid ? 7 : volley ? 5 : 3;
        const step = rapid ? .055 : volley ? .095 : selectedHero.id === 'rook' ? 0 : .11;
        const range = rapid || volley ? 570 : 520;
        context.setLineDash([]);
        context.globalAlpha = .14;
        context.beginPath();
        context.moveTo(player.x, player.y);
        context.lineTo(player.x + Math.cos(angle - step * Math.max(1, (count - 1) / 2)) * range, player.y + Math.sin(angle - step * Math.max(1, (count - 1) / 2)) * range);
        context.lineTo(player.x + Math.cos(angle + step * Math.max(1, (count - 1) / 2)) * range, player.y + Math.sin(angle + step * Math.max(1, (count - 1) / 2)) * range);
        context.closePath();
        context.fill();
        context.globalAlpha = pulse;
        context.lineWidth = 3;
        for (let index = 0; index < count; index++) {
          const shotAngle = angle + (index - (count - 1) / 2) * step;
          context.beginPath();
          context.moveTo(player.x, player.y);
          context.lineTo(player.x + Math.cos(shotAngle) * range, player.y + Math.sin(shotAngle) * range);
          context.stroke();
        }
        const spreadHalfAngle = Math.max(.07, step * Math.max(1, (count - 1) / 2));
        context.strokeStyle = '#ff6259';
        context.globalAlpha = .38;
        context.setLineDash([10, 8]);
        context.lineWidth = 4;
        context.beginPath();
        context.arc(player.x, player.y, range, angle - spreadHalfAngle, angle + spreadHalfAngle);
        context.stroke();
      }

      context.setLineDash([]);
      context.globalAlpha = 1;
      context.fillStyle = '#f7fff2';
      context.font = '900 15px monospace';
      context.textAlign = 'center';
      context.fillText(`${key.toUpperCase()} · LEFT-CLICK TO CAST`, targetPoint.x, targetPoint.y - 32);
      context.restore();
    };

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const visibleHeight = viewHeight();
      const visibleWidth = viewWidth();
      const left = cameraLeft();
      const top = cameraTop();
      const scale = width / visibleWidth;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = false;
      context.setTransform(scale, 0, 0, scale, -left * scale, -top * scale);
      context.fillStyle = map.ground;
      context.fillRect(0, 0, WORLD.width, WORLD.height);
      const tile = 120;
      const tileLeft = Math.max(0, Math.floor(left / tile) * tile);
      const tileTop = Math.max(0, Math.floor(top / tile) * tile);
      for (let y = tileTop; y < Math.min(WORLD.height, top + visibleHeight + tile); y += tile) for (let x = tileLeft; x < Math.min(WORLD.width, left + visibleWidth + tile); x += tile) {
        context.fillStyle = (x / tile + y / tile) % 2 === 0 ? map.ground2 : map.ground;
        context.globalAlpha = .18;
        context.fillRect(x, y, tile, tile);
      }
      context.globalAlpha = 1;

      context.fillStyle = map.river;
      context.fillRect(WORLD.width / 2 - 55, 0, 110, WORLD.height);
      context.fillStyle = eraRef.current === 'medieval' ? '#6f6a54' : '#273337';
      context.fillRect(0, 0, 360, WORLD.height);
      context.fillRect(WORLD.width - 360, 0, 360, WORLD.height);

      context.lineCap = 'round';
      context.lineJoin = 'round';
      ROTATION_PATHS.forEach((path) => {
        context.strokeStyle = shade(map.lane, -25);
        context.lineWidth = 172;
        traceWorldPath(context, path);
        context.stroke();
        context.strokeStyle = shade(map.lane, -8);
        context.lineWidth = 136;
        traceWorldPath(context, path);
        context.stroke();
      });

      ([0, 1, 2] as Lane[]).forEach((lane) => {
        const path = LANE_PATHS[lane];
        context.strokeStyle = shade(map.lane, -14);
        context.lineWidth = (LANE_HALF_WIDTH + 14) * 2;
        traceWorldPath(context, path);
        context.stroke();
        context.strokeStyle = map.lane;
        context.lineWidth = LANE_HALF_WIDTH * 2;
        traceWorldPath(context, path);
        context.stroke();
        context.strokeStyle = eraRef.current === 'modern' ? '#d7ffff38' : '#fff3c833';
        context.lineWidth = 3;
        context.setLineDash(eraRef.current === 'modern' ? [28, 24] : [8, 28]);
        traceWorldPath(context, path);
        context.stroke();
        context.setLineDash([]);
        const labelPoint = pointOnLane(lane, WORLD.width / 2);
        context.fillStyle = '#10150f55';
        context.font = '800 16px monospace';
        context.textAlign = 'center';
        context.fillText(`${LANE_NAMES[lane]} LANE`, labelPoint.x, labelPoint.y - LANE_HALF_WIDTH - 25);
      });

      TERRAIN_OBSTACLES.filter((obstacle) => obstacle.x > left - 90 && obstacle.x < left + visibleWidth + 90 && obstacle.y > top - 110 && obstacle.y < top + visibleHeight + 110).forEach((obstacle) => {
        const { x, y: treeY, variant } = obstacle;
        if (eraRef.current === 'medieval') {
          drawBox(context, x, treeY + 25, 24, 62, 7, '#65452d');
          drawBox(context, x, treeY - 25, 68, 72, 13, variant ? '#3e6d39' : '#527d42');
        } else {
          drawBox(context, x, treeY + 10, 58, 92, 12, variant ? '#39454a' : '#4c5b5d');
          context.fillStyle = '#5ee6ef55';
          context.fillRect(x - 18, treeY - 24, 36, 5);
        }
      });

      runtime.mercenaryCamps.forEach((camp) => {
        const color = camp.owner === null ? MERCENARY_NEUTRAL_COLOR : camp.owner === 0 ? map.team0 : map.team1;
        const respawning = camp.respawnAt > runtime.elapsed;
        const available = mercenariesFor(camp).filter((current) => !current.captured && !current.dead).length;
        const active = mercenariesFor(camp).filter((current) => current.captured && !current.dead).length;
        context.fillStyle = '#16140f70';
        context.beginPath();
        context.ellipse(camp.x, camp.y + 20, camp.radius, camp.radius * .56, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = color;
        context.lineWidth = 5;
        context.setLineDash([16, 12]);
        context.beginPath();
        context.arc(camp.x, camp.y, camp.radius, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
        drawBox(context, camp.x, camp.y + 42, 96, 23, 7, shade(color, -28));
        context.fillStyle = '#f5f0df';
        context.font = '900 14px monospace';
        context.textAlign = 'center';
        const campLabel = respawning
          ? `RETURNS IN ${Math.ceil(camp.respawnAt - runtime.elapsed)}s`
          : available > 0
            ? `${available} MERCENAR${available === 1 ? 'Y' : 'IES'} READY TO RECRUIT`
            : `${camp.owner === 0 ? 'ALLIED' : 'ENEMY'} CONTRACT · ${active} ACTIVE`;
        context.fillText(campLabel, camp.x, camp.y + camp.radius + 28);
      });

      drawAbilityPreview();

      [...runtime.units].sort((a, b) => (a.renderY ?? a.y) - (b.renderY ?? b.y)).forEach((current) => { if (!current.dead) drawUnit(context, current, eraRef.current, runtime.elapsed); });

      if (runtime.command.marker > 0) {
        const x = runtime.command.x;
        const y = runtime.command.y;
        context.globalAlpha = Math.min(1, runtime.command.marker * 2);
        context.strokeStyle = runtime.command.mode === 'move' ? '#d3ff56' : '#ff695c';
        context.lineWidth = 6;
        context.beginPath();
        context.ellipse(x, y, 27, 14, 0, 0, Math.PI * 2);
        context.stroke();
        if (runtime.command.mode !== 'move') {
          context.beginPath();
          context.moveTo(x - 18, y - 18);
          context.lineTo(x + 18, y + 18);
          context.moveTo(x + 18, y - 18);
          context.lineTo(x - 18, y + 18);
          context.stroke();
        }
        context.globalAlpha = 1;
      }

      if (runtime.attackPrimed) {
        const x = runtime.aim.x;
        const y = runtime.aim.y;
        context.strokeStyle = '#ff695c';
        context.lineWidth = 4;
        context.strokeRect(x - 18, y - 18, 36, 36);
      }
      context.setTransform(1, 0, 0, 1, 0, 0);
    };

    let hudWait = 0;
    const frame = (now: number) => {
      const delta = Math.min(.033, (now - runtime.last) / 1000);
      runtime.last = now;
      if (runtime.running) update(delta);
      const player = runtime.units.find((current) => current.id === 'player')!;
      const cameraTargetX = Math.max(viewWidth() / 2, Math.min(WORLD.width - viewWidth() / 2, player.renderX ?? player.x));
      const cameraTargetY = Math.max(viewHeight() / 2, Math.min(WORLD.height - viewHeight() / 2, player.renderY ?? player.y));
      const cameraFollow = 1 - Math.exp(-delta * 5.5);
      runtime.camera.x += (cameraTargetX - runtime.camera.x) * cameraFollow;
      runtime.camera.y += (cameraTargetY - runtime.camera.y) * cameraFollow;
      render();
      hudWait -= delta;
      if (hudWait <= 0) {
        hudWait = .12;
        const mapUnits = runtime.units.filter((current) => !current.dead && current.type !== 'projectile' && current.type !== 'effect').map((current) => ({ id: current.id, type: current.type, team: current.team, x: current.x, y: current.y }));
        const mapCamps = runtime.mercenaryCamps.map(({ id, owner, x, y, respawnAt }) => ({ id, owner, x, y, respawning: respawnAt > runtime.elapsed }));
        const aimingAbility = runtime.pendingAbility ? { key: runtime.pendingAbility, name: selectedAbilitiesRef.current[ABILITY_BAR_KEYS.indexOf(runtime.pendingAbility)]?.name ?? runtime.pendingAbility.toUpperCase() } : null;
        onHud({ hp: player.hp, maxHp: player.maxHp, xp: [...runtime.teamXp] as [number, number], need: [xpNeeded(runtime.teamLevel[0]),xpNeeded(runtime.teamLevel[1])], level: [...runtime.teamLevel] as [number, number], kills: [...runtime.kills] as [number, number], time: runtime.elapsed, cooldowns: { ...runtime.cooldowns }, wave: runtime.wave, command: aimingAbility ? 'abilityTargeting' : runtime.attackPrimed ? 'primed' : runtime.command.mode, aimingAbility, mapUnits, mapCamps, camera: { ...runtime.camera } });
      }
      if (runtime.running || runtime.outcome) requestAnimationFrame(frame);
    };

    const applyAbilityChoice = (event: Event) => {
      const player = runtime.units.find((current) => current.id === 'player');
      const choice = (event as CustomEvent<{ choice: AbilityOption }>).detail?.choice;
      if (!player || !choice) return;
      if (choice.effect === 'reinforce') {
        const healthGain = player.maxHp * .08;
        player.maxHp += healthGain;
        player.hp = Math.min(player.maxHp, player.hp + healthGain);
        player.armor = (player.armor || 0) + 4;
      } else if (choice.effect === 'tempo') {
        player.attackSpeed = (player.attackSpeed || 1) * 1.1;
        player.speed *= 1.04;
      } else if (choice.effect === 'reflow') {
        player.haste = (player.haste || 1) * 1.12;
      }
    };

    const zoomFromHud = (event: Event) => {
      const factor = (event as CustomEvent<{ factor: number }>).detail?.factor;
      if (factor) setZoom(runtime.camera.zoom * factor);
    };

    const preventContextMenu = (event: MouseEvent) => event.preventDefault();

    window.addEventListener('keydown', keyDown);
    window.addEventListener('blockbound-ability-selected',applyAbilityChoice);
    window.addEventListener('blockbound-zoom',zoomFromHud);
    canvas.addEventListener('mousemove', point);
    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('wheel', zoomWheel, { passive: false });
    canvas.addEventListener('contextmenu', preventContextMenu);
    requestAnimationFrame(frame);

    return () => {
      runtime.running = false;
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('blockbound-ability-selected',applyAbilityChoice);
      window.removeEventListener('blockbound-zoom',zoomFromHud);
      canvas.removeEventListener('mousemove', point);
      canvas.removeEventListener('mousedown', mouseDown);
      canvas.removeEventListener('wheel', zoomWheel);
      canvas.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [onHud,onLevelUp,onOutcome]);

  return <canvas ref={canvasRef} width={1280} height={720} className="battleCanvas" aria-label="Playable three-lane Blockbound Arena battlefield" />;
}

function Minimap({ units, camps, camera }: { units: MapUnit[]; camps: MapCamp[]; camera: { x: number; y: number; zoom: number } }) {
  const viewportWidth = VIEW_WIDTH / camera.zoom;
  const viewportHeight = viewportWidth * 9 / 16;
  return <div className="minimap" aria-label="Battlefield minimap">
    <i className="mapRiver" />
    <svg className="mapPaths" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} preserveAspectRatio="none" aria-hidden="true">
      {([0, 1, 2] as Lane[]).map((lane) => <path key={lane} className="mapPath" d={minimapPath(lane)} />)}
    </svg>
    {camps.map((camp) => <i key={camp.id} className={`mapCamp ${camp.respawning ? 'mapCampRespawning' : ''} ${camp.owner === null ? 'mapNeutralUnit' : camp.owner === 0 ? 'mapBlue' : 'mapRed'}`} style={{ left: `${camp.x / WORLD.width * 100}%`, top: `${camp.y / WORLD.height * 100}%` }} />)}
    {units.map((current) => <i
      key={current.id}
      className={`mapUnit map${current.type[0].toUpperCase()}${current.type.slice(1)} ${current.team === 2 ? 'mapNeutralUnit' : current.team === 0 ? 'mapBlue' : 'mapRed'} ${current.id === 'player' ? 'mapPlayer' : ''}`}
      style={{ left: `${current.x / WORLD.width * 100}%`, top: `${current.y / WORLD.height * 100}%` }}
    />)}
    <i className="mapViewport" style={{ left: `${(camera.x - viewportWidth / 2) / WORLD.width * 100}%`, top: `${(camera.y - viewportHeight / 2) / WORLD.height * 100}%`, width: `${viewportWidth / WORLD.width * 100}%`, height: `${viewportHeight / WORLD.height * 100}%` }} />
  </div>;
}

export function Battle({ hero, era, onExit }: { hero: Hero; era: Era; onExit: () => void }) {
  const abilityTiers=useMemo(()=>getAbilityTiers(hero),[hero]);
  const [selectedAbilities,setSelectedAbilities]=useState<AbilityLoadout>(()=>[abilityTiers[0].choices[0],null,null,null,null]);
  const [choiceQueue,setChoiceQueue]=useState<number[]>([]);
  const [levelNotice,setLevelNotice]=useState<number|null>(null);
  const noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [hud, setHud] = useState<Hud>({ hp: hero.hp, maxHp: hero.hp, xp: [0, 0], need: [xpNeeded(1),xpNeeded(1)], level: [1, 1], kills: [0, 0], time: 0, cooldowns: { q: 0, w: 0, e: 0, r: 0, t: 0 }, wave: 0, command: 'idle', aimingAbility: null, mapUnits: [], mapCamps: [], camera: { x: VIEW_WIDTH / 2, y: LANE_Y[1], zoom: 1 } });
  const [outcome, setOutcome] = useState<'' | 'VICTORY' | 'DEFEAT'>('');
  const [tip, setTip] = useState(true);
  const gameKey = useMemo(() => `${hero.id}-${era}`, [hero.id, era]);
  const handleLevelUp=useCallback((level:number)=>{
    setLevelNotice(level);
    if(noticeTimer.current)clearTimeout(noticeTimer.current);
    noticeTimer.current=setTimeout(()=>setLevelNotice(null),2600);
    if(ABILITY_MILESTONES.includes(level as typeof ABILITY_MILESTONES[number]))setChoiceQueue(current=>current.includes(level)?current:[...current,level]);
  },[]);
  const handleOutcome = useCallback((result: 'VICTORY' | 'DEFEAT') => setOutcome(result), []);
  const handleHud = useCallback((nextHud: Hud) => setHud(nextHud), []);
  const chooseAbility=(selected:AbilityOption)=>{
    const choiceLevel=choiceQueue[0];
    const slot=abilityTiers.findIndex(tier=>tier.level===choiceLevel);
    if(slot<0)return;
    setSelectedAbilities(current=>current.map((ability,index)=>index===slot?selected:ability));
    setChoiceQueue(current=>current.slice(1));
    window.dispatchEvent(new CustomEvent('blockbound-ability-selected',{detail:{choice:selected}}));
  };
  const zoomCamera=(factor:number)=>window.dispatchEvent(new CustomEvent('blockbound-zoom',{detail:{factor}}));

  useEffect(() => {
    const timer = setTimeout(() => setTip(false), 9000);
    return () => {clearTimeout(timer);if(noticeTimer.current)clearTimeout(noticeTimer.current);};
  }, []);

  const commandLabel = hud.command === 'abilityTargeting' ? `${hud.aimingAbility?.name ?? 'ABILITY'} · LEFT-CLICK TO CAST · RIGHT-CLICK TO MOVE` : hud.command === 'primed' ? 'SELECT ATTACK DESTINATION' : hud.command === 'attackMove' ? 'ATTACK-MOVING' : hud.command === 'attackTarget' ? 'FOCUSING TARGET' : hud.command === 'move' ? 'MOVING' : 'AWAITING COMMAND';
  const choiceTier=abilityTiers.find(tier=>tier.level===choiceQueue[0]);
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
      <div className={`commandModeTag ${hud.command === 'primed' ? 'commandPrimed' : ''} ${hud.command === 'abilityTargeting' ? 'commandAbility' : ''}`}>{commandLabel}</div>
      {tip && <div className="controlTip"><button onClick={() => setTip(false)}>×</button><b><kbd>RIGHT-CLICK</kbd> TO MOVE · <kbd>SCROLL</kbd> TO ZOOM</b><span>Neutral mercenaries fight back and join your side when defeated. Aimed abilities preview before left-click; self-cast abilities fire immediately.</span></div>}
      {levelNotice!==null&&<div className={`levelNotice ${noticeIsMilestone?'specialLevel':''}`}><small>TEAM LEVEL</small><b>{levelNotice}</b><span>{noticeIsMilestone?'ABILITY CHOICE AVAILABLE':'COMBAT STATS INCREASED'}</span></div>}
      {choiceTier&&<div className="abilityChoicePanel"><p>LEVEL {choiceTier.level} · <kbd>{choiceTier.key.toUpperCase()}</kbd> SLOT · MATCH STILL LIVE</p><h3>CHOOSE AN ABILITY</h3><span>Pick an active, passive, summon, or stat reward while the battle continues.</span><div>{choiceTier.choices.map(choice=><button key={choice.name} onClick={()=>chooseAbility(choice)}><i>{choice.icon}</i><b>{choice.name}</b><em>{choice.kind}</em><small>{choice.description}</small></button>)}</div></div>}
      {outcome && <div className="outcomeOverlay"><p>{outcome === 'VICTORY' ? 'ENEMY HEART SHATTERED' : 'YOUR HEART HAS FALLEN'}</p><h2>{outcome}</h2><div><span>TEAM LEVEL <b>{hud.level[0]}</b></span><span>TAKEDOWNS <b>{hud.kills[0]}</b></span><span>TIME <b>{formatTime(hud.time)}</b></span></div><button onClick={onExit}>RETURN TO HQ</button></div>}
    </div>
    <footer className="battleHud">
      <div className="playerPanel"><HeroPortrait hero={hero} /><span><small>{hero.role}</small><b>{hero.name}</b><i><b style={{ width: `${Math.max(0, hud.hp / hud.maxHp * 100)}%` }} /></i><em>{Math.ceil(Math.max(0, hud.hp))} / {Math.ceil(hud.maxHp)}</em></span></div>
      <div className="abilities" aria-label="Ability bar">{abilityTiers.map((tier,index)=>{const selected=selectedAbilities[index],cooldown=hud.cooldowns[tier.key],locked=!selected,aiming=hud.aimingAbility?.key===tier.key,isPassive=selected?.kind==='passive'||selected?.kind==='stat';return <div key={tier.level} className={`${cooldown>0?'cooling':''} ${locked?'locked':''} ${aiming?'aiming':''} ${isPassive?'passiveAbility':''}`} aria-label={selected?`${selected.name} ${selected.kind}${aiming?' targeting':''}`:`Ability slot unlocks at level ${tier.level}`}><kbd>{tier.key.toUpperCase()}</kbd><i style={{'--cool':`${Math.min(100,cooldown/ABILITY_COOLDOWNS[index]*100)}%`} as React.CSSProperties}>{locked?`LVL ${tier.level}`:cooldown>0?cooldown.toFixed(1):selected.icon}</i><span>{selected?.name??'Unchosen'}</span></div>})}</div>
      <div className="mapPanel"><div className="zoomControls" aria-label="Camera zoom controls"><button onClick={()=>zoomCamera(1.12)} aria-label="Zoom in">+</button><span>{Math.round(hud.camera.zoom*100)}%</span><button onClick={()=>zoomCamera(.89)} aria-label="Zoom out">−</button></div><Minimap units={hud.mapUnits} camps={hud.mapCamps} camera={hud.camera} /></div>
    </footer>
  </main>;
}
