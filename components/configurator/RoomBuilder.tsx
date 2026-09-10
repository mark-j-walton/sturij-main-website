'use client'
// §6 "Build the room": the swatch's preset rows (doors, handle, carcass) and the open categories (ceiling,
// walls, skirting; flooring in its own sub-panel) as small marquees; a pick snaps the row to a full bar.
// When all four are picked, "Choose a room →" hands to the feature image's room picker.
import { ROOM_TILES, type RoomCategory, type Tile } from '@/lib/galleries'
import { tileBackground } from './canvas'
import { roomComplete, useConfigurator, type Swatch } from './ConfiguratorProvider'
import { Ribbon } from './FinishConfigurator'

const ROWS: Array<[string, string]> = [['ceiling', 'Ceiling'], ['doors', 'Doors'], ['handle', 'Handle'], ['walls', 'Walls'], ['carcass', 'Carcass'], ['skirting', 'Skirting']]
const FIXED = new Set(['doors', 'handle', 'carcass'])

function Bar({ tile, onClick }: { tile: Tile; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp className={`cswatch${onClick ? ' pick' : ''}`} style={{ background: tileBackground(tile), backgroundSize: 'cover' }} onClick={onClick} title={onClick ? 'Change' : undefined} {...(onClick ? { type: 'button' as const } : {})}>
      <span>{tile.name}</span>
    </Comp>
  )
}

function Row({ k, label, swatch, onPick, onClear }: { k: string; label: string; swatch: Swatch; onPick: (cat: RoomCategory, t: Tile) => void; onClear: (cat: RoomCategory) => void }) {
  let inner
  if (FIXED.has(k)) inner = <Bar tile={swatch.picks[k as 'doors' | 'handle' | 'carcass']} />
  else {
    const cat = k as RoomCategory
    const chosen = swatch.room[cat]
    inner = chosen
      ? <Bar tile={chosen} onClick={() => onClear(cat)} />
      : <div className="cmini" data-cat={cat}><Ribbon tiles={ROOM_TILES[cat]} duration={30 + cat.length * 2} reverse={cat === 'walls' || cat === 'flooring'} onTile={(t) => onPick(cat, t)} sizes="96px" /></div>
  }
  return <div className="crow"><span className="cl">{label}</span>{inner}</div>
}

export function RoomBuilder() {
  const { builderFor, openBuilder, setRoomPick, visualiseFeature } = useConfigurator()
  const s = builderFor
  return (
    <div className={`cmp${s ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Build the room" onClick={(e) => { if (e.target === e.currentTarget) openBuilder(null) }}>
      {s && (
        <div className="cbox">
          <h3>Build the room</h3>
          <div className="csub">Your swatch is set — choose the ceiling, walls, skirting and flooring</div>
          <div id="crows">
            {ROWS.map(([k, label]) => <Row key={k} k={k} label={label} swatch={s} onPick={(cat, t) => setRoomPick(s.n, cat, t)} onClear={(cat) => setRoomPick(s.n, cat, null)} />)}
          </div>
          <div className="cfloorpanel"><Row k="flooring" label="Flooring" swatch={s} onPick={(cat, t) => setRoomPick(s.n, cat, t)} onClear={(cat) => setRoomPick(s.n, cat, null)} /></div>
          <div className="cacts">
            <button className="mbtn ghost" type="button" onClick={() => openBuilder(null)}>Close</button>
            <button className={`mbtn${roomComplete(s.room) ? '' : ' dis'}`} type="button" onClick={() => visualiseFeature(s)}>Choose a room →</button>
          </div>
        </div>
      )}
    </div>
  )
}
