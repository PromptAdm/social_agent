import { MarketingNav }          from '@/components/marketing/MarketingNav'
import { HeroSection }           from '@/components/marketing/HeroSection'
import { ProposalSection }       from '@/components/marketing/ProposalSection'
import { BenefitsSection }       from '@/components/marketing/BenefitsSection'
import { TransformationSection } from '@/components/marketing/TransformationSection'
import { PlansSection }          from '@/components/marketing/PlansSection'
import { WhyNezora }             from '@/components/marketing/WhyNezora'
import { TrustSection }          from '@/components/marketing/TrustSection'
import { FinalCTA }              from '@/components/marketing/FinalCTA'
import { MarketingFooter }       from '@/components/marketing/MarketingFooter'
import type { Metadata }         from 'next'

export const metadata: Metadata = {
  title:       'Nezora — Gestão de redes sociais com IA',
  description: 'Organize sua presença digital. Gere conteúdo com IA, agende publicações e acompanhe analytics reais — tudo em um só lugar.',
  openGraph: {
    title:       'Nezora — Gestão de redes sociais com IA',
    description: 'Organize sua presença digital. Gere conteúdo com IA, agende publicações e acompanhe analytics reais.',
    type:        'website',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090E]">
      <MarketingNav />
      <main>
        <HeroSection />
        <ProposalSection />
        <BenefitsSection />
        <TransformationSection />
        <PlansSection />
        <WhyNezora />
        <TrustSection />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </div>
  )
}
