import { Q } from '../src/quantity.js';
import { RULES } from '../src/game.js';
import { updateOrbital, startOrbitalWar, purchaseOrbitalTalent } from '../src/orbital-game.js';
import { SOLAR_TALENTS, solarTalentState, purchaseSolarTalent, solarCosts, solarRank, transferState, transferCivilization, transferQuote } from '../src/solar-colony.js';
import { accordState, startAccord, seizeState, seizeArsenals, fundGrowthState, fundGrowth, growthFundCost } from '../src/colony-war.js';
import { industryRate } from '../src/solar-industry.js';
import { colonyIncome } from '../src/colony-war.js';
import { lunarLegacyRate } from '../src/celestial-economy.js';
import { EFFECTS } from '../src/solar-effects.js';
import { simulateOrbital } from './orbital.js';

// VII after a real VI run: the same session carries on from the moment 远航协议
// is signed. The policy is a plain greedy player, never extra income:
// - Earth keeps pairing its idle civilizations, as in VI;
// - the cheapest VII talent that is ready is bought each second (axis first on ties);
// - the oldest idle Earth civilization is shipped to Mars when a transfer is ready;
// - accords and seizures are taken when offered; 援建 only when it costs under a tenth of the wallet.
// Plain numbers for the policy; large quantities are fine to approximate here.
const toNum = v => typeof v === 'number' ? v : Number(Q.encode(v));
// A player puts income first: footholds and anything that raises output.
const earns = key => SOLAR_TALENTS[key].facility || (EFFECTS[key] ?? []).some(e => ['yield', 'industry', 'income', 'colonists'].includes(e.type)) ? 1 : 0;
const AXIS = ['harbor', 'heat', 'mining', 'uplift', 'deepDrive', 'relay'];
export function simulateInterplanetary({ seed = 1, minutes = 60 } = {}) {
  const vi = simulateOrbital({ seed }), s = vi.session, o = s.orbital, start = o.elapsed;
  const bought = [], events = [], samples = [];
  let decision = 0;
  const minute = () => (o.elapsed - start) / 60;
  const price = key => { const c = solarCosts(key)[solarRank(o, key)]; return c === undefined ? Infinity : toNum(c); };
  while (o.elapsed < start + minutes * 60) {
    if (o.elapsed >= decision) {
      decision = o.elapsed + 1;
      const idle = o.civilizations.filter(c => c.alive && !c.warId).sort((a, b) => b.age - a.age);
      // Ship first, then pair what is left: a transfer takes an idle civilization.
      if (idle[0] && transferState(s, idle[0].id) === 'ready' && toNum(s.permanent.legacy) > 3 * toNum(transferQuote(o, idle[0]).cost) && transferCivilization(s, idle[0].id)) events.push({ at: minute(), event: `transfer ${idle[0].age}` });
      const left = o.civilizations.filter(c => c.alive && !c.warId).sort((a, b) => a.age - b.age);
      for (let i = 0; i + 1 < left.length; i += 2) startOrbitalWar(s, left[i].id, left[i + 1].id);
      purchaseOrbitalTalent(s, 'lunarIndustry');
      const world = o.solar.colonies.mars;
      for (const c of world.civs) if (accordState(s, 'mars', c.id) === 'ready' && startAccord(s, 'mars', c.id)) events.push({ at: minute(), event: 'accord' });
      for (const w of world.wars) if (seizeState(s, 'mars', w.id) === 'ready' && seizeArsenals(s, 'mars', w.id)) events.push({ at: minute(), event: 'seize' });
      if (fundGrowthState(s, 'mars') === 'ready' && Q.lt(Q.mul(growthFundCost(world), 10), s.permanent.legacy)) fundGrowth(s, 'mars');
      // Save for the next step of the axis: other things only when they do not delay it.
      const next = AXIS.find(k => !solarRank(o, k));
      for (let n = 0; n < 6; n++) {
        const wallet = toNum(s.permanent.legacy), goal = next && solarTalentState(s, next) !== 'prerequisite' ? price(next) : 0;
        const ready = Object.keys(SOLAR_TALENTS).filter(key => solarTalentState(s, key) === 'ready' && (key === next || !goal || price(key) <= goal * .2 || wallet - price(key) >= goal))
          .sort((a, b) => (b === next) - (a === next) || earns(b) - earns(a) || price(a) - price(b));
        if (!ready.length || !purchaseSolarTalent(s, ready[0])) break;
        bought.push({ at: minute(), key: ready[0], rank: solarRank(o, ready[0]) });
      }
    }
    updateOrbital(s, RULES.fixedStep);
    if (samples.length < Math.floor(minute() / 5) + 1) samples.push({ at: Math.round(minute()), industry: industryRate(o), colony: colonyIncome(o), lunar: lunarLegacyRate(o), wallet: toNum(s.permanent.legacy) });
  }
  const first = key => bought.find(b => b.key === key)?.at ?? null;
  const worlds = Object.fromEntries(['heat', 'mining', 'uplift', 'deepDrive', 'relay'].map(k => [k, first(k)]));
  const uplifted = events.find(e => e.event === 'accord' || e.event === 'seize')?.at ?? null;
  const owned = Object.keys(SOLAR_TALENTS).filter(k => !SOLAR_TALENTS[k].planned && !SOLAR_TALENTS[k].root);
  const complete = owned.filter(k => solarRank(o, k) > 0).length / owned.length;
  return { seed, viMinutes: start / 60, axis: worlds, firstUplift: uplifted, colonyUplifted: o.solar.colonies.mars.uplifted.length, growthStep: o.solar.colonies.mars.growth.step,
    boughtShare: complete, bought, events, samples, session: s };
}
