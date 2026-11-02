import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { loginPath, readPortal } from "@/lib/auth-flow";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const portal = readPortal(window.location.search);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Reset Password | ZEBRA";
    // Supabase fires PASSWORD_RECOVERY when the user lands via the reset email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("zebra-password-recovery", "true");
        setReady(true);
        setChecking(false);
      }
    });
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("type") === "recovery") sessionStorage.setItem("zebra-password-recovery", "true");
    supabase.auth.getUser().then(({ data }) => {
      setReady(Boolean(data.user) && sessionStorage.getItem("zebra-password-recovery") === "true");
      setChecking(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (password !== confirm) { toast.error("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      sessionStorage.removeItem("zebra-password-recovery");
      await supabase.auth.signOut();
      toast.success("Password updated. You can sign in with your new password now.");
      navigate(loginPath(portal), { replace: true });
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 border border-border rounded-2xl bg-card">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center mb-3">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Set a new password</h1>
          <p className="text-muted-foreground text-xs font-mono mt-1">Choose a new password for your account</p>
        </div>

        {ready ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label className="text-xs">New Password</Label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div>
              <Label className="text-xs">Confirm Password</Label>
              <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? "Updating…" : "Update Password"}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground font-mono">{checking ? "Verifying your reset link…" : "This reset link is invalid, expired, or already used. Request a new email from the sign-in page."}</p>
            {!checking && <Button onClick={() => navigate(loginPath(portal))}>Back to sign in</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
