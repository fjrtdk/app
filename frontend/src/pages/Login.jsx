import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const LOGIN_BG =
  "https://images.unsplash.com/photo-1659957006181-7ba1d48864cc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2ODl8MHwxfHNlYXJjaHwyfHxkYXJrJTIwYXJjaGl0ZWN0dXJlJTIwbWluaW1hbHxlbnwwfHx8YmxhY2tfYW5kX3doaXRlfDE3NzgyNTQxOTd8MA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const { user, loading, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/app", { replace: true });
  }, [loading, user, navigate]);

  const handleGoogle = async () => {
    try {
      await loginWithGoogle();
      navigate("/app", { replace: true });
    } catch (err) {
      console.error("[login]", err?.code || err);
    }
  };

  return (
    <div data-testid="login-page" className="min-h-screen w-full bg-[#050505] text-white flex">
      {/* Left: image panel */}
      <div className="hidden lg:flex w-1/2 relative grain overflow-hidden">
        <img
          src={LOGIN_BG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-black/80" />
        <div className="relative z-10 p-14 flex flex-col justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#C4F159]" />
            <span className="font-mono text-sm tracking-[0.2em] uppercase text-zinc-300">
              prompt.optimizer
            </span>
          </div>
          <div className="space-y-6 max-w-md">
            <h1 className="text-5xl font-bold tracking-tight leading-[1.05]">
              Turn rough notes into <span className="text-[#C4F159]">surgical prompts</span>.
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed">
              Fabric-style patterns. Nvidia NIM under the hood. Built for developers
              wiring up coding agents.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {["extract_wisdom", "improve_prompt", "create_coding_prompt", "summarize"].map(
                (s) => (
                  <span
                    key={s}
                    className="font-mono text-xs px-2 py-1 rounded-sm bg-zinc-900/60 border border-zinc-800 text-zinc-300"
                  >
                    {s}
                  </span>
                )
              )}
            </div>
          </div>
          <div className="font-mono text-xs text-zinc-500">
            v1 · meta/llama-3.3-70b-instruct
          </div>
        </div>
      </div>

      {/* Right: auth panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#C4F159]" />
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-zinc-300">
              prompt.optimizer
            </span>
          </div>
          <div className="space-y-3">
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
              Sign in
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">Get to work.</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              One click. We use Google to keep your prompt history private to you.
            </p>
          </div>

          <Button
            data-testid="google-login-btn"
            onClick={handleGoogle}
            className="w-full bg-[#C4F159] hover:bg-[#D9F99D] text-black font-semibold h-11 text-sm tracking-tight"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" className="mr-2">
              <path
                fill="#000"
                d="M21.35 11.1H12v3.2h5.35c-.23 1.45-1.6 4.25-5.35 4.25-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.57-2.48C16.96 4.25 14.7 3.25 12 3.25 6.86 3.25 2.7 7.4 2.7 12.6S6.86 21.95 12 21.95c6.94 0 9.5-4.85 9.5-7.35 0-.5-.05-.95-.15-1.5z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="space-y-3 pt-4 border-t border-zinc-900">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              What you get
            </div>
            <ul className="space-y-2 text-sm text-zinc-400">
              {[
                "Split-pane Fabric-style prompt workbench",
                "6 system patterns, NIM-powered optimization",
                "Auto-saved history with tags, search, forking",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-[#C4F159] shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
