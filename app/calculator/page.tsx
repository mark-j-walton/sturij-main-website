// The calculator on its own page — declared in pages/calculator/layout.json. The range (the configurator)
// sits above it because the calculator reads the configurator's picks; the enquiry band below carries the band.
import type { Metadata } from 'next'
import { asset } from '@/lib/assets'
import { copyOf, loadContent } from '@/lib/slots'
import { Copy } from '@/components/Copy'
import { EnquiryBand } from '@/components/EnquiryBand'
import { NavBar } from '@/components/NavBar'
import { RevealObserver } from '@/components/RevealObserver'
import { SiteFooter } from '@/components/SiteFooter'
import { Calculator } from '@/components/calculator/Calculator'
import { CALCULATOR_VIEW } from '@/lib/calculator-data'
import { ConfiguratorProvider } from '@/components/configurator/ConfiguratorProvider'
import { FinishConfigurator } from '@/components/configurator/FinishConfigurator'
import { Lightbox } from '@/components/configurator/Lightbox'
import { RoomBuilder } from '@/components/configurator/RoomBuilder'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Sturij — A guide price for your fitted furniture',
  description: 'Choose what we are making, its width and its specification, compose your finishes, and see an honest guide band — the exact quote comes from the design visit, priced from the cutting list.',
  alternates: { canonical: '/calculator' },
}

export default async function CalculatorPage() {
  const content = await loadContent()
  const c = (id: string) => ({ id, value: copyOf(content, id) })
  const logo = asset('brand.logo-white').path
  return (
    <ConfiguratorProvider>
      <NavBar logo={logo} />
      <main id="top" className="calc-main" data-content-source={content.source}>
        <FinishConfigurator lead={<>
          <Copy slot={c('range.kicker')} as="div" className="kicker reveal" />
          <Copy slot={c('range.title')} as="h2" className="reveal" />
          <Copy slot={c('range.body')} as="p" className="reveal" />
        </>} />
        <Calculator kicker={c('calculator.kicker')} title={c('calculator.title')} body={c('calculator.body')} finishesHref="#range" standalone view={CALCULATOR_VIEW} />
        <EnquiryBand kicker={c('enquiry.kicker')} title={c('enquiry.title')} body={c('enquiry.body')} submit={c('enquiry.submit')} note={c('enquiry.note')} />
      </main>
      <SiteFooter logo={logo} tagline={c('footer.tagline')} copyright={c('footer.copyright')} />
      <RoomBuilder />
      <Lightbox />
      <RevealObserver />
    </ConfiguratorProvider>
  )
}
