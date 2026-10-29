/**
 * Color conversion utilities for hex input fallback (Safari compatibility)
 *
 * Safari macOS users cannot use the native HA color picker as clicking the
 * swatch doesn't record changes. These utilities enable a text-based fallback.
 */

export type RGBTuple = [number, number, number];

/**
 * Convert an RGB tuple to a hex color string.
 *
 * @param rgb - RGB tuple [r, g, b] with values 0-255
 * @returns Hex color string like "#FF5500"
 */
export function rgbToHex(rgb: RGBTuple | undefined): string {
  if (!rgb || rgb.length !== 3) return "#000000";
  const [r, g, b] = rgb;
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Parse a color input string into an RGB tuple.
 *
 * Supported formats:
 * - Hex with hash: #RGB, #RRGGBB
 * - Hex without hash: RGB, RRGGBB
 * - Comma-separated: "255, 128, 0" or "255,128,0"
 * - RGB function: "rgb(255, 128, 0)"
 *
 * @param value - Color string in any supported format
 * @returns RGB tuple [r, g, b] or null if parsing failed
 */
export function parseColorInput(value: string): RGBTuple | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Try hex format: #RGB, #RRGGBB, RGB, RRGGBB
  const hexMatch = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    // Expand shorthand (#RGB -> #RRGGBB)
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  // Try comma-separated RGB: "255, 128, 0" or "255,128,0"
  const rgbMatch = trimmed.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10));
    const g = Math.min(255, parseInt(rgbMatch[2], 10));
    const b = Math.min(255, parseInt(rgbMatch[3], 10));
    return [r, g, b];
  }

  // Try rgb() format: "rgb(255, 128, 0)"
  const rgbFuncMatch = trimmed.match(
    /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  );
  if (rgbFuncMatch) {
    const r = Math.min(255, parseInt(rgbFuncMatch[1], 10));
    const g = Math.min(255, parseInt(rgbFuncMatch[2], 10));
    const b = Math.min(255, parseInt(rgbFuncMatch[3], 10));
    return [r, g, b];
  }

  return null;
}
