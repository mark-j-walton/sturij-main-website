'use client'
// The swatch rail beside every remixable image block: four slots, always. An empty slot is the example
// roundel Mark supplied, very transparent — where the visitor's swatch (made in the range) will land; a
// made swatch replaces its placeholder in position, so the function is obvious. Tapping a swatch REMIXES
// the block's own image into the block's own room type, true to the scheme. One dismissible call-out per
// block; dismissing one dismisses all and shows the reminder toast (the provider holds that state).
import Image from 'next/image'
import { MAX_SWATCHES, useConfigurator, type Swatch } from './ConfiguratorProvider'

export const RANGE_ANCHOR = '#range'
export const PLACEHOLDER_SRC = '/brand/sturij-roundel-sample.png'

export interface SwatchRailProps {
  /** `block`: remix the named target in its fixed room; `stack`: remix the card currently pinned. */
  variant: 'block' | 'stack'
  targetKey?: string
  /** The room the block renders, in words — for the placeholder's label and the call-out. */
  roomLabel: string
  className: string
  id: string
  /** Which of the four slots this rail shows (the stacking cards split them two and two). */
  slots?: [number, number]
  /** Show the block's call-out on this rail. */
  tip?: boolean
}

export function SwatchRail({ variant, targetKey, roomLabel, className, id, slots = [0, MAX_SWATCHES], tip }: SwatchRailProps) {
  const { swatches, remixInto, visualiseCurrentCard, tipsDismissed, dismissTips } = useConfigurator()
  const indices: number[] = []
  for (let i = slots[0]; i < slots[1]; i++) indices.push(i)
  const act = (s: Swatch) => (variant === 'stack' ? visualiseCurrentCard(s) : targetKey ? remixInto(targetKey, s) : undefined)
  const toRange = () => document.querySelector(RANGE_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const showTip = !!tip && !tipsDismissed && swatches.length === 0
  const room = roomLabel.toLowerCase()

  return (
    <div className={className} id={id} role="group" aria-label="Your swatches" data-artifact="swatch-rail" data-count={swatches.length} data-placeholders={indices.filter((i) => !swatches[i]).length}>
      {indices.map((i) => {
        const s = swatches[i]
        return s ? (
          <button key={`s${s.n}`} type="button" className="swthumb" title={`Remix this ${room} in swatch ${s.n}'s scheme`} onClick={() => act(s)} data-slot={i + 1}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.thumb} alt={`Swatch ${s.n}: ${s.picks.doors.name}, ${s.picks.carcass.name}, ${s.picks.handle.name} — remix this ${room}`} width={72} height={72} />
          </button>
        ) : (
          <span key={`e${i}`} className="swslot-wrap" data-slot={i + 1}>
            <button type="button" className="swslot empty" aria-label={`Swatch ${i + 1} of ${MAX_SWATCHES} — make one in the range and it lands here; tap it to remix this ${room}`} title={`Swatch ${i + 1} of ${MAX_SWATCHES} — made in the range`} onClick={toRange}>
              <Image src={PLACEHOLDER_SRC} alt="" width={72} height={72} sizes="72px" aria-hidden />
            </button>
            {showTip && i === slots[0] && (
              <div className="swtip" role="note" data-swatch-tip>
                <div className="swtip-k">Your swatches land here</div>
                <p>Make a swatch in the range — doors, carcass, handle — and it appears in these four places. Tap it to remix this {room} in your scheme.</p>
                <button type="button" className="swtip-x" onClick={dismissTips} aria-label="Dismiss this tip">Got it</button>
              </div>
            )}
          </span>
        )
      })}
    </div>
  )
}
