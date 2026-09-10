'use client'
// The non-photographic preview: the configuration drawn as a shaded front elevation at its real
// proportions, the chosen board applied under a shading layer (the door styler's mechanism — one
// drawing per configuration serving every finish at any size; deterministic, instant, nothing invented).
// Fills are the configurator's tiles: a swatch image as an SVG pattern, or a gradient tile's colours.
import type { Tile } from '@/lib/galleries'
import type { CalculatorConfiguration, CalculatorOption } from '@/lib/calculator-data'

type BayCfg = 'hang' | 'double' | 'shelves' | 'drawers' | 'shoes'
const PATTERNS: Record<string, (i: number, n: number) => BayCfg> = {
  classic: (i, n) => (i === 0 || i === n - 1 ? 'hang' : 'double'),
  hishers: (i, n) => (i === Math.floor((n - 1) / 2) || i === Math.ceil((n - 1) / 2) ? 'shelves' : 'double'),
  drawers: (i, n) => (i === Math.floor(n / 2) ? 'drawers' : 'hang'),
  dressing: (i) => (i === 0 ? 'shoes' : i % 2 ? 'double' : 'shelves'),
}

export interface ElevationProps {
  configuration: CalculatorConfiguration
  widthMm: number
  heightMm: number
  bays: number | null
  option: CalculatorOption | null
  doors: Tile | null
  carcass: Tile | null
  handle: Tile | null
  /** Show the internals as if the doors were off — the layout's rails, shelves and drawers. */
  open?: boolean
}

let uid = 0

export function Elevation({ configuration, widthMm, heightMm, bays, option, doors, carcass, handle, open }: ElevationProps) {
  const id = `el${(uid = (uid + 1) % 1000)}`
  const W = 520
  const ratio = configuration.kind === 'run' ? heightMm / widthMm : (configuration.drawing?.heightMm ?? 800) / widthMm
  const H = Math.max(120, Math.min(420, W * ratio))
  const pad = 14
  const x0 = pad, y0 = pad, w = W - pad * 2, h = H - pad * 2

  const fill = (t: Tile | null, fallbackVar: string) => (t?.src ? `url(#${id}-${t.id.replace(/[^a-z0-9]/gi, '')})` : t?.gradient ? `url(#${id}-g-${t.id.replace(/[^a-z0-9]/gi, '')})` : fallbackVar)
  const defs = [doors, carcass, handle].filter((t): t is Tile => !!t).map((t) => {
    const key = t.id.replace(/[^a-z0-9]/gi, '')
    return t.src
      ? <pattern key={key} id={`${id}-${key}`} patternUnits="userSpaceOnUse" width={140} height={140}><image href={t.src} width={140} height={140} preserveAspectRatio="xMidYMid slice" /></pattern>
      : <linearGradient key={key} id={`${id}-g-${key}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={t.gradient?.[0]} /><stop offset="1" stopColor={t.gradient?.[1]} /></linearGradient>
  })

  const doorFill = fill(doors, 'var(--tint-linen)')
  const carcassFill = fill(carcass, 'var(--surface)')
  const handleFill = fill(handle, 'var(--ink-muted)')

  const panels: React.ReactNode[] = []
  if (configuration.kind === 'run') {
    const n = bays ?? 4
    const gap = 3
    const dw = (w - (n - 1) * gap) / n
    const pattern = PATTERNS[option?.id ?? 'classic'] ?? PATTERNS.classic!
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (dw + gap)
      const cfg = pattern(i, n)
      if (open) {
        // the carcass and the layout's internals
        panels.push(<rect key={`c${i}`} x={x} y={y0} width={dw} height={h} fill={carcassFill} className="el-carcass" />)
        const inner = (yy: number, k: string, thick = 2) => <line key={`${i}${k}`} x1={x + 4} y1={yy} x2={x + dw - 4} y2={yy} className="el-line" strokeWidth={thick} />
        if (cfg === 'hang') panels.push(inner(y0 + h * 0.16, 'r', 3))
        if (cfg === 'double') { panels.push(inner(y0 + h * 0.16, 'r1', 3)); panels.push(inner(y0 + h * 0.56, 'r2', 3)) }
        if (cfg === 'shelves') [0.2, 0.4, 0.6, 0.8].forEach((f, k) => panels.push(inner(y0 + h * f, `s${k}`)))
        if (cfg === 'drawers') { panels.push(inner(y0 + h * 0.14, 'r', 3)); [0.55, 0.7, 0.85].forEach((f, k) => panels.push(<rect key={`${i}d${k}`} x={x + 3} y={y0 + h * f} width={dw - 6} height={h * 0.12} fill={doorFill} className="el-drawer" />)) }
        if (cfg === 'shoes') { panels.push(inner(y0 + h * 0.14, 'r', 3)); [0.62, 0.74, 0.86].forEach((f, k) => panels.push(<line key={`${i}a${k}`} x1={x + 4} y1={y0 + h * f + 8} x2={x + dw - 4} y2={y0 + h * f} className="el-line" strokeWidth={1.2} />)) }
      } else {
        panels.push(<rect key={`d${i}`} x={x} y={y0} width={dw} height={h} fill={doorFill} className="el-door" />)
        // a bar handle on the closing edge, alternating hinge side
        const hx = i % 2 ? x + 6 : x + dw - 9
        panels.push(<rect key={`h${i}`} x={hx} y={y0 + h * 0.46} width={3} height={Math.min(28, h * 0.12)} rx={1.5} fill={handleFill} className="el-handle" />)
      }
    }
    // plinth
    panels.push(<rect key="plinth" x={x0} y={y0 + h - 6} width={w} height={6} fill={carcassFill} className="el-plinth" />)
  } else {
    const d = configuration.drawing ?? { drawers: 1, units: 1, heightMm: 800 }
    const gap = 6
    const uw = (w - (d.units - 1) * gap) / d.units
    const plinth = 8
    for (let u = 0; u < d.units; u++) {
      const x = x0 + u * (uw + gap)
      panels.push(<rect key={`u${u}`} x={x} y={y0} width={uw} height={h - plinth} fill={carcassFill} className="el-carcass" />)
      const top = d.shelf ? y0 + (h - plinth) * 0.45 : y0 + 3
      const dh = (y0 + h - plinth - top - 3) / d.drawers
      for (let k = 0; k < d.drawers; k++) {
        const y = top + k * dh
        panels.push(<rect key={`u${u}f${k}`} x={x + 3} y={y + 1.5} width={uw - 6} height={dh - 3} fill={doorFill} className="el-door" />)
        panels.push(<rect key={`u${u}h${k}`} x={x + uw / 2 - 14} y={y + dh / 2 - 1.5} width={28} height={3} rx={1.5} fill={handleFill} className="el-handle" />)
      }
      if (d.shelf) panels.push(<line key={`u${u}s`} x1={x + 4} y1={y0 + (h - plinth) * 0.2} x2={x + uw - 4} y2={y0 + (h - plinth) * 0.2} className="el-line" strokeWidth={2} />)
      panels.push(<rect key={`u${u}p`} x={x} y={y0 + h - plinth} width={uw} height={plinth} fill={carcassFill} className="el-plinth" />)
    }
  }

  return (
    <svg className="elevation" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${configuration.name}${option ? `, ${option.name}` : ''}, ${widthMm} mm wide${doors ? `, doors in ${doors.name}` : ''}${carcass ? `, carcass in ${carcass.name}` : ''}${handle ? `, handles in ${handle.name}` : ''} — a drawing, not a photograph`} data-elevation={configuration.id} data-doors={doors?.id ?? ''} data-carcass={carcass?.id ?? ''} data-handle={handle?.id ?? ''}>
      <defs>
        {defs}
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="white" stopOpacity="0.18" /><stop offset="0.5" stopColor="white" stopOpacity="0" /><stop offset="1" stopColor="black" stopOpacity="0.22" /></linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="white" stopOpacity="0.14" /><stop offset="0.45" stopColor="white" stopOpacity="0" /><stop offset="1" stopColor="black" stopOpacity="0.1" /></linearGradient>
      </defs>
      <rect x={x0 - 6} y={y0 - 6} width={w + 12} height={h + 12} className="el-wall" />
      {panels}
      {/* the shading layer: relief over whatever finish is applied — the styler's luminosity idea in two gradients */}
      <rect x={x0} y={y0} width={w} height={h} fill={`url(#${id}-shade)`} className="el-shade" />
      <rect x={x0} y={y0} width={w} height={h} fill={`url(#${id}-sheen)`} className="el-shade" />
    </svg>
  )
}
