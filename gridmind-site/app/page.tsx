import HeroSection from "@/components/HeroSection";
import AgentShowcase from "@/components/AgentShowcase";
import EnginesSection from "@/components/EnginesSection";
import PricingSection from "@/components/PricingSection";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AgentShowcase />
      <EnginesSection />
      <PricingSection />
      <HowItWorks />
      <Footer />
    </>
  );
}
