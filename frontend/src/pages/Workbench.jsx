import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  listPatterns,
  listPrompts,
  forkPrompt,
  deletePrompt,
  createPrompt,
  updatePrompt,
  suggest as apiSuggest,
  streamOptimize,
  sharePrompt,
  unsharePrompt,
  listGroups,
} from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import Toolbar from "@/components/Toolbar";
import EditorPane from "@/components/EditorPane";
import OutputPane from "@/components/OutputPane";
import MetaBar from "@/components/MetaBar";
import { toast, Toaster } from "sonner";

export default function Workbench() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const [patterns, setPatterns] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);

  const [activeId, setActiveId] = useState(null);
  const [title, setTitle] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [output, setOutput] = useState("");
  const [tags, setTags] = useState([]);
  const [group, setGroup] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState("improve_prompt");
  const [shareToken, setShareToken] = useState(null);

  const [optimizing, setOptimizing] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [tagFilter, setTagFilter] = useState(null);
  const [suggestion, setSuggestion] = useState({ pattern: null, tags: [] });
  const [latency, setLatency] = useState(null);
  const [usage, setUsage] = useState(null);
  const [dirty, setDirty] = useState(false);

  const autosaveRef = useRef(null);
  const suggestRef = useRef(null);
  const cancelStreamRef = useRef(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  // Load workspace data
  const refreshPrompts = useCallback(async () => {
    try {
      const params = {};
      if (searchQ) params.q = searchQ;
      if (tagFilter) params.tag = tagFilter;
      const list = await listPrompts(params);
      setPrompts(list);
    } catch (err) {
      console.error("[refreshPrompts]", err);
    }
  }, [searchQ, tagFilter]);

  const refreshGroups = useCallback(async () => {
    try {
      const g = await listGroups();
      setGroupOptions(g);
    } catch (err) {
      console.error("[refreshGroups]", err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [pats, ps, gs] = await Promise.all([
          listPatterns(),
          listPrompts(),
          listGroups(),
        ]);
        setPatterns(pats);
        setPrompts(ps);
        setGroupOptions(gs);
      } catch (err) {
        console.error("[loadWorkspace]", err);
        toast.error("Failed to load workspace");
      }
    })();
  }, [user]);

  useEffect(() => {
    if (user) refreshPrompts();
  }, [searchQ, tagFilter, user, refreshPrompts]);

  // Select / new helpers
  const handleSelect = (p) => {
    setActiveId(p.id);
    setTitle(p.title || "");
    setRawInput(p.raw_input || "");
    setOutput(p.optimized_output || "");
    setSelectedPattern(p.selected_pattern || "improve_prompt");
    setTags(p.tags || []);
    setGroup(p.group || null);
    setShareToken(p.share_token || null);
    setDirty(false);
    setLatency(null);
    setUsage(null);
  };

  const handleNew = () => {
    setActiveId(null);
    setTitle("");
    setRawInput("");
    setOutput("");
    setSelectedPattern("improve_prompt");
    setTags([]);
    setGroup(null);
    setShareToken(null);
    setDirty(false);
    setLatency(null);
    setUsage(null);
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
      } catch (err) {
        console.error("[suggest]", err);
      }
    }, 600);
    return () => clearTimeout(suggestRef.current);
  }, [rawInput]);

  // Autosave
  useEffect(() => {
    if (!dirty) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(async () => {
      try {
        if (activeId) {
          await updatePrompt(activeId, {
            title: title || undefined,
            raw_input: rawInput,
            optimized_output: output,
            selected_pattern: selectedPattern,
            tags,
            group,
          });
        } else if (rawInput.trim()) {
          const created = await createPrompt({
            title: title || undefined,
            raw_input: rawInput,
            optimized_output: output,
            selected_pattern: selectedPattern,
            tags,
            group,
          });
          setActiveId(created.id);
          if (!title) setTitle(created.title);
        }
        setDirty(false);
        refreshPrompts();
        refreshGroups();
      } catch (err) {
        console.error("[autosave]", err);
      }
    }, 1000);
    return () => clearTimeout(autosaveRef.current);
  }, [
    rawInput,
    output,
    selectedPattern,
    tags,
    group,
    title,
    dirty,
    activeId,
    refreshPrompts,
    refreshGroups,
  ]);

  // ---- Optimize via streaming SSE ----
  const handleOptimize = () => {
    if (!rawInput.trim()) {
      toast.error("Add some notes first");
      return;
    }
    setOptimizing(true);
    setOutput("");
    setUsage(null);
    setLatency(null);

    const startedAt = Date.now();
    let fullOutput = "";
    let resolvedPromptId = activeId;
    let cancelled = false;

    const cancel = streamOptimize(
      {
        raw_input: rawInput,
        pattern_slug: selectedPattern,
        prompt_id: activeId,
        save: true,
      },
      (evt) => {
        if (cancelled) return;
        if (evt.error) {
          toast.error(`Optimization failed: ${String(evt.error)}`);
          setOptimizing(false);
          return;
        }
        if (evt.delta) {
          fullOutput += evt.delta;
          setOutput(fullOutput);
        }
        if (evt.usage) {
          setUsage(evt.usage);
        }
        if (evt.done) {
          setLatency(evt.latency_ms || Date.now() - startedAt);
          if (evt.prompt_id && !activeId) {
            resolvedPromptId = evt.prompt_id;
            setActiveId(evt.prompt_id);
          }
          setOptimizing(false);
          setDirty(false);
          refreshPrompts();
          (async () => {
            if (!activeId && resolvedPromptId) {
              try {
                const list = await listPrompts();
                const p = list.find((x) => x.id === resolvedPromptId);
                if (p && !title) setTitle(p.title);
              } catch (err) {
                console.error("[postOptimizeTitleSync]", err);
              }
            }
          })();
          toast.success(
            `Optimized in ${((evt.latency_ms || Date.now() - startedAt) / 1000).toFixed(1)}s`
          );
        }
      }
    );
    cancelStreamRef.current = () => {
      cancelled = true;
      cancel();
    };
  };

  const handleCancel = () => {
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
    }
    setOptimizing(false);
    toast("Cancelled");
  };

  const handleFork = async () => {
    if (!activeId) {
      toast.error("Save a prompt first to fork it");
      return;
    }
    try {
      const f = await forkPrompt(activeId);
      await refreshPrompts();
      handleSelect(f);
      toast.success("Forked");
    } catch (err) {
      console.error("[fork]", err);
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
    } catch (err) {
      console.error("[copy]", err);
      toast.error("Copy failed");
    }
  };

  const handleSave = async () => {
    try {
      if (activeId) {
        await updatePrompt(activeId, {
          title: title || undefined,
          raw_input: rawInput,
          optimized_output: output,
          selected_pattern: selectedPattern,
          tags,
          group,
        });
      } else {
        const created = await createPrompt({
          title: title || undefined,
          raw_input: rawInput,
          optimized_output: output,
          selected_pattern: selectedPattern,
          tags,
          group,
        });
        setActiveId(created.id);
        setTitle(created.title);
      }
      setDirty(false);
      refreshPrompts();
      refreshGroups();
      toast.success("Saved");
    } catch (err) {
      console.error("[save]", err);
      toast.error("Save failed");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePrompt(id);
      if (id === activeId) handleNew();
      refreshPrompts();
      toast.success("Deleted");
    } catch (err) {
      console.error("[delete]", err);
      toast.error("Delete failed");
    }
  };

  // ---- Share ----
  const handleShare = async () => {
    if (!activeId) {
      toast.error("Save first to share");
      return;
    }
    try {
      const r = await sharePrompt(activeId);
      setShareToken(r.share_token);
      const url = window.location.origin + r.share_url_path;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Public link copied");
      } catch (err) {
        console.error("[shareCopy]", err);
        toast.success("Public link created");
      }
      refreshPrompts();
    } catch (err) {
      console.error("[share]", err);
      toast.error("Share failed");
    }
  };

  const handleUnshare = async () => {
    if (!activeId) return;
    try {
      await unsharePrompt(activeId);
      setShareToken(null);
      toast.success("Unshared");
      refreshPrompts();
    } catch (err) {
      console.error("[unshare]", err);
      toast.error("Unshare failed");
    }
  };

  const shareUrl = useMemo(
    () => (shareToken ? `${window.location.origin}/share/${shareToken}` : null),
    [shareToken]
  );

  // ---- Export ----
  const buildMarkdown = useCallback(() => {
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    return `# ${title || "Untitled prompt"}

> Pattern: \`${selectedPattern}\` · Generated via Nvidia NIM (meta/llama-3.3-70b-instruct) · ${ts}
${tags.length ? `> Tags: ${tags.map((t) => `\`#${t}\``).join(", ")}\n` : ""}
## Raw input

\`\`\`
${rawInput}
\`\`\`

## Optimized output

${output}
`;
  }, [title, selectedPattern, tags, rawInput, output]);

  const handleExportMarkdown = async () => {
    if (!output) {
      toast.error("Nothing to export");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      toast.success("Markdown copied");
    } catch (err) {
      console.error("[exportMd]", err);
      toast.error("Copy failed");
    }
  };

  const handleDownloadMarkdown = () => {
    if (!output) {
      toast.error("Nothing to export");
      return;
    }
    const md = buildMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    const fname = (title || "prompt")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    a.href = URL.createObjectURL(blob);
    a.download = `${fname || "prompt"}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    toast.success("Downloaded");
  };

  const handleExportJson = async () => {
    if (!output) {
      toast.error("Nothing to export");
      return;
    }
    const obj = {
      title: title || "Untitled",
      pattern: selectedPattern,
      tags,
      group,
      raw_input: rawInput,
      optimized_output: output,
      model: "meta/llama-3.3-70b-instruct",
      provider: "nvidia_nim",
      exported_at: new Date().toISOString(),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
      toast.success("JSON copied");
    } catch (err) {
      console.error("[exportJson]", err);
      toast.error("Copy failed");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "Enter") {
        e.preventDefault();
        if (optimizing) handleCancel();
        else handleOptimize();
      } else if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape" && optimizing) {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawInput, output, selectedPattern, activeId, tags, group, title, optimizing]);

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
    <div
      data-testid="workbench"
      className="h-screen w-screen flex bg-[#050505] text-white overflow-hidden"
    >
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
        onSearchChange={setSearchQ}
        activeTagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
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
          onCancel={handleCancel}
          onCopy={handleCopy}
          onSave={handleSave}
          onFork={handleFork}
          onShare={handleShare}
          onUnshare={handleUnshare}
          onExportMarkdown={handleExportMarkdown}
          onExportJson={handleExportJson}
          onDownloadMarkdown={handleDownloadMarkdown}
          optimizing={optimizing}
          activePattern={activePattern}
          latency={latency}
          usage={usage}
          shareUrl={shareUrl}
          hasActivePrompt={!!activeId || !!rawInput.trim()}
        />

        <MetaBar
          title={title}
          onTitleChange={(v) => {
            setTitle(v);
            setDirty(true);
          }}
          tags={tags}
          onTagsChange={(t) => {
            setTags(t);
            setDirty(true);
          }}
          group={group}
          onGroupChange={(g) => {
            setGroup(g);
            setDirty(true);
          }}
          groupOptions={groupOptions}
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
