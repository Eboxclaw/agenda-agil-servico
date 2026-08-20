// Gera os ícones da PWA a partir de um SVG único (sol + painel + visto).
// Uso: bun scripts/gen-icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BG = "#0f172b"; // --primary do tema (oklch(0.208 0.042 265.755))
const SOL = "#f7b733";
const VISTO = "#22c55e";

function svgIcon(escala = 1) {
  // escala < 1 encolhe o glifo para a zona segura dos maskable (80%)
  const g = [
    // sol
    `<circle cx="512" cy="350" r="105" fill="${SOL}"/>`,
    `<g stroke="${SOL}" stroke-width="36" stroke-linecap="round">`,
    ...[0, 45, 90, 135, 180, 225, 270, 315]
      .map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 512 + 150 * Math.cos(rad);
        const y1 = 350 + 150 * Math.sin(rad);
        const x2 = 512 + 198 * Math.cos(rad);
        const y2 = 350 + 198 * Math.sin(rad);
        return `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}"/>`;
      })
      .join(""),
    `</g>`,
    // painel solar com grelha
    `<rect x="272" y="520" width="480" height="330" rx="36" fill="none" stroke="#fff" stroke-width="36"/>`,
    `<line x1="512" y1="538" x2="512" y2="832" stroke="#fff" stroke-width="26"/>`,
    `<line x1="290" y1="685" x2="734" y2="685" stroke="#fff" stroke-width="26"/>`,
    // selo de serviço concluído
    `<circle cx="735" cy="820" r="84" fill="${VISTO}" stroke="${BG}" stroke-width="22"/>`,
    `<polyline points="695,820 726,850 778,792" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join("");
  const inner =
    escala === 1
      ? g
      : `<g transform="translate(512 512) scale(${escala}) translate(-512 -512)">${g}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${BG}"/>${inner}</svg>`;
}

const destinos = [
  { f: "icon-64.png", tam: 64, escala: 1 },
  { f: "icon-128.png", tam: 128, escala: 1 },
  { f: "icon-192.png", tam: 192, escala: 1 },
  { f: "icon-512.png", tam: 512, escala: 1 },
  { f: "icon-maskable-192.png", tam: 192, escala: 0.78 },
  { f: "icon-maskable-512.png", tam: 512, escala: 0.78 },
  { f: "../apple-touch-icon.png", tam: 180, escala: 1 },
];

await mkdir("public/icons", { recursive: true });
await writeFile("scripts/icon.svg", svgIcon(1), "utf8");
for (const { f, tam, escala } of destinos) {
  const destino = `public/icons/${f}`;
  await sharp(Buffer.from(svgIcon(escala))).resize(tam, tam).png().toFile(destino);
  console.log("✓", destino);
}
