import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import ProcessSection from "@/components/ProcessSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <div id="features">
          <FeaturesSection />
        </div>
        <div id="process">
          <ProcessSection />
        </div>
        <div id="marketplace">
          <CTASection />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
