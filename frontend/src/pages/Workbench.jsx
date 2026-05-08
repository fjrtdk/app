import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  listPatterns,
  listPrompts,
  optimizePrompt,
  forkPrompt,
  deletePrompt,
  createPrompt,
  updatePrompt,
  suggest as apiSuggest,
} from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import Toolbar from "@/components/Toolbar";
import EditorPane from "@/components/EditorPane";
import OutputPane from "@/components/OutputPane";
import { toast, Toaster } from "sonner";

export default function Workbench() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [patterns, setPatterns] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [rawInput, setRawInput] = useState("");
  const [output, setOutput] = useState("");
  const [selectedPattern, setSelectedPattern] = useState("improve_prompt");
  const [optimizing, setOptimizing] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [suggestion, setSuggestion] = useState({ pattern: null, tags: [] });
  const [latency, setLatency] = useState(null);
  const [dirty, setDirty] = useState(false);

  const autosaveRef = useRef(null);
  const suggestRef = useRef(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  // Load patterns + prompts
  const refreshPrompts = useCallback(async (q = "") => {
    try {
      const list = await listPrompts(q ? { q } : {});
      setPrompts(list);
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [pats, ps] = await Promise.all([listPatterns(), listPrompts()]);
        setPatterns(pats);
        setPrompts(ps);
      } catch (e) {
        toast.error("Failed to load workspace");
      }
    })();
  }, [user]);

  // Load active prompt content
  const handleSelect = (p) => {
    setActiveId(p.id);
    setRawInput(p.raw_input || "");
    setOutput(p.optimized_output || "");
    setSelectedPattern(p.selected_pattern || "improve_prompt");
    setDirty(false);
    setLatency(null);
  };

  const handleNew = () => {
    setActiveId(null);
    setRawInput("");
    setOutput("");
    setSelectedPattern("improve_prompt");
    setDirty(false);
    setLatency(null);
  };

  // Live suggest (heuristic, debounced)
  useEffect(() => {
    if (suggestRef.current) clearTimeout(suggestRef.current);
    suggestRef.current = setTimeout(async () => {
      if (rawInput.trim().length < 8) {
        setSuggestion({ pattern: null, tags: [] });
        return;
      }
      try {
        const s = await apiSuggest(rawInput, false);
        setSuggestion({ pattern: s.suggested_pattern, tags: s.suggested_tags });
      } catch (_) {
        // ignore
      }
    }, 600);
    return () => clearTimeout(suggestRef.current);
  }, [rawInput]);

  // Autosave (debounced) — only if there's content
  useEffect(() => {
    if (!dirty) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(async () => {
      try {
        if (activeId) {
          await updatePrompt(activeId, {
            raw_input: rawInput,
            optimized_output: output,
            selected_pattern: selectedPattern,
          });
        } else if (rawInput.trim()) {
          const created = await createPrompt({
            raw_input: rawInput,
            optimized_output: output,
            selected_pattern: selectedPattern,
          });
          setActiveId(created.id);
        }
        setDirty(false);
        refreshPrompts(searchQ);
      } catch (_) {}
    }, 1200);
    return () => clearTimeout(autosaveRef.current);
  }, [rawInput, output, selectedPattern, dirty, activeId, refreshPrompts, searchQ]);

  const handleOptimize = async () => {
    if (!rawInput.trim()) {
      toast.error("Add some notes first");
      return;
    }
    setOptimizing(true);
    setOutput("");
    try {
      const res = await optimizePrompt({
        raw_input: rawInput,
        pattern_slug: selectedPattern,
        prompt_id: activeId,
        save: true,
      });
      setOutput(res.optimized_output);
      setLatency(res.latency_ms);
      if (!activeId && res.prompt_id) setActiveId(res.prompt_id);
      setDirty(false);
      refreshPrompts(searchQ);
      toast.success(`Optimized in ${(res.latency_ms / 1000).toFixed(1)}s`);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message;
      toast.error(`Optimization failed: ${msg}`);
    } finally {
      setOptimizing(false);
    }
  };

  const handleFork = async () => {
    if (!activeId) {
      toast.error("Save a prompt first to fork it");
      return;
    }
    try {
      const f = await forkPrompt(activeId);
      await refreshPrompts(searchQ);
      handleSelect(f);
      toast.success("Forked");
    } catch (e) {
      toast.error("Fork failed");
    }
  };

  const handleCopy = async () => {
    if (!output) {
      toast.error("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Copied to clipboard");
    } catch (_) {
      toast.error("Copy failed");
    }
  };

  const handleSave = async () => {
    try {
      if (activeId) {
        await updatePrompt(activeId, {
          raw_input: rawInput,
          optimized_output: output,
          selected_pattern: selectedPattern,
        });
      } else {
        const created = await createPrompt({
          raw_input: rawInput,
          optimized_output: output,
          selected_pattern: selectedPattern,
        });
        setActiveId(created.id);
      }
      setDirty(false);
      refreshPrompts(searchQ);
      toast.success("Saved");
    } catch (_) {
      toast.error("Save failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePrompt(id);
      if (id === activeId) handleNew();
      refreshPrompts(searchQ);
      toast.success("Deleted");
    } catch (_) {
      toast.error("Delete failed");
    }
  };

  const handleSearchChange = async (val) => {
    setSearchQ(val);
    refreshPrompts(val);
  };

  // Keyboard: Cmd/Ctrl+Enter = optimize, Cmd/Ctrl+S = save
  useEffect(() => {
    const handler = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "Enter") {
        e.preventDefault();
        handleOptimize();
      } else if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawInput, output, selectedPattern, activeId]);

  const activePattern = useMemo(
    () => patterns.find((p) => p.slug === selectedPattern),
    [patterns, selectedPattern]
  );

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#050505] text-zinc-400 font-mono text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div data-testid="workbench" className="h-screen w-screen flex bg-[#050505] text-white overflow-hidden">
      <Sidebar
        user={user}
        prompts={prompts}
        patterns={patterns}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        onLogout={logout}
        searchQ={searchQ}
        onSearchChange={handleSearchChange}
      />

      <div className="flex-1 flex flex-col h-full min-w-0">
        <Toolbar
          patterns={patterns}
          selectedPattern={selectedPattern}
          onSelectPattern={(s) => {
            setSelectedPattern(s);
            setDirty(true);
          }}
          onOptimize={handleOptimize}
          onCopy={handleCopy}
          onSave={handleSave}
          onFork={handleFork}
          optimizing={optimizing}
          activePattern={activePattern}
          latency={latency}
        />

        <div className="flex-1 flex overflow-hidden">
          <EditorPane
            value={rawInput}
            onChange={(v) => {
              setRawInput(v);
              setDirty(true);
            }}
            suggestion={suggestion}
            onAcceptPattern={(slug) => {
              setSelectedPattern(slug);
              setDirty(true);
            }}
          />
          <div className="w-px bg-zinc-800" />
          <OutputPane output={output} optimizing={optimizing} />
        </div>
      </div>

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
