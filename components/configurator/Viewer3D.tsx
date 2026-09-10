'use client'
// §4 The CSS-3D board: top face the swatch texture, front and side edges darkened, a diagonal sheen; drag
// rotates (rx clamped 12–86°), wheel zooms 0.6–2.2×; initial pose rotateX(58°) rotateZ(−32°).
import { useRef } from 'react'
import type { Tile } from '@/lib/galleries'
import { tileBackground } from './canvas'

export function Viewer3D({ tile }: { tile: Tile }) {
  const slab = useRef<HTMLDivElement>(null)
  const pose = useRef({ rx: 58, rz: -32, sc: 1 })
  const drag = useRef<[number, number] | null>(null)
  const apply = () => { const p = pose.current; if (slab.current) slab.current.style.transform = `rotateX(${p.rx}deg) rotateZ(${p.rz}deg) scale(${p.sc})` }
  const bg = tileBackground(tile)
  return (
    <div
      className="stage3d"
      onWheel={(e) => { e.preventDefault(); const p = pose.current; p.sc = Math.max(0.6, Math.min(2.2, p.sc * (e.deltaY < 0 ? 1.08 : 0.93))); apply() }}
      onPointerDown={(e) => { drag.current = [e.clientX, e.clientY]; e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.classList.add('grabbing') }}
      onPointerMove={(e) => { const d = drag.current; if (!d) return; const p = pose.current; p.rz += (e.clientX - d[0]) * 0.35; p.rx = Math.max(12, Math.min(86, p.rx - (e.clientY - d[1]) * 0.3)); drag.current = [e.clientX, e.clientY]; apply() }}
      onPointerUp={(e) => { drag.current = null; e.currentTarget.classList.remove('grabbing') }}
      role="img"
      aria-label={`${tile.name} board in 3D — drag to rotate, scroll to zoom`}
    >
      <div className="slab" ref={slab} style={{ transform: 'rotateX(58deg) rotateZ(-32deg)' }}>
        <div className="face f-front" style={{ background: bg }} />
        <div className="face f-side" style={{ background: bg }} />
        <div className="face f-top" style={{ background: bg }} />
        <div className="face f-sheen" />
      </div>
    </div>
  )
}
