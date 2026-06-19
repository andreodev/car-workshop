import type { CSSProperties } from "react";

export type TenantThemeBranding = {
  title?: string | null;
  logoUrl?: string | null;
  primaryColor?: unknown;
  secondaryColor?: unknown;
};

export type TenantThemeStyle = CSSProperties & Record<`--${string}`, string>;

export const TENANT_THEME_CACHE_PREFIX = "car-workshop:tenant-theme:";
export const TENANT_THEME_CACHE_TTL_MS = 60 * 60 * 1000;

export function tenantThemeCacheKey(domain: string) {
  return `${TENANT_THEME_CACHE_PREFIX}${domain}`;
}

export function normalizeHexColor(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

export function getReadableForeground(background: string) {
  const normalized = normalizeHexColor(background);

  if (!normalized) {
    return "#ffffff";
  }

  const red = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const green = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255;

  const toLinear = (channel: number) =>
    channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);

  const luminance =
    0.2126 * toLinear(red) +
    0.7152 * toLinear(green) +
    0.0722 * toLinear(blue);

  return luminance > 0.55 ? "#111111" : "#ffffff";
}

export function buildTenantThemeStyle(
  branding: TenantThemeBranding | null | undefined
): TenantThemeStyle {
  const primaryColor = normalizeHexColor(branding?.primaryColor);
  const secondaryColor = normalizeHexColor(branding?.secondaryColor);
  const style: TenantThemeStyle = {};

  if (primaryColor) {
    const primaryForeground = getReadableForeground(primaryColor);

    style["--primary"] = primaryColor;
    style["--primary-foreground"] = primaryForeground;
    style["--ring"] = primaryColor;
    style["--sidebar-primary"] = primaryColor;
    style["--sidebar-primary-foreground"] = primaryForeground;
    style["--chart-1"] = primaryColor;
    style["--chart-3"] = primaryColor;
  }

  if (secondaryColor) {
    const secondaryForeground = getReadableForeground(secondaryColor);

    style["--secondary"] = secondaryColor;
    style["--secondary-foreground"] = secondaryForeground;
    style["--accent"] = secondaryColor;
    style["--accent-foreground"] = secondaryForeground;
    style["--sidebar-accent"] = secondaryColor;
    style["--sidebar-accent-foreground"] = secondaryForeground;
    style["--chart-2"] = secondaryColor;
    style["--chart-4"] = secondaryColor;
  }

  return style;
}

export function applyTenantThemeStyle(
  target: HTMLElement,
  branding: TenantThemeBranding | null | undefined
) {
  const style = buildTenantThemeStyle(branding);

  Object.entries(style).forEach(([property, value]) => {
    target.style.setProperty(property, value);
  });
}
