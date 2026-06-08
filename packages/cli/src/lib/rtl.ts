const ARABIC_RANGE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

export function hasArabic(text: string): boolean {
  return ARABIC_RANGE.test(text);
}

export function containsArabic(text: string): boolean {
  let arabicCount = 0;
  for (const char of text) {
    if (ARABIC_RANGE.test(char)) arabicCount++;
  }
  return arabicCount > 0;
}

export function getArabicRatio(text: string): number {
  if (!text) return 0;
  let arabicCount = 0;
  for (const char of text) {
    if (ARABIC_RANGE.test(char)) arabicCount++;
  }
  return arabicCount / text.length;
}

export function isMostlyArabic(text: string): boolean {
  return getArabicRatio(text) > 0.3;
}

const RLE = "\u202B";
const PDF = "\u202C";
const LRM = "\u200E";
const RLM = "\u200F";

export function wrapRTL(text: string): string {
  if (!containsArabic(text)) return text;
  return `${RLE}${text}${PDF}`;
}

export function wrapRTLForDisplay(text: string): { text: string; align: "left" | "right" } {
  if (!containsArabic(text)) return { text, align: "left" };
  return { text: `${RLE}${text}${PDF}`, align: "right" };
}

export function normalizeTextForDisplay(text: string): string {
  if (!containsArabic(text)) return text;
  return `${RLE}${text}${PDF}${LRM}`;
}
