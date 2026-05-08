import { useState } from "react";
import { Search, Plus, Library, History as HistoryIcon, LayoutGrid, Trash2, LogOut, GitBranch } from "lucide-react";
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

const TABS = [
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "patterns", label: "Patterns", icon: LayoutGrid },
  { id: "library", label: "Library", icon: Library },
];

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
}) {
  const [tab, setTab] = useState("history");

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
            <button data-testid="user-menu-btn" className="rounded-full ring-1 ring-zinc-800 hover:ring-zinc-600 transition">
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
          <span className="ml-auto font-mono text-[10px] text-zinc-500">⌘N</span>
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
          <div className="p-2">
            {prompts.length === 0 && (
              <div className="px-3 py-8 text-center text-xs text-zinc-500 font-mono">
                No prompts yet.
                <br />
                Type something on the right.
              </div>
            )}
            {prompts.map((p) => (
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
