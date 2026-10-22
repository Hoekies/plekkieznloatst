// 🎉 Confetti: een korte regen of knal van gekleurde snippers over het hele scherm (canvas, geen bibliotheek).
// Ruimt zichzelf op; respecteert "minder beweging" in de instellingen van de telefoon.
const KLEUREN = ["#F59E0B", "#00D9FF", "#EF4444", "#10B981", "#A78BFA", "#F97316", "#FFE680", "#F472B6"];

type Snipper = { x: number; y: number; vx: number; vy: number; rot: number; vrot: number; b: number; h: number; kleur: string; rond: boolean };

export function strooiConfetti({ aantal = 120, duurMs = 2600, knal = false, kleuren = KLEUREN }: { aantal?: number; duurMs?: number; knal?: boolean; kleuren?: string[] } = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const doek = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  doek.width = w * dpr; doek.height = h * dpr;
  Object.assign(doek.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "4000" });
  document.body.appendChild(doek);
  const ctx = doek.getContext("2d");
  if (!ctx) { doek.remove(); return; }
  ctx.scale(dpr, dpr);

  // Knal: vanuit het midden onderaan omhoog; anders een regen van boven
  const snippers: Snipper[] = Array.from({ length: aantal }, () => {
    const hoek = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
    const kracht = 9 + Math.random() * 9;
    return {
      x: knal ? w / 2 + (Math.random() - 0.5) * 60 : Math.random() * w,
      y: knal ? h * 0.75 : -20 - Math.random() * h * 0.4,
      vx: knal ? Math.cos(hoek) * kracht : (Math.random() - 0.5) * 2,
      vy: knal ? Math.sin(hoek) * kracht : 2 + Math.random() * 3,
      rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.3,
      b: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      kleur: kleuren[Math.floor(Math.random() * kleuren.length)], rond: Math.random() < 0.25,
    };
  });

  const start = performance.now();
  const stap = (nu: number) => {
    const verstreken = nu - start;
    ctx.clearRect(0, 0, w, h);
    const vervaag = Math.max(0, Math.min(1, (duurMs - verstreken) / 600));
    ctx.globalAlpha = vervaag;
    for (const s of snippers) {
      s.vy += 0.25; s.vx *= 0.99; s.vy *= 0.99;
      s.x += s.vx + Math.sin((nu + s.b * 100) / 300) * 0.6; s.y += s.vy; s.rot += s.vrot;
      ctx.save();
      ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      ctx.fillStyle = s.kleur;
      if (s.rond) { ctx.beginPath(); ctx.arc(0, 0, s.b / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-s.b / 2, -s.h / 2, s.b, s.h * Math.abs(Math.cos(s.rot * 2)) + 2);
      ctx.restore();
    }
    if (verstreken < duurMs) requestAnimationFrame(stap);
    else doek.remove();
  };
  requestAnimationFrame(stap);
}
