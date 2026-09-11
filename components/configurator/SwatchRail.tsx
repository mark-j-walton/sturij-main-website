'use client'
// The swatch rail: four slots, always. An empty slot is the example roundel Mark supplied, very transparent —
// where the visitor's swatch (made in the range) will land; a made swatch replaces its placeholder in position,
// so the function is obvious. Beside an image block, tapping a swatch REMIXES the block's own image into the
// block's own room type, true to the scheme. Beside the roundel in the range, the rail is where the session's
// swatches collect; tapping one there goes to the first image that can be remixed. One dismissible call-out
// per block; dismissing one dismisses all and shows the reminder toast (the provider holds that state).
import Image from 'next/image'
import { MAX_SWATCHES, useConfigurator, type Swatch } from './ConfiguratorProvider'

export const RANGE_ANCHOR = '#range'
export const GALLERIES_ANCHOR = '#galleries'
/** The first image block a swatch can remix — where the range's rail sends a tapped swatch. */
export const FIRST_REMIX_ANCHOR = '#wardrobes'
export const PLACEHOLDER_SRC = '/brand/sturij-roundel-sample.png'

export type SwatchRailVariant = 'block' | 'stack' | 'range'

export interface SwatchRailProps {
  /** `block`: remix the named target in its fixed room; `stack`: remix the card currently pinned; `range`: the roundel's own rail, where the swatches collect. */
  variant: SwatchRailVariant
  targetKey?: string
  /** The room the block renders, in words — for the placeholder's label and the call-out. */
  roomLabel: string
  className: string
  id: string
  /** Which of the four slots this rail shows (the stacking cards split them two and two). */
  slots?: [number, number]
  /** Show the block's call-out on this rail. */
  tip?: boolean
  /** The slot that carries the call-out: the first (beside an image) or the last (under the range's rail). */
  tipAt?: 'first' | 'last'
}

const scrollTo = (sel: string) => document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export function SwatchRail({ variant, targetKey, roomLabel, className, id, slots = [0, MAX_SWATCHES], tip, tipAt = 'first' }: SwatchRailProps) {
  const { swatches, remixInto, visualiseCurrentCard, tipsDismissed, dismissTips } = useConfigurator()
  const indices: number[] = []
  for (let i = slots[0]; i < slots[1]; i++) indices.push(i)
  const range = variant === 'range'
  const act = (s: Swatch) => {
    if (range) return scrollTo(FIRST_REMIX_ANCHOR)
    if (variant === 'stack') return visualiseCurrentCard(s)
    if (targetKey) remixInto(targetKey, s)
  }
  const onEmpty = () => scrollTo(range ? GALLERIES_ANCHOR : RANGE_ANCHOR)
  const showTip = !!tip && !tipsDismissed && swatches.length === 0
  const tipIndex = tipAt === 'last' ? indices[indices.length - 1] : indices[0]
  const room = roomLabel.toLowerCase()
  const swatchTitle = (s: Swatch) => (range ? `See swatch ${s.n} in a room` : `Remix this ${room} in swatch ${s.n}'s scheme`)
  const swatchAlt = (s: Swatch) => `Swatch ${s.n}: ${s.picks.doors.name}, ${s.picks.carcass.name}, ${s.picks.handle.name} — ${range ? 'see it in a room' : `remix this ${room}`}`
  const emptyLabel = (i: number) => (range
    ? `Swatch ${i + 1} of ${MAX_SWATCHES} — pick doors, carcass and a handle below and it lands here`
    : `Swatch ${i + 1} of ${MAX_SWATCHES} — make one in the range and it lands here; tap it to remix this ${room}`)
  const emptyTitle = (i: number) => `Swatch ${i + 1} of ${MAX_SWATCHES} — ${range ? 'made from the galleries below' : 'made in the range'}`

  return (
    <div className={className} id={id} role="group" aria-label="Your swatches" data-artifact="swatch-rail" data-variant={variant} data-count={swatches.length} data-placeholders={indices.filter((i) => !swatches[i]).length}>
      {indices.map((i) => {
        const s = swatches[i]
        return s ? (
          <button key={`s${s.n}`} type="button" className="swthumb" title={swatchTitle(s)} onClick={() => act(s)} data-slot={i + 1}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.thumb} alt={swatchAlt(s)} width={72} height={72} />
          </button>
        ) : (
          <span key={`e${i}`} className="swslot-wrap" data-slot={i + 1}>
            <button type="button" className="swslot empty" aria-label={emptyLabel(i)} title={emptyTitle(i)} onClick={onEmpty}>
              <Image src={PLACEHOLDER_SRC} alt="" width={72} height={72} sizes="72px" aria-hidden />
            </button>
            {showTip && i === tipIndex && (
              <div className="swtip" role="note" data-swatch-tip>
                {range ? (
                  <>
                    <div className="swtip-k">Your swatches collect here</div>
                    <p>Pick doors, carcass and a handle below; your swatch lands here. Tap it to see it in a room.</p>
                  </>
                ) : (
                  <>
                    <div className="swtip-k">Your swatches land here</div>
                    <p>Make a swatch in the range — doors, carcass, handle — and it appears in these four places. Tap it to remix this {room} in your scheme.</p>
                  </>
                )}
                <button type="button" className="swtip-x" onClick={dismissTips} aria-label="Dismiss this tip">Got it</button>
              </div>
            )}
          </span>
        )
      })}
    </div>
  )
}
