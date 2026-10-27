// Renders the article cards that build.mjs wrote to .cards/ into assets/cards/<slug>.jpg
// with headless Chrome. A card is re-rendered when it is new, or when its numbers
// changed and the current image is at least REFRESH_DAYS old (so the repo doesn't
// collect a new set of images every single day).
// node scripts/render-cards.mjs [--force]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, ".cards"), OUT = path.join(ROOT, "assets", "cards"), LOG = path.join(ROOT, "data", "cards.json");
const REFRESH_DAYS = 7, FORCE = process.argv.includes("--force");
// Bump STYLE whenever the card designs in cards.mjs change, so every card is redrawn once.
const STYLE = 2;
const FONT_DIR = process.env.FONT_DIR || "/tmp/fonts/node_modules/@fontsource/inter/files";
const SERIF_DIR = process.env.SERIF_DIR || "/tmp/fonts/node_modules/@fontsource/source-serif-4/files";
const today = new Date().toISOString().slice(0, 10);

const chrome = [process.env.CHROME, "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].filter(Boolean).find(c => { try { execFileSync(c, ["--version"], { stdio: "ignore" }); return true; } catch (e) { return false; } });
if (!chrome) { console.log("No Chrome found, skipping card render."); process.exit(0); }
if (!fs.existsSync(path.join(SRC, "manifest.json"))) { console.log("No cards to render."); process.exit(0); }

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "manifest.json"), "utf8"));
const log = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : {};
const hasFont = fs.existsSync(path.join(FONT_DIR, "inter-latin-900-normal.woff2")) && fs.existsSync(path.join(SERIF_DIR, "source-serif-4-latin-700-normal.woff2"));
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync("/tmp/cards-");
let done = 0, kept = 0;
for (const [slug, m] of Object.entries(manifest)) {
  const jpg = path.join(OUT, slug + ".jpg"), prev = log[slug];
  const age = prev ? (Date.parse(today) - Date.parse(prev.rendered)) / 864e5 : Infinity;
  if (!FORCE && fs.existsSync(jpg) && prev && prev.style === STYLE && (prev.hash === m.hash || age < REFRESH_DAYS)) { kept++; continue; }
  let html = fs.readFileSync(path.join(SRC, slug + ".html"), "utf8");
  html = hasFont ? html.split("__FONT__").join("file://" + FONT_DIR).split("__SERIF__").join("file://" + SERIF_DIR) : html.replace(/@font-face\{[^}]*\}/g, "");
  const file = path.join(tmp, slug + ".html");
  fs.writeFileSync(file, html);
  execFileSync(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--allow-file-access-from-files", "--window-size=1200,630", "--virtual-time-budget=3000", "--screenshot=" + jpg, "file://" + file], { stdio: "ignore" });
  log[slug] = { hash: m.hash, kind: m.kind, style: STYLE, rendered: today };
  done++;
}
// drop log entries for cards that no longer exist
for (const k of Object.keys(log)) if (!manifest[k]) delete log[k];
fs.writeFileSync(LOG, JSON.stringify(log, null, 1) + "\n");
console.log(`Cards: rendered ${done}, kept ${kept}${hasFont ? "" : " (Inter font not found, used system fonts)"}`);
