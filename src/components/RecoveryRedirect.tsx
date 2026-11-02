import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/** Sends users to /reset-password whenever they arrive from a password-reset email, on any page. */
export default function RecoveryRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (location.pathname !== "/reset-password" && window.location.hash.includes("type=recovery")) {
      sessionStorage.setItem("zebra-password-recovery", "true");
      navigate("/reset-password" + window.location.search + window.location.hash, { replace: true });
    } else if (location.pathname !== "/reset-password" && location.pathname !== "/auth/callback" && (params.has("access_token") || params.has("error_description") || new URLSearchParams(window.location.search).has("code"))) {
      const portal = location.pathname.startsWith("/expert") ? "expert" : location.pathname.startsWith("/admin") ? "admin" : "user";
      navigate(`/auth/callback?portal=${portal}${window.location.search ? "&" + window.location.search.slice(1) : ""}${window.location.hash}`, { replace: true });
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("zebra-password-recovery", "true");
        if (window.location.pathname !== "/reset-password") navigate("/reset-password" + window.location.search, { replace: true });
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
