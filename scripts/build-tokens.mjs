#!/usr/bin/env node
// The instance -> app/tokens.css. Runs before next build; the generated file is not versioned (the instance is).
import { writeFileSync, mkdirSync } from 'node:fs'
import { loadInstance, toCss } from '../lib/platform/instance.mjs'

// next/font/google exposes each face as a CSS variable on <html>; the instance names the face, this maps it.
export const FONT_VARS = {
  'Fraunces': "var(--font-fraunces), 'Iowan Old Style', Palatino, Georgia, serif",
  'Inter': "var(--font-inter), system-ui, -apple-system, 'Segoe UI', sans-serif",
  'IBM Plex Mono': "var(--font-plex-mono), ui-monospace, Menlo, Consolas, monospace",
}

const instance = loadInstance('design/sturij-public/DESIGN.md')
mkdirSync('app', { recursive: true })
writeFileSync('app/tokens.css', toCss(instance, FONT_VARS))
console.log(`tokens: ${Object.keys(instance.palette).length} palette · ${Object.keys(instance.roles).length} roles · ${Object.keys(instance.custom).length} custom (the drift reading) -> app/tokens.css`)
