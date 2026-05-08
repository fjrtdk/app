import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Library,
  History as HistoryIcon,
  LayoutGrid,
  Trash2,
  LogOut,
  GitBranch,
  ChevronRight,
  Folder,
  Share2,
  Hash,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { listTags } from "@/lib/api";

const TABS = [
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "patterns", label: "Patterns", icon: LayoutGrid },
  { id: "library", label: "Library", icon: Library },
];

const NO_GROUP = "__nogroup__";

export default function Sidebar({
  user,
  prompts,
  patterns,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onLogout,
  searchQ,
  onSearchChange,
  activeTagFilter,
  onTagFilterChange,
}) {
  const [tab, setTab] = useState("history");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [tagOptions, setTagOptions] = useState([]);

  useEffect(() => {
    if (tab !== "history") return;
    (async () => {
      try {
        const tags = await listTags();
        setTagOptions(tags);
      } catch (err) {
        console.error("[listTags]", err);
      }
    })();
  }, [tab, prompts]);

  const grouped = useMemo(() => {
    const out = {};
    for (const p of prompts) {
      const k = p.group || NO_GROUP;
      if (!out[k]) out[k] = [];
      out[k].push(p);
    }
    // sort groups: real groups alpha, then nogroup
    const ordered = {};
    Object.keys(out)
      .filter((k) => k !== NO_GROUP)
      .sort()
      .forEach((k) => (ordered[k] = out[k]));
    if (out[NO_GROUP]) ordered[NO_GROUP] = out[NO_GROUP];
    return ordered;
  }, [prompts]);

  const toggleGroup = (k) =>
    setCollapsedGroups((c) => ({ ...c, [k]: !c[k] }));

  return (
    <aside
      data-testid="sidebar"
      className="w-[300px] shrink-0 h-full border-r border-zinc-800 bg-[#0B0B0D] flex flex-col"
    >
      {/* Brand + user */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-[#C4F159]" />
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-zinc-200">
            prompt.optimizer
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="user-menu-btn"
              className="rounded-full ring-1 ring-zinc-800 hover:ring-zinc-600 transition"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-300">
                  {(user?.name || user?.email || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0F0F11] border-zinc-800 text-zinc-200">
            <DropdownMenuLabel className="text-xs font-normal text-zinc-400 truncate max-w-[220px]">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              data-testid="logout-menu-item"
              onClick={onLogout}
              className="text-zinc-200 focus:bg-zinc-800 focus:text-white cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search + new */}
      <div className="p-3 space-y-2 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
          <Input
            data-testid="prompt-search-input"
            value={searchQ}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search prompts…"
            className="pl-8 h-9 bg-zinc-900 border-zinc-800 text-sm placeholder:text-zinc-500 focus-visible:ring-[#C4F159] focus-visible:ring-1 focus-visible:border-[#C4F159]"
          />
        </div>
        <Button
          data-testid="new-prompt-btn"
          onClick={onNew}
          variant="secondary"
          className="w-full justify-start bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 h-9 text-sm font-medium"
        >
          <Plus className="w-3.5 h-3.5 mr-2" /> New prompt
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              data-testid={`sidebar-tab-${t.id}`}
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 h-10 text-xs font-medium tracking-tight flex items-center justify-center gap-1.5 transition border-b-2",
                active
                  ? "text-white border-[#C4F159]"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        {tab === "history" && (
          <>
            {/* Tag filter chips */}
            {tagOptions.length > 0 && (
              <div className="px-3 pt-3 pb-2 flex flex-wrap gap-1.5 border-b border-zinc-900">
                {activeTagFilter && (
                  <button
                    data-testid="clear-tag-filter"
                    onClick={() => onTagFilterChange(null)}
                    className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-[#C4F159]/10 border border-[#C4F159]/30 text-[#C4F159] flex items-center gap-1"
                  >
                    #{activeTagFilter}
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
                {tagOptions
                  .filter((t) => t.tag !== activeTagFilter)
                  .slice(0, 12)
                  .map((t) => (
                    <button
                      key={t.tag}
                      data-testid={`tag-filter-${t.tag}`}
                      onClick={() => onTagFilterChange(t.tag)}
                      className="font-mono text-[10px] px-2 py-0.5 rounded-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition"
                    >
                      <Hash className="w-2.5 h-2.5" />
                      {t.tag}
                      <span className="text-zinc-600">{t.count}</span>
                    </button>
                  ))}
              </div>
            )}

            <div className="p-2">
              {prompts.length === 0 && (
                <div className="px-3 py-8 text-center text-xs text-zinc-500 font-mono">
                  No prompts yet.
                  <br />
                  Type something on the right.
                </div>
              )}

              {Object.keys(grouped).length === 1 && grouped[NO_GROUP] ? (
                grouped[NO_GROUP].map((p) => (
                  <PromptRow
                    key={p.id}
                    p={p}
                    active={p.id === activeId}
                    onSelect={() => onSelect(p)}
                    onDelete={() => onDelete(p.id)}
                  />
                ))
              ) : (
                Object.entries(grouped).map(([k, list]) => {
                  const collapsed = collapsedGroups[k];
                  const label = k === NO_GROUP ? "Ungrouped" : k;
                  return (
                    <div key={k} className="mb-1">
                      <button
                        data-testid={`group-header-${k === NO_GROUP ? "ungrouped" : k}`}
                        onClick={() => toggleGroup(k)}
                        className="w-full px-2 py-1.5 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500 hover:text-zinc-300 transition"
                      >
                        <ChevronRight
                          className={cn(
                            "w-3 h-3 transition-transform",
                            !collapsed && "rotate-90"
                          )}
                        />
                        {k === NO_GROUP ? null : <Folder className="w-3 h-3" />}
                        <span>{label}</span>
                        <span className="ml-auto text-zinc-600">{list.length}</span>
                      </button>
                      {!collapsed && (
                        <div className="pl-1">
                          {list.map((p) => (
                            <PromptRow
                              key={p.id}
                              p={p}
                              active={p.id === activeId}
                              onSelect={() => onSelect(p)}
                              onDelete={() => onDelete(p.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {tab === "patterns" && (
          <div className="p-2 space-y-1">
            {patterns.map((p) => (
              <div
                key={p.slug}
                data-testid={`pattern-card-${p.slug}`}
                className="px-3 py-2.5 rounded-md bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[12px] text-[#C4F159]">{p.slug}</div>
                  <span className="text-[9px] uppercase tracking-[0.15em] text-zinc-500">
                    {p.category}
                  </span>
                </div>
                <div className="text-[12px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                  {p.description}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "library" && (
          <div className="p-6 text-center text-xs text-zinc-500 font-mono">
            Reusable templates land here in v1.1.
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}

function PromptRow({ p, active, onSelect, onDelete }) {
  return (
    <div
      data-testid={`prompt-row-${p.id}`}
      onClick={onSelect}
      className={cn(
        "group cursor-pointer px-3 py-2.5 rounded-md border transition mb-1",
        active
          ? "bg-zinc-900 border-zinc-700"
          : "bg-transparent border-transparent hover:bg-zinc-900/60 hover:border-zinc-800"
      )}
    >
      <div className="flex items-center gap-2">
        {p.parent_prompt_id && <GitBranch className="w-3 h-3 text-zinc-500 shrink-0" />}
        <div className="text-[13px] font-medium truncate flex-1">{p.title}</div>
        {p.share_token && (
          <Share2 className="w-3 h-3 text-[#C4F159]/80 shrink-0" />
        )}
        <button
          data-testid={`delete-prompt-${p.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 transition text-zinc-500 hover:text-red-400"
          aria-label="Delete prompt"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 mt-1">
        {p.selected_pattern && (
          <span className="font-mono text-[10px] text-[#C4F159]/80">
            {p.selected_pattern}
          </span>
        )}
        {p.tags?.slice(0, 2).map((t) => (
          <span
            key={t}
            className="font-mono text-[9px] text-zinc-500"
          >
            #{t}
          </span>
        ))}
        <span className="text-[10px] text-zinc-500 ml-auto">
          {new Date(p.updated_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
