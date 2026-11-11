"use client";

export function useGraphTheme(): "dark" | "light" {
  return "dark";
}

/** SVG and legend colors follow the surrounding color scheme. Canvas callers use the concrete palette. */
export function graphColor(dark: string, light: string) {
  return `light-dark(${light}, ${dark})`;
}
