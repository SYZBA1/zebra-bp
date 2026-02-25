import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <a href="/" className="font-display text-xl font-bold tracking-tighter">
          ZEBRA
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#process" className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
            Process
          </a>
          <a href="#marketplace" className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
            Marketplace
          </a>
          <Button size="sm" onClick={() => navigate("/studio")}>Enter Studio</Button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background p-6 flex flex-col gap-4">
          <a href="#features" className="text-sm font-mono" onClick={() => setOpen(false)}>Features</a>
          <a href="#process" className="text-sm font-mono" onClick={() => setOpen(false)}>Process</a>
          <a href="#marketplace" className="text-sm font-mono" onClick={() => setOpen(false)}>Marketplace</a>
          <Button size="sm" className="w-full" onClick={() => { setOpen(false); navigate("/studio"); }}>Enter Studio</Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
