import { useState, useRef, useEffect } from "react";
import { X, Plus, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Meta bar shown above the editor:
 *   [ Title ............................... ]   [ #group v ]   [ tag tag tag + ]
 */
export default function MetaBar({
  title,
  onTitleChange,
  tags = [],
  onTagsChange,
  group,
  onGroupChange,
  groupOptions = [],
  disabled = false,
}) {
  const [tagInput, setTagInput] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupInput, setGroupInput] = useState("");
  const groupRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (groupRef.current && !groupRef.current.contains(e.target)) setGroupOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const addTag = (raw) => {
    const t = (raw || tagInput).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    onTagsChange([...tags, t]);
    setTagInput("");
  };

  const removeTag = (t) => onTagsChange(tags.filter((x) => x !== t));

  return (
    <div
      data-testid="meta-bar"
      className="h-11 shrink-0 border-b border-zinc-900 bg-[#08080A] px-5 flex items-center gap-3 overflow-x-auto"
    >
      <input
        data-testid="prompt-title-input"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Untitled prompt"
        disabled={disabled}
        className="bg-transparent border-none text-[13px] font-medium text-white placeholder:text-zinc-600 focus:outline-none flex-1 min-w-[180px] max-w-[420px]"
      />

      {/* Group selector */}
      <div ref={groupRef} className="relative">
        <button
          data-testid="group-btn"
          onClick={() => setGroupOpen((o) => !o)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 h-7 px-2 rounded-md border border-zinc-800 text-[11px] font-mono transition",
            group ? "text-[#C4F159] bg-zinc-900" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
          )}
        >
          <FolderOpen className="w-3 h-3" />
          {group || "no group"}
        </button>
        {groupOpen && (
          <div className="absolute top-9 left-0 z-50 w-56 bg-[#0F0F11] border border-zinc-800 rounded-md shadow-xl overflow-hidden">
            <div className="p-2 border-b border-zinc-800">
              <Input
                value={groupInput}
                onChange={(e) => setGroupInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onGroupChange(groupInput.trim() || null);
                    setGroupInput("");
                    setGroupOpen(false);
                  }
                }}
                placeholder="New or existing group…"
                className="h-8 bg-zinc-900 border-zinc-800 text-xs"
              />
            </div>
            <div className="max-h-52 overflow-y-auto py-1">
              <button
                onClick={() => {
                  onGroupChange(null);
                  setGroupOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-white font-mono"
              >
                — no group —
              </button>
              {groupOptions.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    onGroupChange(g);
                    setGroupOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-zinc-900 hover:text-white",
                    g === group ? "text-[#C4F159]" : "text-zinc-300"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tag chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {tags.map((t) => (
          <Badge
            key={t}
            data-testid={`tag-chip-${t}`}
            className="h-6 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-mono text-[11px] gap-1"
          >
            #{t}
            <button
              onClick={() => removeTag(t)}
              className="text-zinc-500 hover:text-red-400"
              aria-label={`Remove ${t}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md px-1.5 h-6">
          <Plus className="w-3 h-3 text-zinc-500" />
          <input
            data-testid="tag-input"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag();
              } else if (e.key === "Backspace" && !tagInput && tags.length) {
                removeTag(tags[tags.length - 1]);
              }
            }}
            onBlur={() => addTag()}
            placeholder="tag"
            className="bg-transparent border-none text-[11px] font-mono text-white placeholder:text-zinc-600 focus:outline-none w-16"
          />
        </div>
      </div>
    </div>
  );
}
