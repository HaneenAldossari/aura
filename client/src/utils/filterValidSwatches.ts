import { getMakeupSwatchImage } from "./makeupSwatchImage";

type MakeupCategory = "foundation" | "lips" | "blush" | "bronzer" | "eyeshadow" | "nails";

/**
 * Filters out any shades that don't have a matching image.
 * Prevents solid-color fallback placeholders from showing.
 */
export function filterValidSwatches(
  category: MakeupCategory,
  shades: Array<{ name: string; hex?: string }>
): Array<{ name: string; hex?: string }> {
  return shades.filter(shade => getMakeupSwatchImage(category, shade.name) !== null);
}
