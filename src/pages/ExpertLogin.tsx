import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Briefcase } from "lucide-react";
import AuthEmailActions from "@/components/AuthEmailActions";
import { emailReturnUrl } from "@/lib/auth-flow";

export default function ExpertLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { document.title = "Expert Portal | ZEBRA"; }, []);

  const goExpertHome = async (uid: string) => {
    // Attach any application this email submitted before the account existed.
    await supabase.rpc("link_expert_application");
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "expert").maybeSingle();
    if (data) {
      navigate("/expert");
    } else {
      // Rule 1: not approved as expert → sign out and send to user auth
      await supabase.auth.signOut();
      toast.info("Your expert application is awaiting admin approval. Please sign in via the user portal.");
      navigate("/auth", { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await goExpertHome(data.user.id);
      } else {
        const { data: signup, error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: name, expert_application: { industry } },
            emailRedirectTo: emailReturnUrl("expert"),
          },
        });
        // A duplicate account still records the application; the person then signs in and it links by email.
        if (error && !/already registered|already been registered/i.test(error.message)) throw error;
        const { error: applyErr } = await supabase.rpc("apply_as_expert", {
          _name: name, _industry: industry, _email: email,
        });
        if (applyErr) throw applyErr;
        toast.success(signup.session ? "Application received. An admin must approve your expert access before you sign in here." : "Application received. Check your email to confirm your account. An admin must also approve your expert access.", { duration: 8000 });
        setIsLogin(true);
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 border border-border rounded-2xl bg-card">
        <button onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Expert Portal</h1>
          <p className="text-muted-foreground text-xs font-mono mt-1">
            {isLogin ? "Sign in to manage bookings" : "Apply to join the verified network"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <>
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label className="text-xs">Industry / Specialty</Label>
                <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Agro-Processing" required />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Password</Label>
            </div>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Loading…" : isLogin ? "Sign In" : "Submit Application"}
          </Button>
        </form>
        {isLogin && <AuthEmailActions email={email} portal="expert" />}

        <p className="text-center text-sm text-muted-foreground mt-6 font-mono">
          {isLogin ? "Want to join as an expert?" : "Already approved?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-foreground underline underline-offset-4">
            {isLogin ? "Apply" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
