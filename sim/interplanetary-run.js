import { simulateInterplanetary } from './interplanetary.js';
// npm run sim:interplanetary [minutes] — prints the VII pacing for a few seeds.
const minutes = Number(process.argv[2] ?? 60), round = n => n === null ? null : Math.round(n * 10) / 10;
for (const seed of [1, 2, 3]) {
  const r = simulateInterplanetary({ seed, minutes });
  console.log(JSON.stringify({ seed, viMinutes: round(r.viMinutes), axis: Object.fromEntries(Object.entries(r.axis).map(([k, v]) => [k, round(v)])), firstUplift: round(r.firstUplift),
    growthStep: r.growthStep, bought: `${Math.round(r.boughtShare * 100)}%`, samples: r.samples.map(x => `${x.at}m ind ${x.industry.toExponential(1)} col ${x.colony.toExponential(1)} wal ${x.wallet.toExponential(1)}`) }));
}
