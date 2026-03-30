import HeroSection from "@/components/HeroSection";
import AgentShowcase from "@/components/AgentShowcase";
import FrameworksSection from "@/components/FrameworksSection";
import PricingSection from "@/components/PricingSection";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AgentShowcase />
      <FrameworksSection />
      <PricingSection />
      <HowItWorks />
      <Footer />
    </>
  );
}
