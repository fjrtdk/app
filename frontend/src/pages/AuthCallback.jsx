import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { postFirebaseSession } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const idToken = await result.user.getIdToken();
          const u = await postFirebaseSession(idToken);
          setUser(u);
          window.history.replaceState(null, "", "/app");
          navigate("/app", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
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
