const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          <div>
            <p className="font-display text-2xl font-bold tracking-tighter mb-2">ZEBRA</p>
            <p className="text-sm text-primary-foreground/50 font-mono">
              Digital Studio for Ethiopia
            </p>
          </div>
          <div className="flex gap-16">
            <div className="flex flex-col gap-3">
              <p className="font-mono text-xs tracking-widest text-primary-foreground/40 uppercase mb-1">Product</p>
              <a href="#" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">Features</a>
              <a href="#" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">Marketplace</a>
              <a href="#" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">Pricing</a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-mono text-xs tracking-widest text-primary-foreground/40 uppercase mb-1">Company</p>
              <a href="#" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">About</a>
              <a href="#" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">Contact</a>
              <a href="#" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">Blog</a>
            </div>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-primary-foreground/10 flex justify-between items-center">
          <p className="text-xs font-mono text-primary-foreground/30">
            © 2026 ZEBRA. All rights reserved.
          </p>
          <div className="zebra-stripes w-16 h-2" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
