import { FINISH_THEMAS, huidigFinishThema, type FinishThemaSleutel } from "./finish-thema";

// 🎉 Confetti: een korte regen of knal van gekleurde snippers over het hele scherm (canvas, geen bibliotheek).
// Ruimt zichzelf op; respecteert "minder beweging" in de instellingen van de telefoon.
// 🗓️ Seizoensgebonden: de kleuren en zwevende emoji van het thema van nu (🍂🍁 in de herfst, ❄️ in de winter,
// 🎃👻 rond Halloween …), dezelfde thema's als de finish. Een in het beheer vastgezet thema gaat voor de datum.
const KLEUREN = ["#F59E0B", "#00D9FF", "#EF4444", "#10B981", "#A78BFA", "#F97316", "#FFE680", "#F472B6"];
// Zoveel van de snippers zijn een emoji van het seizoen
const EMOJI_DEEL = 0.3;
// Alle confetti blijft zoveel keer langer in beeld dan de duur die de aanroeper vraagt
const DUUR_FACTOR = 1.8;

// Het thema voor de confetti: gezet door de spelersapp (app/speler/layout.tsx, met het vastgezette thema), anders de datum
let gekozenThema: FinishThemaSleutel | null = null;
let extraEmoji: string | null = null;
export function zetConfettiThema(sleutel: string | null, emoji: string | null = null) {
  gekozenThema = sleutel && sleutel in FINISH_THEMAS ? (sleutel as FinishThemaSleutel) : null;
  extraEmoji = emoji;
}
export function confettiThema() {
  const t = FINISH_THEMAS[gekozenThema ?? huidigFinishThema()];
  return { kleuren: [...t.kleuren, "#FFD23F", "#FFFFFF"], emoji: extraEmoji ? [...t.versiering, extraEmoji, extraEmoji] : [...t.versiering] };
}

type Snipper = { x: number; y: number; vx: number; vy: number; rot: number; vrot: number; b: number; h: number; kleur: string; rond: boolean; emoji: string | null };

// seizoen: false = de gewone kleurige snippers, zonder emoji van het seizoen
export function strooiConfetti({ aantal = 120, duurMs = 2600, knal = false, kleuren, seizoen = true }: { aantal?: number; duurMs?: number; knal?: boolean; kleuren?: string[]; seizoen?: boolean } = {}) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const thema = seizoen ? confettiThema() : null;
  const palet = kleuren ?? thema?.kleuren ?? KLEUREN;
  const doek = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  doek.width = w * dpr; doek.height = h * dpr;
  Object.assign(doek.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "4000" });
  document.body.appendChild(doek);
  const ctx = doek.getContext("2d");
  if (!ctx) { doek.remove(); return; }
  ctx.scale(dpr, dpr);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  // Groter scherm (PC, tablet, beamer): meer snippers, grotere snippers en emoji, en een knal uit meerdere plekken,
  // zodat het hele scherm vol komt. Op de telefoon blijft het zoals het was.
  const schaal = Math.min(2.2, Math.max(1, Math.min(w, h) / 450));
  const breed = Math.min(4, Math.max(1, w / 420));
  const totaal = Math.min(700, Math.round(aantal * breed));
  // Breed scherm en een knal: een deel komt ook als regen van boven, zodat het hele scherm meedoet
  const regenDeel = knal && w > 800 ? 0.35 : 0;
  const bronnen = knal && w > 800 ? 3 : 1;
  const duur = duurMs * DUUR_FACTOR;

  // Knal: vanuit onderaan omhoog (op een breed scherm uit drie plekken); anders een regen van boven
  const snippers: Snipper[] = Array.from({ length: totaal }, (_, i) => {
    const omhoog = knal && Math.random() >= regenDeel;
    const hoek = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    // Naar de schermhoogte, met veel verschil: sommige snippers blijven laag, andere komen tot bovenin
    const kracht = h * (0.012 + Math.random() * 0.02);
    const bronX = (w * ((i % bronnen) + 1)) / (bronnen + 1);
    const emoji = thema?.emoji.length && Math.random() < EMOJI_DEEL ? thema.emoji[Math.floor(Math.random() * thema.emoji.length)] : null;
    return {
      x: omhoog ? bronX + (Math.random() - 0.5) * 60 * schaal : Math.random() * w,
      y: omhoog ? h * 0.85 : -20 - Math.random() * h * 0.7,
      vx: omhoog ? Math.cos(hoek) * kracht : (Math.random() - 0.5) * 2,
      vy: omhoog ? Math.sin(hoek) * kracht : 1 + Math.random() * 3,
      rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * (emoji ? 0.08 : 0.3),
      b: (emoji ? 24 + Math.random() * 14 : 6 + Math.random() * 6) * schaal, h: (8 + Math.random() * 8) * schaal,
      kleur: palet[Math.floor(Math.random() * palet.length)], rond: Math.random() < 0.25, emoji,
    };
  });

  const start = performance.now();
  let vorige = start;
  const stap = (nu: number) => {
    const verstreken = nu - start;
    // Even snel op elk scherm (60 of 120 beelden per seconde)
    const dt = Math.min(3, (nu - vorige) / (1000 / 60));
    vorige = nu;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = Math.max(0, Math.min(1, (duur - verstreken) / 900));
    for (const s of snippers) {
      // Luchtweerstand: snippers dwarrelen (blijven langer in beeld); emoji zijn nog lichter en wiegen meer
      // (blaadjes, sneeuw, hartjes)
      const zwaarte = s.emoji ? 0.07 : 0.1, rem = Math.pow(s.emoji ? 0.978 : 0.98, dt);
      s.vy = (s.vy + zwaarte * dt) * rem; s.vx *= Math.pow(0.99, dt);
      s.x += (s.vx + Math.sin((nu + s.b * 100) / (s.emoji ? 500 : 300)) * (s.emoji ? 1.1 : 0.7) * schaal) * dt; s.y += s.vy * dt; s.rot += s.vrot * dt;
      if (s.y > h + 60) continue;
      ctx.save();
      ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      if (s.emoji) {
        ctx.font = `${Math.round(s.b)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.fillText(s.emoji, 0, 0);
      } else {
        ctx.fillStyle = s.kleur;
        if (s.rond) { ctx.beginPath(); ctx.arc(0, 0, s.b / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-s.b / 2, -s.h / 2, s.b, s.h * Math.abs(Math.cos(s.rot * 2)) + 2);
      }
      ctx.restore();
    }
    if (verstreken < duur) requestAnimationFrame(stap);
    else doek.remove();
  };
  requestAnimationFrame(stap);
}
