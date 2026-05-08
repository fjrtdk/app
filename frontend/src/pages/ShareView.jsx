import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSharedPrompt } from "@/lib/api";
import { Copy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";

export default function ShareView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await getSharedPrompt(token);
        setData(d);
      } catch (e) {
        setError(e?.response?.data?.detail || "Not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(data.optimized_output);
      toast.success("Copied");
    } catch (_) {
      toast.error("Copy failed");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#050505] text-zinc-400 font-mono text-sm">
        Loading shared prompt…
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#050505] text-center px-6">
        <div className="max-w-md space-y-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            404
          </div>
          <h1 className="text-2xl font-semibold text-white">This prompt isn't available.</h1>
          <p className="text-sm text-zinc-400">It may have been unshared or never existed.</p>
          <Button
            data-testid="goto-app-btn"
            onClick={() => navigate("/app")}
            className="bg-[#C4F159] hover:bg-[#D9F99D] text-black font-semibold"
          >
            Go to Prompt Optimizer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="share-view" className="min-h-screen w-full bg-[#050505] text-white">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#C4F159]" />
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-200">
            prompt.optimizer
          </span>
          <span className="ml-3 font-mono text-[10px] text-zinc-500">shared · read-only</span>
        </div>
        <Button
          data-testid="cta-build-yours"
          onClick={() => navigate("/app")}
          className="bg-[#C4F159] hover:bg-[#D9F99D] text-black font-semibold h-8 text-xs"
        >
          Build yours
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            {data.selected_pattern || "prompt"}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{data.title}</h1>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span>by {data.author_name}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span>{new Date(data.updated_at).toLocaleDateString()}</span>
            {data.tags?.length > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <div className="flex flex-wrap gap-1">
                  {data.tags.map((t) => (
                    <span
                      key={t}
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              raw_input
            </h2>
          </div>
          <pre className="md-output bg-zinc-950 border border-zinc-900 rounded-lg p-4 text-zinc-300">
            {data.raw_input}
          </pre>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              optimized_output
            </h2>
            <Button
              data-testid="share-copy-btn"
              onClick={copyOutput}
              variant="ghost"
              size="sm"
              className="text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 text-xs"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy
            </Button>
          </div>
          <pre className="md-output bg-zinc-950 border border-zinc-900 rounded-lg p-4">
            {data.optimized_output}
          </pre>
        </section>

        <footer className="pt-12 pb-16 text-center border-t border-zinc-900">
          <p className="text-sm text-zinc-400 mb-4">
            Like this prompt? Build your own Fabric-style prompts with Nvidia NIM.
          </p>
          <Button
            data-testid="footer-cta"
            onClick={() => navigate("/app")}
            className="bg-[#C4F159] hover:bg-[#D9F99D] text-black font-semibold"
          >
            Try Prompt Optimizer free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </footer>
      </main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0F0F11",
            border: "1px solid #27272A",
            color: "#fff",
            fontFamily: "IBM Plex Sans, sans-serif",
          },
        }}
      />
    </div>
  );
}
