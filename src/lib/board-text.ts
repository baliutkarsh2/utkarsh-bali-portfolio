/**
 * Rasterise a short string onto a dot field, so "404" is made of the same
 * material as the face: same renderer, same assembly, same dispersal.
 *
 * The text is drawn in the site's sans at grid resolution (4x supersampled),
 * its luminance read back, and returned in the baked-field format.
 */
import type { BoardField } from "@/content/portrait-types";

export function textField(text: string, w: number, h: number, fontFamily: string): BoardField | null {
  const ss = 4;
  const canvas = document.createElement("canvas");
  canvas.width = w * ss;
  canvas.height = h * ss;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  // Size the type to fill the height, then shrink until it fits the width.
  let size = h * ss * 0.92;
  ctx.font = `500 ${size}px ${fontFamily}`;
  const measured = ctx.measureText(text).width;
  if (measured > canvas.width * 0.96) size *= (canvas.width * 0.96) / measured;
  ctx.font = `500 ${size}px ${fontFamily}`;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + size * 0.04);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bytes = new Uint8Array(w * h);
  let count = 0;
  let sx = 0;
  let sy = 0;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      // Average the 4x4 block's coverage.
      let sum = 0;
      for (let y = 0; y < ss; y++)
        for (let x = 0; x < ss; x++) sum += data[(((j * ss + y) * canvas.width) + i * ss + x) * 4];
      const L = sum / (ss * ss * 255);
      if (L < 0.12) continue;
      bytes[j * w + i] = Math.max(13, Math.round(L * 255));
      count++;
      sx += i;
      sy += j;
    }
  }
  if (count === 0) return null;

  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return {
    w,
    h,
    count,
    datum: [-1, -1],
    center: [Math.round(sx / count), Math.round(sy / count)],
    rim: [],
    data: btoa(bin),
  };
}
