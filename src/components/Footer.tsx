import zebraLogoLight from "@/assets/zebra-logo-light.png";

const Footer = () => {
  return (
    <footer className="bg-card text-card-foreground py-16">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="flex items-center gap-3">
            <img src={zebraLogoLight} alt="Zebra" className="h-8 object-contain" />
            <div>
              <p className="font-display text-2xl font-bold tracking-tighter">ZEBRA</p>
              <p className="text-sm text-muted-foreground font-mono">
                Business Path
              </p>
            </div>
          </div>
          <div className="flex gap-16">
            <div className="flex flex-col gap-3">
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase mb-1">Product</p>
              <a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="/#marketplace" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Marketplace</a>
              <a href="/studio" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Studio</a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase mb-1">Company</p>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</a>
            </div>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-border flex justify-between items-center">
          <p className="text-xs font-mono text-muted-foreground">
            © 2026 ZEBRA. All rights reserved.
          </p>
          <div className="zebra-stripes w-16 h-2" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
