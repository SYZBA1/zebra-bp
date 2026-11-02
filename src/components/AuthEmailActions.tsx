import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { emailReturnUrl, type Portal } from "@/lib/auth-flow";

export default function AuthEmailActions({ email, portal }: { email: string; portal: Portal }) {
  const [busy, setBusy] = useState(false);
  const send = async (recovery: boolean) => {
    if (!email.trim()) { toast.error("Enter your email address first."); return; }
    setBusy(true);
    try {
      const { error } = recovery
        ? await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: emailReturnUrl(portal, true) })
        : await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: emailReturnUrl(portal) } });
      if (error) throw error;
      toast.success(recovery ? "If this account exists, a password reset link will arrive in your inbox. Check spam too." : "If confirmation is needed, a new link will arrive in your inbox. Already confirmed? Sign in or reset your password.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to send email. Try again."); }
    finally { setBusy(false); }
  };
  return <div className="flex flex-wrap justify-center gap-1">
    <Button type="button" variant="link" size="sm" disabled={busy} onClick={() => send(true)}>Forgot password?</Button>
    <Button type="button" variant="link" size="sm" disabled={busy} onClick={() => send(false)}>Resend confirmation email</Button>
  </div>;
}