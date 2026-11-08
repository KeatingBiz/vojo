// Generate Vojo UI icons with Gemini image generation, Mojo as the style reference.
// Each icon is rendered on flat magenta, then keyed to transparency by scripts/key-icon.py.
import { readFileSync, writeFileSync } from 'node:fs';

const key = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-nano-banana-2.1';
const outDir = process.argv[2];
const only = process.argv[3] ? process.argv[3].split(',') : null;
const mojo = readFileSync('assets/mojo/idle.png').toString('base64');

const STYLE = `You are designing one app icon for Vojo, whose mascot is the attached character Mojo, a small purple living flame rendered like a Pixar character. Match Mojo's exact rendering style: a small, chunky 3D clay object, smooth sculpted forms, soft studio lighting, slightly rounded edges, rich saturated color, soft contact shadow, no outlines, no text, no letters. The object must be ONE simple bold silhouette that stays readable at 24 pixels, so no fine detail, no thin parts. Palette: violet #7C3AED, deep purple #1C1A3A, orange #F97316, cyan #8FE3FF, cool stone gray-blue. Center the object, filling about 70% of the frame, square composition, three-quarter view. BACKGROUND: a perfectly flat, uniform, bright magenta #FF00FF with no gradient, no vignette, no shadow on the background other than a small soft contact shadow directly under the object. Do not include Mojo himself unless the icon says so.`;

const ICONS = {
  'lantern-lit': 'A wooden lantern post with a warm orange flame glowing inside its glass. Lit, cozy.',
  'lantern-off': 'The same wooden lantern post with dark, unlit glass and no flame. Cold, dormant.',
  'island-lit': 'The island in miniature seen from above at an angle: a rounded purple-green island with a winding path, a few tiny purple trees, and a small standing stone at the top edge with a cyan glow in the water beside it.',
  'island-off': 'The same miniature island, dim and desaturated, no cyan glow, no lit lanterns.',
  'platform-lit': 'A round carved stone platform (a low stone disc with a ring pattern) with a small orange flame sitting on top of it.',
  'platform-off': 'The same round carved stone platform, cold, nothing on it.',
  'streak-flame': 'A single bold stylized flame icon, one smooth teardrop-shaped tongue of fire leaning slightly right with ONE small secondary tip on the left, sculpted in glossy clay: bright orange body fading to a deep purple base, with a glowing golden-yellow inner core shaped like a smaller flame. Clean, iconic, symmetric-feeling, no face, no sparks, no smoke, no base or ground. Reads instantly as a streak flame at 24 pixels.',
  'streak-out': "The same three-tipped flame shape rendered as dark charcoal, extinguished, with one tiny orange ember glowing at its base, and a thin wisp of smoke. No face.",
  'mushroom': 'A plump glowing orange mushroom with a purple stem, like the ones on the island, softly luminous.',
  'settings': 'A carved stone cog wheel with rounded teeth and a small purple glowing crystal set in its center.',
  'boss': 'The hooded silhouette of a tall dark glassy water creature with a curling wave crest and two cyan slit eyes; dark teal body, menacing but simple.',
  'mic-lit': 'A chunky clay microphone with a glowing orange capsule on a short purple stand. Recording.',
  'mic-off': 'The same chunky clay microphone with a dark unlit capsule. Idle.',
  'sun-lit': 'A rising sun over calm water: a smooth round orange-to-gold clay sun, half risen above a flat horizon of deep purple water, with a warm orange glow and five short rounded clay rays. Simple, bold.',
  'path-lit': 'Three round carved purple-gray stepping stones in a gentle winding diagonal path rising from bottom-left to top-right, evenly spaced, and a tiny orange flame burning on the topmost stone with a warm glow. Nothing else.',
  'hourglass': 'A chunky clay hourglass seen EXACTLY straight on, frontal orthographic view, perfectly symmetric left-right: two large rounded clear glass bulbs (pale cyan tinted glass with soft highlights) joined at a narrow waist, held by a deep purple clay frame with a thick rounded cap on top and bottom and two slim rounded pillars on the sides. Glowing orange sand fills the LOWER HALF of the top bulb with a FLAT level surface, a thin stream of sand falls through the waist, and a small glowing mound sits in the bottom bulb. The sand emits a warm orange glow onto the glass. The hourglass is tall and fills the frame vertically. Nothing else.',
  'lock': 'A rounded padlock carved from purple stone with a cyan keyhole glow.',
  'check': 'A thick rounded checkmark made of glowing orange clay.',
  'close': 'A thick rounded X made of glowing orange clay (like Mojo\'s core), two chunky bars crossing, seen straight on, FLOATING in mid-air with NO ground, NO contact shadow and NO base of any kind under it. The whole frame is only the X on flat magenta.',
};

async function gen(name, desc) {
  const body = {
    contents: [{ role: 'user', parts: [
      { inlineData: { mimeType: 'image/png', data: mojo } },
      { text: `${STYLE}\n\nICON TO DRAW: ${desc}` },
    ] }],
    generationConfig: { responseModalities: ['IMAGE'], temperature: 0.4, imageConfig: { aspectRatio: '1:1' } },
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) { console.log(`${name}: HTTP ${res.status} ${(await res.text()).slice(0, 160)}`); await new Promise(r => setTimeout(r, 4000)); continue; }
    const json = await res.json();
    const part = json.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!part) { console.log(`${name}: no image (attempt ${attempt})`); continue; }
    writeFileSync(`${outDir}/${name}.png`, Buffer.from(part.inlineData.data, 'base64'));
    console.log(`${name}: ok`);
    return;
  }
  console.log(`${name}: FAILED`);
}

const names = Object.keys(ICONS).filter(n => !only || only.includes(n));
// three at a time
for (let i = 0; i < names.length; i += 3) {
  await Promise.all(names.slice(i, i + 3).map(n => gen(n, ICONS[n])));
}
