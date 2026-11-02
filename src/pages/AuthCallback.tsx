import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { loginPath, portalDestination, readPortal } from "@/lib/auth-flow";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const portal = readPortal(window.location.search);
  useEffect(() => {
    let active = true;
    const finish = async () => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const errorDescription = params.get("error_description") || new URLSearchParams(window.location.search).get("error_description");
      if (errorDescription) { setError(errorDescription); return; }
      const { data, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !data.user) { setError("This confirmation link has expired or was already used. Try signing in, or request a new confirmation email."); return; }
      if (portal === "expert") await supabase.rpc("link_expert_application");
      const { data: roles, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      if (!active) return;
      if (roleError) { setError("Your email is confirmed, but we could not check your access. Please try signing in again."); return; }
      navigate(portalDestination(portal, (roles || []).map(row => row.role)), { replace: true });
    };
    void finish();
    return () => { active = false; };
  }, [navigate, portal]);
  return <main className="min-h-screen bg-background flex items-center justify-center p-4"><div className="max-w-md text-center space-y-4">
    <h1 className="text-2xl font-display">{error ? "Email link unavailable" : "Confirming your email…"}</h1>
    {error && <><p className="text-muted-foreground">{error}</p><Button onClick={() => navigate(loginPath(portal), { replace: true })}>Back to sign in</Button></>}
  </div></main>;
}