// VII step 4 · colony worlds. Civilizations carried off Earth keep living on
// their new planet: they fight, evolve through war, and once two future-age
// civilizations finish a war the planet burns in its own nuclear winter.
// Earth is not touched by it, and nothing grows back on its own: a colony only
// fills again when the next ark lands.
//
// Step 5 · uplift. A colony civilization can cross the great filter two ways:
// a peaceful one at the final age signs 存续协议 after a negotiation at peace;
// in any war between two final-age civilizations the player can seize both
// arsenals when the end is near, so the loser falls without a nuclear
// annihilation and the winner is uplifted. Uplifted civilizations stay in the
// dome for good, out of every war and winter, and produce more.
//
// Every colony war runs on an abstract model (a few numbers per second). The
// one war the player is watching is instantiated as a real battle from that
// state, runs for real while watched, and is folded back when it is not.
import { Q } from './quantity.js';
import { AGES } from './game-config.js';
import { nextRandom } from './celestial-economy.js';
import { createWar, updateWar } from './orbital-war.js';
import { effectProduct, effectSum } from './solar-effects.js';

const FINAL_AGE = 5;
// Each world changes how its colonists live. Mars is scarce and harsh: less
// income, deadlier wars, and idle neighbours do not stay idle for long.
export const WORLDS = Object.freeze({
  mars: Object.freeze({ name: '火星', income: .75, damage: 1.5, fuse: 20, winter: 120, hardens: true }),
});
// Fitted to headless real wars (tests/fixtures/colony-war-reference.js): about
// 34 s of war per age, an even war lasting ~800 s, one age of advantage
// roughly halving it and two ages ending it within a couple of minutes.
export const COLONY_WAR = Object.freeze({
  evolveSeconds: 34, warSeconds: 640, ageEdge: Object.freeze([0, .6, .8, 1, 1.4, 2.6]), edgeCap: 12, tempoMin: .5, tempoSpan: 1.5, luckMin: .75, luckSpan: .5,
  surgeSeconds: 5, surgeMin: .4, surgeSpan: 1.2,
  // Settlements, in seconds of the fallen civilizations' own output.
  defeatSeconds: 30, nuclearSeconds: 90,
});
export const COLONIST_BASE = 16384;
const M = 2 ** 20;
export const UPLIFT = Object.freeze({ accordCost: 64 * M, accordSeconds: 60, seizeCost: 128 * M, seizeThreshold: .35, rate: 4, warlike: 1 });
export const emptyWorld = () => ({ phase: 'living', remaining: 0, civs: [], wars: [], uplifted: [], growth: { step: 0, progress: 0 }, nextWar: 0, fuse: 0, nuclear: 0 });

// ── The uplifted civilization's own VI ── One per planet. Once it has signed, it
// develops the world by itself, step by step: one great dome, the survey of the
// surface, a space elevator, a seven-segment ring habitat (like ours around
// Earth) and at last a greener planet. The newcomers we ship in live under its
// watch: their wars pay out to us, and when they burn the planet it survives.
// The player may fund the current step (援建) to finish it at once.
const G = 2 ** 30;
export const GROWTH = Object.freeze([
  { key: 'grandDome', name: '大穹顶', seconds: 90, cost: 256 * M, text: '各座穹顶连成一整座大穹顶：火星多住两户。' },
  { key: 'survey', name: '地表探索', seconds: 120, cost: 512 * M, text: '走出穹顶勘察火星：殖民战争与核毁灭的结算 ×2。' },
  { key: 'elevator', name: '火星太空电梯', seconds: 150, cost: G, text: '从赤道升起的电梯：转运到火星的价格减半，升格文明迁往轨道，不再占用穹顶。' },
  ...Array.from({ length: 7 }, (_, i) => ({ key: `ring${i + 1}`, name: `环火星生存空间 · 第 ${i + 1} 段`, seconds: 60, cost: 2 * G * 2 ** i, text: '每一段环：火星居民产出与结算 ×1.5。' })),
  { key: 'green', name: '绿化火星', seconds: 300, cost: 512 * G, text: '大气变厚、第一片植被：火星不再稀缺（居民产出 ×1.33），核冬天减半。' },
].map(Object.freeze));
// Older saves (and worlds before v34) have no development yet: read them as step 0.
const stepOf = w => w?.growth?.step ?? 0;
const growthDone = (w, key) => stepOf(w) > GROWTH.findIndex(g => g.key === key);
export const ringSegments = w => Math.max(0, Math.min(7, stepOf(w) - 3));
// What the development has built so far, as numbers the colony reads.
export const growthHouseholds = w => growthDone(w, 'grandDome') ? 2 : 0;
export const upliftedInOrbit = w => growthDone(w, 'elevator');
export const growthSettlement = w => (growthDone(w, 'survey') ? 2 : 1) * 1.5 ** ringSegments(w);
export const growthIncome = w => 1.5 ** ringSegments(w) * (growthDone(w, 'green') ? 4 / 3 : 1);
export const growthTransfer = w => growthDone(w, 'elevator') ? .5 : 1;
export const growthWinter = w => growthDone(w, 'green') ? .5 : 1;
export const growthStep = w => GROWTH[stepOf(w)] ?? null;
export const growthFundCost = w => growthStep(w)?.cost ?? null;
export function fundGrowthState(s, key) {
  const w = s.orbital?.solar.colonies[key];
  if (!w?.uplifted.length) return 'none';
  if (!growthStep(w)) return 'done';
  return Q.gte(s.permanent.legacy, growthFundCost(w)) ? 'ready' : 'legacy';
}
export function fundGrowth(s, key) {
  if (fundGrowthState(s, key) !== 'ready') return false;
  const o = s.orbital, w = o.solar.colonies[key], cost = growthFundCost(w);
  s.permanent.legacy = Q.sub(s.permanent.legacy, cost); (o.solar.payments.growth ??= []).push(Q.of(cost));
  w.growth.step++; w.growth.progress = 0; return true;
}
function advanceGrowth(o, key, dt) {
  const w = o.solar.colonies[key], step = growthStep(w);
  if (!w.uplifted.length || !step) return null;
  w.growth.progress += dt;
  if (w.growth.progress < step.seconds) return null;
  w.growth.step++; w.growth.progress = 0;
  return `${WORLDS[key].name}：${w.uplifted[0].name}建成「${step.name}」。`;
}
export const colonistRate = (civ, world = 'mars') => COLONIST_BASE * 2 ** (civ.age - 1) * WORLDS[world].income;
// Uplifted civilizations work through winters: they are past the filter.
export const upliftedRate = (world = 'mars') => COLONIST_BASE * 2 ** (FINAL_AGE - 1) * WORLDS[world].income * UPLIFT.rate;
// Talents lift what residents and uplifted civilizations produce (温室气体输送, 大气改造, 木卫二…).
// Residents at war under an uplifted civilization's watch pay half again: it runs their wars for us.
export const worldIncome = (o, world) => { const w = o.solar.colonies[world], watch = w.uplifted.length ? 1.5 : 1;
  const residents = w.phase === 'living' ? w.civs.reduce((sum, c) => sum + colonistRate(c, world) * (c.warId ? watch : 1), 0) * effectProduct(o, 'colonists') * growthIncome(w) : 0;
  return residents + w.uplifted.length * upliftedRate(world) * effectProduct(o, 'uplifted'); };
// The colony's own clocks and thresholds, as the talents set them.
export const fuseSeconds = (o, key) => WORLDS[key].fuse * effectProduct(o, 'fuse');
export const winterSeconds = (o, key) => WORLDS[key].winter * effectProduct(o, 'marsWinter') * growthWinter(o.solar.colonies[key]);
export const accordSeconds = o => UPLIFT.accordSeconds * effectProduct(o, 'accordTime');
export const seizeLine = o => UPLIFT.seizeThreshold + effectSum(o, 'seizeLine');
export const colonyIncome = o => Object.keys(WORLDS).reduce((sum, world) => sum + worldIncome(o, world), 0);
export const settlementValue = (civs, world, seconds, scale = 1) => Math.floor(civs.reduce((sum, c) => sum + colonistRate(c, world), 0) * seconds * scale);

// ── Watching ── not saved: a reload simply starts watching from the abstract state.
const watched = new WeakMap(), live = new WeakMap();
export function watchColonyWar(o, world, id) {
  if (id === null) { watched.delete(o); return null; }
  const war = o.solar.colonies[world]?.wars.find(w => w.id === id);
  if (!war) { watched.delete(o); return null; }
  watched.set(o, { world, id });
  if (!live.has(war)) live.set(war, instantiate(o.solar.colonies[world], war, world));
  return live.get(war);
}
export const watchedColonyWar = o => watched.get(o) ?? null;
export function liveColonyWar(o) {
  const w = watched.get(o); if (!w) return null;
  const war = o.solar.colonies[w.world]?.wars.find(x => x.id === w.id);
  return war ? live.get(war) ?? null : null;
}
// A real battle that starts where the abstract one stands: ages, experience
// towards the next age and the bases' remaining health all carry over.
function instantiate(world, war, key) {
  const civs = war.sides.map(id => {
    const c = world.civs.find(x => x.id === id), next = AGES[c.age + 1];
    const experience = AGES[c.age].experienceRequired + (next ? c.progress * (next.experienceRequired - AGES[c.age].experienceRequired) : 0);
    return { ...c, experience, gold: AGES[c.age].startingGold, power: 0, superSoldiers: 0, profile: 0, airdrops: 0 };
  });
  const real = createWar(war.id, civs, { damage: WORLDS[key].damage });
  ['player', 'enemy'].forEach((team, i) => { const b = real.game.bases[team]; b.hp = Q.max(1, Q.mul(b.maxHp, war.base[i])); });
  return real;
}
function fold(world, war, real) {
  ['player', 'enemy'].forEach((team, i) => {
    const c = world.civs.find(x => x.id === war.sides[i]), g = real.game, next = AGES[g.ages[team] + 1];
    c.age = g.ages[team];
    c.progress = next ? Math.max(0, Math.min(.999, Q.toNumber(Q.sub(g.experience[team], AGES[c.age].experienceRequired)) / (next.experienceRequired - AGES[c.age].experienceRequired))) : 0;
    war.base[i] = Math.max(0, Math.min(1, Q.toNumber(Q.div(g.bases[team].hp, g.bases[team].maxHp))));
  });
}

// ── Abstract war ──
export function startColonyWar(o, key, a, b) {
  const world = o.solar.colonies[key], war = { id: `${key}-${++world.nextWar}`, sides: [a.id, b.id], base: [1, 1], elapsed: 0,
    tempo: COLONY_WAR.tempoMin + COLONY_WAR.tempoSpan * nextRandom(o), luck: [0, 1].map(() => COLONY_WAR.luckMin + COLONY_WAR.luckSpan * nextRandom(o)), surge: [1, 1], nextSurge: 0, seized: false };
  a.warId = b.warId = war.id; world.wars.push(war); return war;
}
// One step of an abstract war. Returns 'won' | 'lost' | 'draw' | null (from side 0's view).
export function stepColonyWar(o, world, war, env, dt) {
  const R = COLONY_WAR, civs = war.sides.map(id => world.civs.find(c => c.id === id));
  war.elapsed += dt;
  if (war.elapsed >= war.nextSurge) { war.surge = [0, 1].map(() => R.surgeMin + R.surgeSpan * nextRandom(o)); war.nextSurge = war.elapsed + R.surgeSeconds; }
  for (const c of civs) if (c.age < FINAL_AGE) { c.progress += dt / R.evolveSeconds; if (c.progress >= 1) { c.age++; c.progress = 0; } }
  // An age of advantage weighs more the further both have come.
  const edge = R.ageEdge[Math.max(civs[0].age, civs[1].age)];
  civs.forEach((c, i) => { const other = civs[1 - i];
    war.base[i] = Math.max(0, war.base[i] - dt * env.damage * Math.min(R.edgeCap, Math.exp(edge * (other.age - c.age))) * war.surge[i] / (R.warSeconds * war.tempo * war.luck[i])); });
  return outcome(war.base[0], war.base[1]);
}
// The same model on its own, for calibration against real battles.
export function simulateColonyWar(ageA, ageB, { damage = 1, seed = 1, dt = .1, limit = 3600 } = {}) {
  const o = { rng: seed >>> 0 }, world = emptyWorld(), env = { damage };
  const a = { id: 'a', age: ageA, progress: 0, warId: null }, b = { id: 'b', age: ageB, progress: 0, warId: null };
  world.civs.push(a, b); const war = { id: 'w', sides: ['a', 'b'], base: [1, 1], elapsed: 0, tempo: COLONY_WAR.tempoMin + COLONY_WAR.tempoSpan * nextRandom(o), luck: [0, 1].map(() => COLONY_WAR.luckMin + COLONY_WAR.luckSpan * nextRandom(o)), surge: [1, 1], nextSurge: 0 };
  const final = [null, null]; let result = null;
  while (!result && war.elapsed < limit) { result = stepColonyWar(o, world, war, env, dt); [a, b].forEach((c, i) => { if (c.age === FINAL_AGE && final[i] === null) final[i] = war.elapsed; }); }
  return { result, seconds: war.elapsed, final };
}
const outcome = (a, b) => a <= 0 && b <= 0 ? 'draw' : b <= 0 ? 'won' : a <= 0 ? 'lost' : null;

// ── World clock ── returns the Legacy settled this step and what to log.
export function updateColonies(o, dt) {
  let reward = 0; const logs = [];
  for (const key of Object.keys(WORLDS)) {
    const world = o.solar.colonies[key], env = WORLDS[key];
    const built = advanceGrowth(o, key, dt); if (built) logs.push(built);
    if (world.phase === 'winter') {
      world.remaining = Math.max(0, world.remaining - dt);
      if (world.remaining <= 1e-8) { world.phase = 'living'; world.remaining = 0; logs.push(`${env.name}的核冬天结束，穹顶可以再次接收文明。`); }
      continue;
    }
    // Negotiations advance at peace; a finished one uplifts the civilization.
    for (const c of [...world.civs]) if (c.accord !== null && !c.warId) {
      c.accord = Math.min(1, c.accord + dt / accordSeconds(o));
      if (c.accord >= 1) logs.push(uplift(o, key, c, 'accord'));
    }
    // Idle neighbours pick a fight: the two youngest idle colonists, after a
    // short fuse. A civilization at the negotiating table is left alone.
    const idle = world.civs.filter(c => !c.warId && c.accord === null).sort((a, b) => a.age - b.age);
    if (idle.length >= 2) { world.fuse += dt; if (world.fuse >= fuseSeconds(o, key)) { world.fuse = 0; startColonyWar(o, key, idle[0], idle[1]); logs.push(`${env.name}：${idle[0].name}与${idle[1].name}开战。`); } }
    else world.fuse = 0;
    const view = watched.get(o);
    for (const war of [...world.wars]) {
      let result;
      if (view?.world === key && view.id === war.id) {
        const real = live.get(war) ?? instantiate(world, war, key); live.set(war, real);
        updateWar(real, dt); fold(world, war, real);
        result = real.game.status === 'playing' ? null : real.game.status === 'won' ? 'won' : real.game.status === 'lost' ? 'lost' : 'draw';
      } else { live.delete(war); result = stepColonyWar(o, world, war, env, dt); }
      if (!result) continue;
      const settled = resolveColonyWar(o, key, war, result);
      reward += settled.reward; logs.push(settled.text);
      if (world.phase === 'winter') break;
    }
  }
  return { reward, logs };
}
export function resolveColonyWar(o, key, war, result) {
  const world = o.solar.colonies[key], env = WORLDS[key], civs = war.sides.map(id => world.civs.find(c => c.id === id));
  world.wars = world.wars.filter(w => w !== war); live.delete(war);
  // Two future-age civilizations ending a war: the whole planet burns, unless
  // the player holds both arsenals.
  if (result !== 'draw' && !war.seized && civs.every(c => c.age === FINAL_AGE)) return burnWorld(o, key);
  const losers = result === 'draw' ? civs : [civs[result === 'won' ? 1 : 0]];
  const reward = settlementValue(losers, key, COLONY_WAR.defeatSeconds, growthSettlement(world));
  world.civs = world.civs.filter(c => !losers.includes(c));
  const winner = civs.find(c => !losers.includes(c));
  if (winner && war.seized) { for (const c of civs) c.warId = null; const text = uplift(o, key, winner, 'seizure');
    return { reward, text: `${env.name}：核武已被接管，${losers[0].name}覆灭，没有核毁灭。${text}` }; }
  // Mars hardens whoever survives it.
  if (winner && env.hardens) winner.tendency = UPLIFT.warlike;
  for (const c of civs) c.warId = null;
  return { reward, text: `${env.name}：${losers.map(c => c.name).join('、')}覆灭，收获 ${Q.format(reward)} Legacy。` };
}
function uplift(o, key, civ, via) {
  const world = o.solar.colonies[key], env = WORLDS[key];
  world.civs = world.civs.filter(c => c !== civ);
  const { progress, warId, accord, ...kept } = civ;
  world.uplifted.push({ ...kept, age: FINAL_AGE, via, upliftedAt: o.elapsed });
  // It is the only one: any other negotiation on this planet ends here.
  for (const c of world.civs) c.accord = null;
  world.growth = { step: 0, progress: 0 };
  return `${env.name}：${civ.name}${via === 'accord' ? '签署存续协议' : '在你的控制下停战'}，成为${env.name}唯一的升格文明，开始自己开发这颗行星。`;
}
function burnWorld(o, key) {
  const world = o.solar.colonies[key], env = WORLDS[key], reward = settlementValue(world.civs, key, COLONY_WAR.nuclearSeconds, growthSettlement(world));
  for (const war of world.wars) live.delete(war);
  const winter = winterSeconds(o, key);
  world.civs = []; world.wars = []; world.fuse = 0; world.nuclear++; world.phase = 'winter'; world.remaining = winter;
  // Arks already on their way wait in orbit until the winter lifts.
  for (const t of o.solar.transfers) if (t.to === key) t.arriveAt = Math.max(t.arriveAt, o.elapsed + winter);
  return { reward, text: `${env.name}核毁灭：殖民文明全部消亡，收获 ${Q.format(reward)} Legacy。${env.name}进入核冬天${world.uplifted.length ? '，升格文明安然无恙' : ''}，地球不受影响。` };
}

// ── Uplift actions ── both are paid from the wallet and ledgered in o.solar.payments.
const upliftOpen = o => o?.talents.voyage > 0 && o.solar.talents.uplift > 0;
export const peaceful = civ => civ.tendency !== UPLIFT.warlike;
export function accordState(s, key, id) {
  const o = s.orbital, world = o?.solar.colonies[key], civ = world?.civs.find(c => c.id === id);
  if (!upliftOpen(o)) return 'locked';
  if (!civ) return 'selection';
  if (civ.accord !== null) return 'negotiating';
  // One uplifted civilization per planet, and one negotiation at a time.
  if (world.uplifted.length || world.civs.some(c => c.accord !== null)) return 'occupied';
  if (!peaceful(civ)) return 'warlike';
  if (civ.age < FINAL_AGE) return 'age';
  if (civ.warId) return 'war';
  return Q.gte(s.permanent.legacy, UPLIFT.accordCost) ? 'ready' : 'legacy';
}
export function startAccord(s, key, id) {
  if (accordState(s, key, id) !== 'ready') return false;
  const o = s.orbital, civ = o.solar.colonies[key].civs.find(c => c.id === id);
  s.permanent.legacy = Q.sub(s.permanent.legacy, UPLIFT.accordCost); (o.solar.payments.accords ??= []).push(UPLIFT.accordCost);
  civ.accord = 0; return true;
}
export function seizeState(s, key, id) {
  const o = s.orbital, world = o?.solar.colonies[key], war = world?.wars.find(w => w.id === id);
  if (!upliftOpen(o)) return 'locked';
  if (!war) return 'selection';
  if (war.seized) return 'seized';
  if (world.uplifted.length) return 'occupied';
  if (war.sides.some(side => world.civs.find(c => c.id === side).age < FINAL_AGE)) return 'age';
  if (Math.min(...war.base) >= seizeLine(o)) return 'early';
  return Q.gte(s.permanent.legacy, UPLIFT.seizeCost) ? 'ready' : 'legacy';
}
export function seizeArsenals(s, key, id) {
  if (seizeState(s, key, id) !== 'ready') return false;
  const o = s.orbital, war = o.solar.colonies[key].wars.find(w => w.id === id);
  s.permanent.legacy = Q.sub(s.permanent.legacy, UPLIFT.seizeCost); (o.solar.payments.seizures ??= []).push(UPLIFT.seizeCost);
  war.seized = true; return true;
}
