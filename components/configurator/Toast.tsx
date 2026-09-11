'use client'
// The one toast the page has: the reminder after the swatch call-outs are dismissed. Reads the provider.
import { useConfigurator } from './ConfiguratorProvider'

export function Toast() {
  const { toast } = useConfigurator()
  if (!toast) return null
  return (
    <div className="toast" role="status" aria-live="polite" data-toast>
      {toast}
    </div>
  )
}
