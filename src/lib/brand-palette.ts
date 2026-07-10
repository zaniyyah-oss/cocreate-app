// Fixed brand palette — used for devotional accent_color and collection tag_color.
// Keys MUST match the DB CHECK constraint on devotional_templates.accent_color
// and collections.tag_color.

export type BrandColorKey =
  | "navy"
  | "limelight"
  | "teal"
  | "lime"
  | "amber"
  | "burgundy"
  | "blush"
  | "cream"
  | "ink"
  | "fire_red"
  | "hot_pink"
  | "periwinkle";

export type BrandColor = {
  key: BrandColorKey;
  label: string;
  hex: string;
  /** A readable text color to pair on top of `hex`. */
  onHex: string;
};

export const BRAND_PALETTE: BrandColor[] = [
  { key: "navy",       label: "Navy",       hex: "#181A4D", onHex: "#FBF8ED" },
  { key: "limelight",  label: "Limelight",  hex: "#DCE07A", onHex: "#181A4D" },
  { key: "teal",       label: "Teal",       hex: "#0F4A42", onHex: "#FBF8ED" },
  { key: "lime",       label: "Lime",       hex: "#CAC307", onHex: "#181A4D" },
  { key: "amber",      label: "Amber",      hex: "#FFAE00", onHex: "#181A4D" },
  { key: "burgundy",   label: "Burgundy",   hex: "#441B07", onHex: "#FBF8ED" },
  { key: "blush",      label: "Blush",      hex: "#E990A2", onHex: "#181A4D" },
  { key: "cream",      label: "Cream",      hex: "#FBF8ED", onHex: "#181A4D" },
  { key: "ink",        label: "Ink",        hex: "#20201C", onHex: "#FBF8ED" },
  { key: "fire_red",   label: "Fire Red",   hex: "#FF340C", onHex: "#FBF8ED" },
  { key: "hot_pink",   label: "Hot Pink",   hex: "#FF3E9A", onHex: "#FBF8ED" },
  { key: "periwinkle", label: "Periwinkle", hex: "#8A96E0", onHex: "#181A4D" },
];

const BY_KEY: Record<BrandColorKey, BrandColor> = BRAND_PALETTE.reduce(
  (acc, c) => { acc[c.key] = c; return acc; },
  {} as Record<BrandColorKey, BrandColor>,
);

export function brandColor(key: string | null | undefined): BrandColor | null {
  if (!key) return null;
  return (BY_KEY as any)[key] ?? null;
}
