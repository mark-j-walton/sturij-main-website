// The public page — declared in pages/home/layout.json, its copy in content/copy.seed.json, its images by
// asset id in lib/slots.ts. Rendered on the server from the current slots (ISR); the configurator, the
// scroll recipes and the admin editing mode hydrate on the client.
import { asset } from '@/lib/assets'
import { copyOf, imageOf, loadContent } from '@/lib/slots'
import { Copy } from '@/components/Copy'
import { EnquiryBand } from '@/components/EnquiryBand'
import { Features } from '@/components/Features'
import { Manifesto } from '@/components/Manifesto'
import { Montage } from '@/components/Montage'
import { NavBar } from '@/components/NavBar'
import { PageVeil } from '@/components/PageVeil'
import { PanelStack } from '@/components/PanelStack'
import { RevealObserver } from '@/components/RevealObserver'
import { SiteFooter } from '@/components/SiteFooter'
import { StackCards } from '@/components/StackCards'
import { StatementBand } from '@/components/StatementBand'
import { Calculator } from '@/components/calculator/Calculator'
import { CALCULATOR_VIEW } from '@/lib/calculator-data'
import { FinishConfigurator } from '@/components/configurator/FinishConfigurator'
import { ConfiguratorProvider } from '@/components/configurator/ConfiguratorProvider'
import { Lightbox } from '@/components/configurator/Lightbox'
import { RoomBuilder } from '@/components/configurator/RoomBuilder'
import { Toast } from '@/components/configurator/Toast'

export const revalidate = 60

export default async function Page() {
  const content = await loadContent()
  const c = (id: string) => ({ id, value: copyOf(content, id) })
  const img = (id: string) => imageOf(content, id)
  const logo = asset('brand.logo-white').path

  return (
    <ConfiguratorProvider>
      <PageVeil logo={logo} />
      <NavBar logo={logo} />
      <main id="top" data-content-source={content.source}>
        <PanelStack panels={[
          { id: 'hero', hero: true, kicker: c('hero.kicker'), title: c('hero.title'), body: c('hero.body'), imageSlot: 'hero.image', image: img('hero.image') },
          { id: 'wardrobes', kicker: c('panel.wardrobes.kicker'), title: c('panel.wardrobes.title'), body: c('panel.wardrobes.body'), imageSlot: 'panel.wardrobes.image', image: img('panel.wardrobes.image') },
          { id: 'media', kicker: c('panel.media.kicker'), title: c('panel.media.title'), body: c('panel.media.body'), imageSlot: 'panel.media.image', image: img('panel.media.image') },
          { id: 'finishes', kicker: c('panel.finishes.kicker'), title: c('panel.finishes.title'), body: c('panel.finishes.body'), imageSlot: 'panel.finishes.image', image: img('panel.finishes.image') },
        ]} />

        <FinishConfigurator lead={<>
          <Copy slot={c('range.kicker')} as="div" className="kicker reveal" />
          <Copy slot={c('range.title')} as="h2" className="reveal" />
          <Copy slot={c('range.body')} as="p" className="reveal" />
        </>} />

        <Features features={[
          { id: 'wardrobes', room: 'bedroom', kicker: c('feature.wardrobes.kicker'), title: c('feature.wardrobes.title'), body: c('feature.wardrobes.body'), cta: c('feature.wardrobes.cta'), imageSlot: 'feature.wardrobes.image', image: img('feature.wardrobes.image') },
          { id: 'media', room: 'living-room', reverse: true, kicker: c('feature.media.kicker'), title: c('feature.media.title'), body: c('feature.media.body'), cta: c('feature.media.cta'), imageSlot: 'feature.media.image', image: img('feature.media.image') },
        ]} />

        <div className="stksec">
          <StatementBand kicker={c('statement.kicker')} text={c('statement.text')} />
          <StackCards kicker={c('stack.kicker')} title={c('stack.title')} cards={[1, 2, 3, 4].map((n) => ({ kicker: c(`stack.${n}.kicker`), title: c(`stack.${n}.title`), imageSlot: `stack.${n}.image`, image: img(`stack.${n}.image`) }))} />
        </div>

        <Montage label={c('montage.label')} images={['montage.image', 'montage.image-2', 'montage.image-3'].map((id) => ({ slot: id, image: img(id) }))} />

        <Manifesto kicker={c('manifesto.kicker')} title={c('manifesto.title')} steps={[1, 2, 3].map((n) => ({ no: `0${n}`, title: c(`manifesto.${n}.title`), body: c(`manifesto.${n}.body`) }))} />

        <Calculator kicker={c('calculator.kicker')} title={c('calculator.title')} body={c('calculator.body')} finishesHref="#range" view={CALCULATOR_VIEW} />

        <EnquiryBand kicker={c('enquiry.kicker')} title={c('enquiry.title')} body={c('enquiry.body')} submit={c('enquiry.submit')} note={c('enquiry.note')} />
      </main>

      <SiteFooter logo={logo} tagline={c('footer.tagline')} copyright={c('footer.copyright')} />

      <RoomBuilder />
      <Lightbox />
      <Toast />
      <RevealObserver />
    </ConfiguratorProvider>
  )
}
