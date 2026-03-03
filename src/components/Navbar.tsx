import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Sun, Moon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getStoredTheme, setStoredTheme } from "@/lib/theme";
import ProfileSidebar from "@/components/ProfileSidebar";
import zebraLogoLight from "@/assets/zebra-logo-light.png";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [theme, setTheme] = useState(getStoredTheme());
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleStudio = () => navigate(session ? "/studio" : "/auth");
  const toggleTheme = () => { const next = theme === "dark" ? "light" : "dark"; setTheme(next); setStoredTheme(next); };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <a href="/" className="flex items-center gap-2">
          <img src={zebraLogoLight} alt="Zebra" className="h-6 object-contain" />
          <span className="font-display text-xl font-bold tracking-tighter">ZEBRA</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="/#features" className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="/#process" className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">Process</a>
          <button onClick={() => navigate("/marketplace")} className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">Marketplace</button>
          <button onClick={() => navigate("/about")} className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">About</button>
          <button onClick={() => navigate("/blog")} className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">Blog</button>
          <button onClick={() => navigate("/contact")} className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">Contact</button>
          <button onClick={toggleTheme} className="p-1.5 rounded hover:bg-secondary transition-colors">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {session && (
            <ProfileSidebar>
              <button className="p-1.5 rounded-full border border-border hover:bg-secondary transition-colors">
                <User className="h-4 w-4" />
              </button>
            </ProfileSidebar>
          )}
          <Button size="sm" onClick={handleStudio}>Enter Studio</Button>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background p-6 flex flex-col gap-4">
          <a href="/#features" className="text-sm font-mono" onClick={() => setOpen(false)}>Features</a>
          <a href="/#process" className="text-sm font-mono" onClick={() => setOpen(false)}>Process</a>
          <button className="text-sm font-mono text-left" onClick={() => { setOpen(false); navigate("/marketplace"); }}>Marketplace</button>
          <button className="text-sm font-mono text-left" onClick={() => { setOpen(false); navigate("/about"); }}>About</button>
          <button className="text-sm font-mono text-left" onClick={() => { setOpen(false); navigate("/blog"); }}>Blog</button>
          <button className="text-sm font-mono text-left" onClick={() => { setOpen(false); navigate("/contact"); }}>Contact</button>
          <button className="text-sm font-mono text-left flex items-center gap-1" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} Toggle Theme
          </button>
          <Button size="sm" className="w-full" onClick={() => { setOpen(false); handleStudio(); }}>Enter Studio</Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
