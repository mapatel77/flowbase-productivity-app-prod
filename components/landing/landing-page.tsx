import { Navbar } from "./navbar";
import { HeroSection } from "./hero-section";
import { FeatureSection } from "./feature-section";
import { ProductShowcase } from "./product-showcase";
import { AIWorkflowSection } from "./ai-workflow-section";
import { CollaborationSection } from "./collaboration-section";
import { UseCasesSection } from "./use-cases-section";
import { PricingSection } from "./pricing-section";
import { TestimonialsSection } from "./testimonials-section";
import { FAQSection } from "./faq-section";
import { FinalCTASection } from "./final-cta-section";
import { Footer } from "./footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <HeroSection />
        <FeatureSection />
        <ProductShowcase />
        <AIWorkflowSection />
        <CollaborationSection />
        <UseCasesSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}
