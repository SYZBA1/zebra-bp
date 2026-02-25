import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-32 bg-secondary">
      <div className="container">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="font-mono text-sm tracking-[0.3em] uppercase text-muted-foreground mb-6">
            Ready to begin?
          </p>
          <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-6">
            Transform your ideas into bank-ready documents.
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto">
            Join entrepreneurs and consultants across Ethiopia who trust ZEBRA 
            to architect professional feasibility studies and business plans.
          </p>
          <Button size="lg" className="group text-lg px-10 py-6">
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
