'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ABILITY_BAR_KEYS, ABILITY_MILESTONES, AbilityKey, AbilityOption, Era, getAbilityTiers, HEROES, Hero, HeroPortrait } from './game';

type Team = 0 | 1;
type Lane = 0 | 1 | 2;
type WorldPoint = { x: number; y: number };
type TerrainObstacle = WorldPoint & { radius: number; variant: number };
type UnitType = 'hero' | 'melee' | 'ranged' | 'siege' | 'tower' | 'core' | 'projectile' | 'effect';
type ProjectileStyle = 'energy' | 'arrow' | 'bullet' | 'stone' | 'rocket';
type CommandMode = 'idle' | 'move' | 'attackMove' | 'attackTarget';
type AbilityLoadout = Array<AbilityOption|null>;
type Objective = {
  id: string;
  x: number;
  y: number;
  owner: Team | null;
  capturing: Team | null;
  progress: number;
};

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
  renderX?: number;
  renderY?: number;
  projectileStyle?: ProjectileStyle;
};

type Runtime = {
  units: Unit[];
  siegeLanes: [Set<Lane>, Set<Lane>];
  objectives: Objective[];
  camera: { x: number; y: number };
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
  teamBuffUntil: [number, number];
  outcome: '' | 'VICTORY' | 'DEFEAT';
};

type MapUnit = { id: string; type: UnitType; team: Team; x: number; y: number };
type MapObjective = { id: string; owner: Team | null; x: number; y: number };
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
  mapObjectives: MapObjective[];
  camera: { x: number; y: number };
  buff: [number, number];
};

const WORLD = { width: 3200, height: 1800 };
const VIEW_WIDTH = 1600;
const LANE_Y: [number, number, number] = [380, 900, 1420];
const LANE_NAMES = ['TOP', 'MIDDLE', 'BOTTOM'];
const LANE_HALF_WIDTH = 128;
const ROTATION_X = [760, 1600, 2440];
const CASTLE_X: [number, number] = [150, 3050];
const MINION_SPAWN_X: [number, number] = [210, 2990];
const ABILITY_COOLDOWNS = [5,8,12,18,28];
const xpNeeded = (level:number)=>200+level*60;

const MAPS = {
  medieval: { name: 'CROWNKEEP', sub: 'MEDIEVAL FRONTIER', ground: '#667e42', ground2: '#7e9250', lane: '#b5a272', river: '#4c91a5', team0: '#3e8fdb', team1: '#da5947' },
  modern: { name: 'NEON DIVIDE', sub: 'MODERN WARZONE', ground: '#303b3e', ground2: '#3f4a4a', lane: '#626d6e', river: '#1d727e', team0: '#24a7dc', team1: '#f35e55' },
};

const LANE_PATHS: Record<Lane, WorldPoint[]> = {
  0: [{ x: 0, y: 900 }, { x: 260, y: 900 }, { x: 480, y: 730 }, { x: 720, y: 430 }, { x: 980, y: 190 }, { x: 1640, y: 230 }, { x: 2260, y: 430 }, { x: 2480, y: 600 }, { x: 2720, y: 900 }, { x: 3200, y: 900 }],
  1: [{ x: 0, y: 900 }, { x: 620, y: 900 }, { x: 1180, y: 820 }, { x: 2020, y: 980 }, { x: 2580, y: 900 }, { x: 3200, y: 900 }],
  2: [{ x: 0, y: 900 }, { x: 260, y: 900 }, { x: 480, y: 1070 }, { x: 720, y: 1370 }, { x: 980, y: 1610 }, { x: 1640, y: 1570 }, { x: 2260, y: 1370 }, { x: 2480, y: 1200 }, { x: 2720, y: 900 }, { x: 3200, y: 900 }],
};

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
for (let y = 100; y < WORLD.height - 80; y += 150) for (let xBase = 360; xBase < 2860; xBase += 150) {
  const x = xBase + ((y / 150) % 2) * 54;
  const point = { x, y };
  const inLane = ([0, 1, 2] as Lane[]).some((lane) => pointPathDistance(point, LANE_PATHS[lane]) < LANE_HALF_WIDTH + 74);
  const inRotation = ROTATION_PATHS.some((path) => pointPathDistance(point, path) < 122);
  const nearRelic = Math.hypot(x - 1600, y - 610) < 165 || Math.hypot(x - 1600, y - 1190) < 165;
  if (!inLane && !inRotation && !nearRelic) TERRAIN_OBSTACLES.push({ x, y, radius: 43, variant: Math.floor(xBase / 150 + y / 150) % 2 });
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
  units.push(unit({ id: 'player', type: 'hero', team: 0, lane: 1, x: 390, y: LANE_Y[1], hp: hero.hp, maxHp: hero.hp, speed: hero.speed, damage: hero.power, range: hero.range, radius: 30, color: hero.color, heroId: hero.id, abilityPower: 1, haste: 1 }));

  const allyIds = ['briar', 'rook', 'forge', 'nyx'];
  const allyLanes: Lane[] = [0, 1, 2, 1];
  allyIds.forEach((id, index) => {
    const h = HEROES.find((candidate) => candidate.id === id)!;
    const lane = allyLanes[index];
    const x = 360 + (index % 2) * 54;
    units.push(unit({ id: `ally-${index}`, type: 'hero', team: 0, lane, x, y: pointOnLane(lane, x).y + (index > 2 ? 42 : -34), hp: h.hp, maxHp: h.hp, speed: h.speed * .88, damage: h.power * .84, range: h.range, radius: 29, color: h.color, heroId: h.id, abilityPower: 1, haste: 1 }));
  });

  const enemyIds = ['bastion', 'volt', 'echo', 'kestrel', 'ember'];
  const enemyLanes: Lane[] = [0, 1, 2, 0, 2];
  enemyIds.forEach((id, index) => {
    const h = HEROES.find((candidate) => candidate.id === id)!;
    const lane = enemyLanes[index];
    const x = 2840 - (index % 2) * 54;
    units.push(unit({ id: `enemy-${index}`, type: 'hero', team: 1, lane, x, y: pointOnLane(lane, x).y + (index > 2 ? 42 : -34), hp: h.hp, maxHp: h.hp, speed: h.speed * .86, damage: h.power * .82, range: h.range, radius: 29, color: h.color, heroId: h.id, abilityPower: 1, haste: 1 }));
  });

  units.push(unit({ id: 'core-0', type: 'core', team: 0, lane: 1, x: CASTLE_X[0], y: LANE_Y[1], hp: 7200, maxHp: 7200, radius: 96, color: map.team0, damage: 185, range: 500 }));
  units.push(unit({ id: 'core-1', type: 'core', team: 1, lane: 1, x: CASTLE_X[1], y: LANE_Y[1], hp: 7200, maxHp: 7200, radius: 96, color: map.team1, damage: 185, range: 500 }));

  LANE_Y.forEach((_y, laneIndex) => {
    const lane = laneIndex as Lane;
    [700, 1180].forEach((x, index) => units.push(unit({ id: `tower-0-${lane}-${index}`, type: 'tower', team: 0, lane, x, y: pointOnLane(lane, x).y, hp: 2400, maxHp: 2400, radius: 48, color: map.team0, damage: 138, range: 430 })));
    [2020, 2500].forEach((x, index) => units.push(unit({ id: `tower-1-${lane}-${index}`, type: 'tower', team: 1, lane, x, y: pointOnLane(lane, x).y, hp: 2400, maxHp: 2400, radius: 48, color: map.team1, damage: 138, range: 430 })));
  });

  return {
    units,
    siegeLanes: [new Set<Lane>(), new Set<Lane>()],
    objectives: [
      { id: 'north-relic', x: 1600, y: 610, owner: null, capturing: null, progress: 0 },
      { id: 'south-relic', x: 1600, y: 1190, owner: null, capturing: null, progress: 0 },
    ],
    camera: { x: VIEW_WIDTH / 2, y: LANE_Y[1] },
    aim: { x: 800, y: LANE_Y[1] },
    command: { mode: 'idle', x: 390, y: LANE_Y[1], marker: 0 },
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
    teamBuffUntil: [0, 0],
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
  const width = current.type === 'core' ? 150 : current.type === 'tower' ? 92 : current.type === 'hero' ? 58 : current.type === 'melee' ? 34 : 40;
  context.fillStyle = '#0d120f';
  context.fillRect(x - width / 2, y, width, 9);
  context.fillStyle = current.team === 0 ? '#51b9ff' : '#ff6558';
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

function drawUnit(context: CanvasRenderingContext2D, current: Unit, era: Era, elapsed: number) {
  const x = current.renderX ?? current.x;
  const y = current.renderY ?? current.y;
  if (current.type === 'projectile') {
    const angle = Math.atan2(current.vy || 0, current.vx || 1);
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    if (current.projectileStyle === 'arrow') {
      context.strokeStyle = '#f1e8ce';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(-15, 0);
      context.lineTo(13, 0);
      context.stroke();
      context.fillStyle = '#b9c1b4';
      context.beginPath();
      context.moveTo(18, 0);
      context.lineTo(9, -5);
      context.lineTo(9, 5);
      context.closePath();
      context.fill();
    } else if (current.projectileStyle === 'stone') {
      drawBox(context, 0, 0, 20, 20, 5, '#7f8878');
    } else if (current.projectileStyle === 'bullet') {
      context.strokeStyle = '#d3ff56';
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(-12, 0);
      context.lineTo(14, 0);
      context.stroke();
    } else if (current.projectileStyle === 'rocket') {
      drawBox(context, 0, 0, 26, 10, 3, '#d9e1dc');
      context.fillStyle = '#d3ff56';
      context.fillRect(-19, -4, 8, 8);
    } else {
      context.shadowColor = current.color;
      context.shadowBlur = 18;
      drawBox(context, 0, 0, 13, 13, 4, current.color);
      context.shadowBlur = 0;
    }
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
    if (current.range < 160) drawBox(context, x + direction * 38, y - 30 + bob, 9, 58, 3, era === 'medieval' ? '#ece3c2' : '#86969c');
    else drawBox(context, x + direction * 43, y - 36 + bob, 62, 10, 4, era === 'medieval' ? '#6c452b' : '#29343b');
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

    const viewHeight = () => VIEW_WIDTH * canvas.height / canvas.width;
    const cameraLeft = () => runtime.camera.x - VIEW_WIDTH / 2;
    const cameraTop = () => runtime.camera.y - viewHeight() / 2;

    const point = (event: MouseEvent) => {
      const bounds = canvas.getBoundingClientRect();
      runtime.aim.x = Math.max(0, Math.min(WORLD.width, cameraLeft() + (event.clientX - bounds.left) / bounds.width * VIEW_WIDTH));
      runtime.aim.y = Math.max(0, Math.min(WORLD.height, cameraTop() + (event.clientY - bounds.top) / bounds.height * viewHeight()));
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
        if (laneLocked && candidate.type !== 'core' && candidate.lane !== source.lane) continue;
        const currentDistance = distance(source, candidate);
        if (currentDistance < bestDistance) {
          best = candidate;
          bestDistance = currentDistance;
        }
      }
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
        player.x = Math.max(40, Math.min(WORLD.width - 40, player.x + nx * leap));
        player.y = Math.max(60, Math.min(WORLD.height - 60, player.y + ny * leap));
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
      const buffMultiplier = runtime.teamBuffUntil[source.team] > runtime.elapsed ? 1.2 : 1;
      const damage = source.damage * buffMultiplier;
      if (source.type === 'tower' || source.type === 'core' || source.type === 'ranged' || source.type === 'siege' || (source.type === 'hero' && source.range >= 160)) {
        const projectileStyle: ProjectileStyle = source.type === 'ranged'
          ? eraRef.current === 'medieval' ? 'arrow' : 'bullet'
          : source.type === 'siege'
            ? eraRef.current === 'medieval' ? 'stone' : 'rocket'
            : 'energy';
        spawnProjectile(runtime, source, target.x, target.y, damage, source.color, source.type === 'tower' || source.type === 'core' ? 760 : 610, projectileStyle, target.id);
      } else hit(target, damage, source.team);
      source.attackWait = source.type === 'hero' ? heroAttackDelay(source.heroId) : source.type === 'tower' ? .72 : source.type === 'core' ? .62 : source.type === 'siege' ? 1.65 : .92;
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
        const target = trackedEnemy(player, Math.max(330, player.range + 120));
        if (target) attack(player, target, delta);
        else if (moveToward(player, runtime.command.x, runtime.command.y, delta, 5)) runtime.command.mode = 'idle';
        return;
      }
      const nearbyTarget = nearestEnemy(player, Math.max(180, player.range + 45));
      if (nearbyTarget) attack(player, nearbyTarget, delta);
    };

    const updateObjectives = (delta: number) => {
      for (const objective of runtime.objectives) {
        const nearby = ([0, 1] as Team[]).map((team) => runtime.units.filter((current) => current.type === 'hero' && current.team === team && !current.dead && distance(current, objective) < 112).length);
        const capturing = nearby[0] > 0 && nearby[1] === 0 ? 0 : nearby[1] > 0 && nearby[0] === 0 ? 1 : null;
        if (capturing === null || objective.owner === capturing) {
          objective.capturing = null;
          objective.progress = Math.max(0, objective.progress - delta * .7);
          continue;
        }
        if (objective.capturing !== capturing) objective.progress = 0;
        objective.capturing = capturing;
        objective.progress += delta * (1 + Math.max(0, nearby[capturing] - 1) * .35);
        if (objective.progress >= 3) {
          objective.owner = capturing;
          objective.capturing = null;
          objective.progress = 0;
          runtime.teamXp[capturing] += 160;
          runtime.teamBuffUntil[capturing] = runtime.elapsed + 25;
          ring(objective.x, objective.y, 135, capturing === 0 ? map.team0 : map.team1, capturing);
        }
      }
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

      updateObjectives(delta);

      const player = runtime.units.find((current) => current.id === 'player')!;
      if (!player.dead) updatePlayer(player, delta);

      for (const current of [...runtime.units]) {
        if (current.dead) {
          if (current.type === 'hero' && current.respawn !== undefined) {
            current.respawn -= delta;
            if (current.respawn <= 0) {
              current.dead = false;
              current.hp = current.maxHp;
              current.x = current.team === 0 ? 350 : 2850;
              current.y = pointOnLane(current.lane, current.x).y;
              current.renderX = current.x;
              current.renderY = current.y;
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
        if (current.type === 'tower' || current.type === 'core') {
          const target = nearestEnemy(current, current.range, current.type === 'tower');
          if (target) attack(current, target, delta, false);
          else current.attackWait = Math.max(0, current.attackWait - delta);
          continue;
        }

        current.attackWait = Math.max(0, current.attackWait - delta);
        const rotationPhase = Math.floor(runtime.elapsed / 20) % 3;
        const rotator = current.type === 'hero' && (current.id === 'ally-3' || current.id === 'enemy-3');
        if (rotator && rotationPhase === 1) {
          const contested = runtime.objectives[(Math.floor(runtime.elapsed / 20) + current.team) % runtime.objectives.length];
          const roamingEnemy = trackedEnemy(current, Math.max(320, current.range + 130), false);
          if (roamingEnemy) attack(current, roamingEnemy, delta);
          else moveToward(current, contested.x + (current.team === 0 ? -34 : 34), contested.y, delta, 58);
          continue;
        }

        const awareness = current.type === 'hero' ? Math.max(330, current.range + 130) : 245;
        const target = trackedEnemy(current, awareness, true);
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

      runtime.units = runtime.units.filter((current) => !current.dead || current.type === 'hero' || current.type === 'core');
      const smoothing = 1 - Math.exp(-delta * 14);
      runtime.units.forEach((current) => {
        current.renderX = (current.renderX ?? current.x) + (current.x - (current.renderX ?? current.x)) * smoothing;
        current.renderY = (current.renderY ?? current.y) + (current.y - (current.renderY ?? current.y)) * smoothing;
      });
      levelTeam(0);
      levelTeam(1);
    };

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const visibleHeight = viewHeight();
      const left = cameraLeft();
      const top = cameraTop();
      const scale = width / VIEW_WIDTH;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = false;
      context.setTransform(scale, 0, 0, scale, -left * scale, -top * scale);
      context.fillStyle = map.ground;
      context.fillRect(0, 0, WORLD.width, WORLD.height);
      const tile = 120;
      const tileLeft = Math.max(0, Math.floor(left / tile) * tile);
      const tileTop = Math.max(0, Math.floor(top / tile) * tile);
      for (let y = tileTop; y < Math.min(WORLD.height, top + visibleHeight + tile); y += tile) for (let x = tileLeft; x < Math.min(WORLD.width, left + VIEW_WIDTH + tile); x += tile) {
        context.fillStyle = (x / tile + y / tile) % 2 === 0 ? map.ground2 : map.ground;
        context.globalAlpha = .18;
        context.fillRect(x, y, tile, tile);
      }
      context.globalAlpha = 1;

      context.fillStyle = map.river;
      context.fillRect(1545, 0, 110, WORLD.height);
      context.fillStyle = eraRef.current === 'medieval' ? '#6f6a54' : '#273337';
      context.fillRect(0, 0, 300, WORLD.height);
      context.fillRect(2900, 0, 300, WORLD.height);

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
        const labelPoint = pointOnLane(lane, 1600);
        context.fillStyle = '#10150f55';
        context.font = '800 16px monospace';
        context.textAlign = 'center';
        context.fillText(`${LANE_NAMES[lane]} LANE`, labelPoint.x, labelPoint.y - LANE_HALF_WIDTH - 25);
      });

      TERRAIN_OBSTACLES.filter((obstacle) => obstacle.x > left - 90 && obstacle.x < left + VIEW_WIDTH + 90 && obstacle.y > top - 110 && obstacle.y < top + visibleHeight + 110).forEach((obstacle) => {
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

      runtime.objectives.forEach((objective) => {
        const ownerColor = objective.owner === null ? '#d9d7c5' : objective.owner === 0 ? map.team0 : map.team1;
        const captureRatio = objective.capturing === null ? 1 : Math.min(1, objective.progress / 3);
        context.fillStyle = '#10151080';
        context.beginPath();
        context.ellipse(objective.x, objective.y + 25, 86, 43, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = ownerColor;
        context.lineWidth = 8;
        context.beginPath();
        context.arc(objective.x, objective.y, 72, -.5 * Math.PI, -.5 * Math.PI + captureRatio * Math.PI * 2);
        context.stroke();
        drawBox(context, objective.x, objective.y - 8, 58, 48, 12, shade(ownerColor, -10));
        drawBox(context, objective.x, objective.y - 58, 31, 42, 8, ownerColor);
        context.fillStyle = '#eef5e9';
        context.font = '800 13px monospace';
        context.textAlign = 'center';
        context.fillText('POWER RELIC', objective.x, objective.y + 103);
      });

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
      if (runtime.running && !runtime.paused) update(delta);
      const player = runtime.units.find((current) => current.id === 'player')!;
      const cameraTargetX = Math.max(VIEW_WIDTH / 2, Math.min(WORLD.width - VIEW_WIDTH / 2, player.renderX ?? player.x));
      const cameraTargetY = Math.max(viewHeight() / 2, Math.min(WORLD.height - viewHeight() / 2, player.renderY ?? player.y));
      const cameraFollow = 1 - Math.exp(-delta * 5.5);
      runtime.camera.x += (cameraTargetX - runtime.camera.x) * cameraFollow;
      runtime.camera.y += (cameraTargetY - runtime.camera.y) * cameraFollow;
      render();
      hudWait -= delta;
      if (hudWait <= 0) {
        hudWait = .12;
        const mapUnits = runtime.units.filter((current) => !current.dead && current.type !== 'projectile' && current.type !== 'effect').map((current) => ({ id: current.id, type: current.type, team: current.team, x: current.x, y: current.y }));
        onHud({ hp: player.hp, maxHp: player.maxHp, xp: [...runtime.teamXp] as [number, number], need: [xpNeeded(runtime.teamLevel[0]),xpNeeded(runtime.teamLevel[1])], level: [...runtime.teamLevel] as [number, number], kills: [...runtime.kills] as [number, number], time: runtime.elapsed, cooldowns: { ...runtime.cooldowns }, wave: runtime.wave, command: runtime.attackPrimed ? 'primed' : runtime.command.mode, mapUnits, mapObjectives: runtime.objectives.map(({ id, owner, x, y }) => ({ id, owner, x, y })), camera: { ...runtime.camera }, buff: [...runtime.teamBuffUntil] as [number, number] });
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

function Minimap({ units, objectives, camera }: { units: MapUnit[]; objectives: MapObjective[]; camera: { x: number; y: number } }) {
  return <div className="minimap" aria-label="Battlefield minimap">
    <i className="mapRiver" />
    <svg className="mapPaths" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} preserveAspectRatio="none" aria-hidden="true">
      {([0, 1, 2] as Lane[]).map((lane) => <path key={lane} className="mapPath" d={minimapPath(lane)} />)}
    </svg>
    {objectives.map((objective) => <i key={objective.id} className={`mapObjective ${objective.owner === null ? 'mapNeutral' : objective.owner === 0 ? 'mapBlue' : 'mapRed'}`} style={{ left: `${objective.x / WORLD.width * 100}%`, top: `${objective.y / WORLD.height * 100}%` }} />)}
    {units.map((current) => <i
      key={current.id}
      className={`mapUnit map${current.type[0].toUpperCase()}${current.type.slice(1)} ${current.team === 0 ? 'mapBlue' : 'mapRed'} ${current.id === 'player' ? 'mapPlayer' : ''}`}
      style={{ left: `${current.x / WORLD.width * 100}%`, top: `${current.y / WORLD.height * 100}%` }}
    />)}
    <i className="mapViewport" style={{ left: `${(camera.x - VIEW_WIDTH / 2) / WORLD.width * 100}%`, top: `${(camera.y - 450) / WORLD.height * 100}%`, width: `${VIEW_WIDTH / WORLD.width * 100}%`, height: `${900 / WORLD.height * 100}%` }} />
  </div>;
}

export function Battle({ hero, era, onExit }: { hero: Hero; era: Era; onExit: () => void }) {
  const abilityTiers=useMemo(()=>getAbilityTiers(hero),[hero]);
  const [selectedAbilities,setSelectedAbilities]=useState<AbilityLoadout>(()=>[abilityTiers[0].choices[0],null,null,null,null]);
  const [choiceLevel,setChoiceLevel]=useState<number|null>(null);
  const [levelNotice,setLevelNotice]=useState<number|null>(null);
  const noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [hud, setHud] = useState<Hud>({ hp: hero.hp, maxHp: hero.hp, xp: [0, 0], need: [xpNeeded(1),xpNeeded(1)], level: [1, 1], kills: [0, 0], time: 0, cooldowns: { q: 0, w: 0, e: 0, r: 0, t: 0 }, wave: 0, command: 'idle', mapUnits: [], mapObjectives: [], camera: { x: VIEW_WIDTH / 2, y: LANE_Y[1] }, buff: [0, 0] });
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
      {hud.buff[0] > hud.time && <div className="relicBuff">POWER RELIC · +20% DAMAGE · {Math.ceil(hud.buff[0] - hud.time)}s</div>}
      {tip && <div className="controlTip"><button onClick={() => setTip(false)}>×</button><b><kbd>RIGHT-CLICK</kbd> TO MOVE</b><span>Trees and blockades are solid terrain—use the winding jungle roads. Targeted shots track enemies; press <kbd>A</kbd> then left-click to attack-move.</span></div>}
      {levelNotice!==null&&<div className={`levelNotice ${noticeIsMilestone?'specialLevel':''}`}><small>TEAM LEVEL</small><b>{levelNotice}</b><span>{noticeIsMilestone?'ABILITY CHOICE AVAILABLE':'BASE STATS INCREASED'}</span></div>}
      {choiceTier&&<div className="abilityChoicePanel"><p>LEVEL {choiceTier.level} · <kbd>{choiceTier.key.toUpperCase()}</kbd> SLOT</p><h3>CHOOSE AN ABILITY</h3><span>This choice fills the next space in your bottom ability bar.</span><div>{choiceTier.choices.map(choice=><button key={choice.name} onClick={()=>chooseAbility(choice)}><i>{choice.icon}</i><b>{choice.name}</b><small>{choice.description}</small></button>)}</div></div>}
      {outcome && <div className="outcomeOverlay"><p>{outcome === 'VICTORY' ? 'ENEMY HEART SHATTERED' : 'YOUR HEART HAS FALLEN'}</p><h2>{outcome}</h2><div><span>TEAM LEVEL <b>{hud.level[0]}</b></span><span>TAKEDOWNS <b>{hud.kills[0]}</b></span><span>TIME <b>{formatTime(hud.time)}</b></span></div><button onClick={onExit}>RETURN TO HQ</button></div>}
    </div>
    <footer className="battleHud">
      <div className="playerPanel"><HeroPortrait hero={hero} /><span><small>{hero.role}</small><b>{hero.name}</b><i><b style={{ width: `${Math.max(0, hud.hp / hud.maxHp * 100)}%` }} /></i><em>{Math.ceil(Math.max(0, hud.hp))} / {Math.ceil(hud.maxHp)}</em></span></div>
      <div className="abilities" aria-label="Ability bar">{abilityTiers.map((tier,index)=>{const selected=selectedAbilities[index],cooldown=hud.cooldowns[tier.key],locked=!selected;return <div key={tier.level} className={`${cooldown>0?'cooling':''} ${locked?'locked':''}`} aria-label={selected?`${selected.name} ability`:`Ability slot unlocks at level ${tier.level}`}><kbd>{tier.key.toUpperCase()}</kbd><i style={{'--cool':`${Math.min(100,cooldown/ABILITY_COOLDOWNS[index]*100)}%`} as React.CSSProperties}>{locked?`LVL ${tier.level}`:cooldown>0?cooldown.toFixed(1):selected.icon}</i><span>{selected?.name??'Unchosen'}</span></div>})}</div>
      <Minimap units={hud.mapUnits} objectives={hud.mapObjectives} camera={hud.camera} />
    </footer>
  </main>;
}
