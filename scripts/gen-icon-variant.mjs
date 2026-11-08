// Re-render an existing icon in a different state, using the original render as the reference so the object stays identical.
import { readFileSync, writeFileSync } from 'node:fs';
const key = process.env.GEMINI_API_KEY;
const [refPath, outPath, instruction] = process.argv.slice(2);
const ref = readFileSync(refPath).toString('base64');
const prompt = `The attached image is an app icon: a chunky 3D clay object on a flat magenta background. Re-render THE SAME EXACT OBJECT with the same shape, proportions, camera angle, lighting, materials, framing and size, changing only this: ${instruction}. Keep the background a perfectly flat uniform bright magenta #FF00FF with only a small soft contact shadow under the object. No text.`;
const body = { contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: ref } }, { text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], temperature: 0.25, imageConfig: { aspectRatio: '1:1' } } };
for (let attempt = 1; attempt <= 3; attempt++) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent?key=${key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { console.log(`HTTP ${res.status}`); await new Promise(r => setTimeout(r, 4000)); continue; }
  const part = (await res.json()).candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) continue;
  writeFileSync(outPath, Buffer.from(part.inlineData.data, 'base64')); console.log(outPath, 'ok'); process.exit(0);
}
console.log('FAILED'); process.exit(1);
