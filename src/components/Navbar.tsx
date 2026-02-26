import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleStudio = () => {
    navigate(session ? "/studio" : "/auth");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <a href="/" className="font-display text-xl font-bold tracking-tighter">
          ZEBRA
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="/#features" className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="/#process" className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">Process</a>
          <button onClick={() => navigate("/marketplace")} className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">Marketplace</button>
          {session && (
            <button onClick={handleLogout} className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
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
          {session && (
            <button className="text-sm font-mono text-left flex items-center gap-1" onClick={() => { setOpen(false); handleLogout(); }}>
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          )}
          <Button size="sm" className="w-full" onClick={() => { setOpen(false); handleStudio(); }}>Enter Studio</Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
