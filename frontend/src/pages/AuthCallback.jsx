import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { postSession } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      navigate("/login");
      return;
    }
    const session_id = decodeURIComponent(m[1]);

    (async () => {
      try {
        const u = await postSession(session_id);
        setUser(u);
        // Clean the hash from the URL
        window.history.replaceState(null, "", "/app");
        navigate("/app", { replace: true, state: { user: u } });
      } catch (err) {
        console.error("[authCallback]", err);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div
      data-testid="auth-callback-loading"
      className="h-screen w-full flex items-center justify-center bg-[#050505] text-zinc-400 font-mono text-sm"
    >
      <div className="flex items-center gap-3">
        <span className="inline-block w-2 h-2 rounded-full bg-[#C4F159] animate-pulse" />
        Establishing session…
      </div>
    </div>
  );
}
