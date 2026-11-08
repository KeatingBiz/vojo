// Generate a Mojo clip with Gemini Omni 1.2 Flash (first [+ last] frame interpolation).
// Usage: node scripts/gen-mojo-video.mjs --first a.jpg [--last b.jpg] --prompt "..." --duration 4 --out clip.mp4
import { readFileSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('GEMINI_API_KEY missing');
if (!args.first || !args.prompt || !args.out) throw new Error('need --first --prompt --out');

const GUARDS = process.env.MOJO_GUARDS ??
  ' The character is a small living flame with a rounded blob body, two large eyes, and two short stubby arms. It has NO mouth: never draw a mouth, lips, smile line, teeth or tongue; all expression comes from the eyes, eyebrows, arms, flame tips and inner glow. It has NO legs and NO feet, never grows legs, never walks, hops, jumps or travels. Its base stays planted in the same spot on the ground for the entire clip and it stays centered in frame. CRITICAL FRAMING: the character must stay EXACTLY the same size and position as in the reference image for the entire clip, occupying the same area in the center of the frame with the same empty margins above and below; do not enlarge it, do not zoom, do not move the camera closer. Locked camera: no zoom, no pan, no cut. Plain solid dark background exactly like the reference, no particles, no sparks, no smoke, no light flares, no text. No sound, silent clip.';

const input = [{ type: 'image', mime_type: 'image/jpeg', data: readFileSync(args.first).toString('base64') }];
if (args.last) input.push({ type: 'image', mime_type: 'image/jpeg', data: readFileSync(args.last).toString('base64') });
input.push({ type: 'text', text: args.prompt + GUARDS });

const body = {
  model: 'gemini-omni-1.2-flash',
  input,
  response_format: { type: 'video', aspect_ratio: '9:16', resolution: process.env.OMNI_RES ?? '720p', duration: `${args.duration ?? 4}s`, delivery: 'uri' },
  store: true,
  background: false,
};

const t0 = Date.now();
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
if (!res.ok) throw new Error(`omni ${res.status}: ${(await res.text()).slice(0, 600)}`);
const json = await res.json();
let part = null;
for (const st of json.steps ?? []) if (st.type === 'model_output') for (const c of st.content ?? []) if (c.type === 'video') part = c;
if (!part) throw new Error('no video in response: ' + JSON.stringify(json).slice(0, 600));

let buf;
if (part.data) buf = Buffer.from(part.data, 'base64');
else if (part.uri) {
  const sep = part.uri.includes('?') ? '&' : '?';
  const url = part.uri.includes('key=') ? part.uri : `${part.uri}${sep}key=${key}`;
  for (let i = 0; i < 40; i++) {
    const dl = await fetch(url);
    if (dl.ok && (dl.headers.get('content-type') ?? '').startsWith('video')) { buf = Buffer.from(await dl.arrayBuffer()); break; }
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!buf) throw new Error('uri never became downloadable: ' + part.uri);
} else throw new Error('video part has neither data nor uri');

writeFileSync(args.out, buf);
console.log(`wrote ${args.out} (${(buf.length / 1024).toFixed(0)} KB) in ${((Date.now() - t0) / 1000).toFixed(0)}s; usage=${JSON.stringify(json.usage ?? null)}`);
