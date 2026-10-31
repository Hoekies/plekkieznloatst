// Controle vóór een push: types, lint, zelftest en een proefbouw. Stopt bij de eerste fout.
// Daarna de database-check: staan alle migraties in Supabase? (alleen een waarschuwing)
// De proefbouw gaat naar .next-controle, zodat een draaiende "npm run dev" er geen last van heeft.
import { spawnSync } from "node:child_process";

const stappen = [
  ["Types", "npx", ["tsc", "--noEmit"]],
  ["Lint", "npx", ["next", "lint", "--quiet"]],
  ["Zelftest", "npx", ["--yes", "tsx", "scripts/zelftest.ts"]],
  ["Bouwen", "npx", ["next", "build"], { PR_DIST: ".next-controle" }],
];

for (const [naam, cmd, args, env] of stappen) {
  const start = Date.now();
  process.stdout.write(`▶ ${naam}…\n`);
  const r = spawnSync(`${cmd} ${args.join(" ")}`, { stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  if (r.status !== 0) {
    console.error(`\n❌ ${naam} mislukt: niet gepusht. Los de fout op en probeer opnieuw.`);
    process.exit(1);
  }
  console.log(`✓ ${naam} (${Math.round((Date.now() - start) / 1000)} s)`);
}
// 🗄️ Database (alleen lezen): waarschuwt bij een migratie die nog niet in Supabase staat, maar stopt de push niet
process.stdout.write("▶ Database…\n");
spawnSync("node scripts/database-check.mjs", { stdio: "inherit", shell: true });
console.log("\n✅ Alles in orde");
