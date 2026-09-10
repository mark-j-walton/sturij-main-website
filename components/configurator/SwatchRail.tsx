'use client'
// The swatch rails (README §6, §8): the session's completed swatches as hex thumbnails. The feature rail
// opens the room builder for the swatch; the stacking rail generates into the card currently pinned.
import { useConfigurator } from './ConfiguratorProvider'

export function SwatchRail({ variant, className, id }: { variant: 'feature' | 'stack'; className: string; id: string }) {
  const { swatches, openBuilder, visualiseCurrentCard } = useConfigurator()
  return (
    <div className={className} id={id} role="group" aria-label="Your swatches" data-artifact="swatch-rail" data-count={swatches.length}>
      {swatches.map((s) => (
        <button
          key={s.n}
          type="button"
          className="swthumb"
          title={variant === 'feature' ? 'Visualise this swatch in a room' : 'Apply this swatch to the room shown'}
          onClick={() => (variant === 'feature' ? openBuilder(s) : visualiseCurrentCard(s))}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.thumb} alt={`Swatch ${s.n}: ${s.picks.doors.name}, ${s.picks.carcass.name}, ${s.picks.handle.name}`} width={72} height={72} />
        </button>
      ))}
    </div>
  )
}
