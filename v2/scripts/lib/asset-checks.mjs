// Framing checks for site assets: slot aspect ratios and subject margins from an alpha mask.
export const SLOTS = { cover: 16 / 10, tall: 4 / 5, tile: 1, wide: 3 / 2 };

export function checkRatio({ width, height }, slot) {
  const target = SLOTS[slot];
  if (!target) return `unknown slot "${slot}"`;
  const actual = width / height;
  return Math.abs(actual - target) / target <= 0.005 ? null : `ratio ${actual.toFixed(3)} != ${slot} ${target.toFixed(3)}`;
}

export function checkMargins(bbox, { width, height }, { minMargin = 0.08, fillMin = 0.7, fillMax = 0.8, coverTop = false } = {}) {
  const errs = [];
  const m = { left: bbox.left / width, right: (width - bbox.right) / width, top: bbox.top / height, bottom: (height - bbox.bottom) / height };
  for (const [side, v] of Object.entries(m)) if (v < minMargin) errs.push(`${side} margin ${(v * 100).toFixed(1)}% < ${minMargin * 100}%`);
  const fill = (bbox.bottom - bbox.top) / height;
  if (fill < fillMin || fill > fillMax) errs.push(`fill ${(fill * 100).toFixed(1)}% outside ${fillMin * 100}-${fillMax * 100}%`);
  if (coverTop && bbox.bottom / height > 0.65 + 1e-9) errs.push(`subject bottom at ${((bbox.bottom / height) * 100).toFixed(1)}%, not in upper 65%`);
  return errs;
}

export async function alphaBBox(img) {
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y;
      }
    }
  }
  return right < 0 ? null : { left, top, right: right + 1, bottom: bottom + 1 };
}
