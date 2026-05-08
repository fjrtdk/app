import { useState } from "react";
import {
  Sparkles,
  Copy,
  Save,
  GitBranch,
  ChevronDown,
  Loader2,
  Share2,
  Download,
  Link2,
  FileJson,
  FileText,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function Toolbar({
  patterns,
  selectedPattern,
  onSelectPattern,
  onOptimize,
  onCopy,
  onSave,
  onFork,
  onShare,
  onUnshare,
  onExportMarkdown,
  onExportJson,
  onDownloadMarkdown,
  optimizing,
  onCancel,
  activePattern,
  latency,
  usage,
  shareUrl,
  hasActivePrompt,
}) {
  const [copyingShare, setCopyingShare] = useState(false);
  return (
    <div
      data-testid="toolbar"
      className="h-14 shrink-0 border-b border-zinc-800 bg-[#050505] flex items-center justify-between px-4 gap-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="pattern-selector"
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-md pl-3 pr-2.5 py-1.5 text-sm hover:border-zinc-700 transition group min-w-[200px]"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
                pattern
              </span>
              <span className="text-[#C4F159] font-mono text-[13px] truncate">
                {selectedPattern}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 ml-auto group-hover:text-zinc-300 transition" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="bg-[#0F0F11] border-zinc-800 text-zinc-200 w-[340px]"
          >
            <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500">
              Fabric-style patterns
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            {patterns.map((p) => (
              <DropdownMenuItem
                key={p.slug}
                data-testid={`pattern-option-${p.slug}`}
                onClick={() => onSelectPattern(p.slug)}
                className={cn(
                  "flex flex-col items-start gap-0.5 py-2.5 cursor-pointer focus:bg-zinc-800 focus:text-white",
                  selectedPattern === p.slug && "bg-zinc-900"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-mono text-[12px] text-[#C4F159]">{p.slug}</span>
                  <span className="ml-auto text-[9px] uppercase tracking-[0.15em] text-zinc-500">
                    {p.category}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 leading-snug">
                  {p.description}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {activePattern && (
          <span className="hidden xl:inline text-xs text-zinc-500 truncate max-w-md">
            {activePattern.description}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Token + cost + latency */}
        {usage && (
          <div
            data-testid="usage-readout"
            className="hidden md:flex items-center gap-3 mr-2 font-mono text-[10px] text-zinc-500"
          >
            <span title="Prompt + completion tokens">
              <span className="text-zinc-300">{usage.total_tokens}</span> tok
            </span>
            <span title="Estimated cost">
              ~$<span className="text-zinc-300">{(usage.cost_usd ?? 0).toFixed(5)}</span>
            </span>
            {latency != null && (
              <span title="Round-trip latency">
                <span className="text-zinc-300">{(latency / 1000).toFixed(1)}</span>s
              </span>
            )}
          </div>
        )}
        {!usage && latency != null && (
          <span className="font-mono text-[10px] text-zinc-500 mr-2 hidden md:inline">
            {latency}ms · NIM
          </span>
        )}

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="copy-btn"
                onClick={onCopy}
                variant="ghost"
                size="sm"
                className="text-zinc-300 hover:text-white hover:bg-zinc-800 h-9"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
              Copy output
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="save-btn"
                onClick={onSave}
                variant="ghost"
                size="sm"
                className="text-zinc-300 hover:text-white hover:bg-zinc-800 h-9"
              >
                <Save className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
              Save (⌘S)
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="fork-btn"
                onClick={onFork}
                variant="ghost"
                size="sm"
                className="text-zinc-300 hover:text-white hover:bg-zinc-800 h-9"
              >
                <GitBranch className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
              Fork prompt
            </TooltipContent>
          </Tooltip>

          {/* Share */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="share-btn"
                    variant="ghost"
                    size="sm"
                    disabled={!hasActivePrompt}
                    className={cn(
                      "h-9",
                      shareUrl
                        ? "text-[#C4F159] hover:text-[#C4F159] hover:bg-zinc-800"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-800"
                    )}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
                {hasActivePrompt ? "Share" : "Save first to share"}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className="bg-[#0F0F11] border-zinc-800 text-zinc-200 w-[320px]"
            >
              <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500">
                {shareUrl ? "Public link" : "Create public link"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              {shareUrl ? (
                <>
                  <div className="px-2 py-2">
                    <div
                      data-testid="share-url-display"
                      className="bg-zinc-950 border border-zinc-800 rounded-md p-2 font-mono text-[11px] text-zinc-300 break-all leading-snug"
                    >
                      {shareUrl}
                    </div>
                  </div>
                  <DropdownMenuItem
                    data-testid="share-copy-link"
                    onClick={async (e) => {
                      e.preventDefault();
                      setCopyingShare(true);
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                      } finally {
                        setCopyingShare(false);
                      }
                    }}
                    className="cursor-pointer focus:bg-zinc-800 focus:text-white text-zinc-200"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    {copyingShare ? "Copied" : "Copy link"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem
                    data-testid="unshare-btn"
                    onClick={onUnshare}
                    className="cursor-pointer focus:bg-zinc-800 focus:text-red-400 text-red-400"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Unshare
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  data-testid="share-create-btn"
                  onClick={onShare}
                  disabled={!hasActivePrompt}
                  className="cursor-pointer focus:bg-zinc-800 focus:text-white text-zinc-200"
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Generate read-only link
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    data-testid="export-btn"
                    variant="ghost"
                    size="sm"
                    className="text-zinc-300 hover:text-white hover:bg-zinc-800 h-9"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
                Export
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className="bg-[#0F0F11] border-zinc-800 text-zinc-200 w-[220px]"
            >
              <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500">
                Export
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                data-testid="export-md-copy"
                onClick={onExportMarkdown}
                className="cursor-pointer focus:bg-zinc-800 focus:text-white text-zinc-200"
              >
                <FileText className="w-4 h-4 mr-2" />
                Copy as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="export-md-download"
                onClick={onDownloadMarkdown}
                className="cursor-pointer focus:bg-zinc-800 focus:text-white text-zinc-200"
              >
                <Download className="w-4 h-4 mr-2" />
                Download .md
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="export-json-copy"
                onClick={onExportJson}
                className="cursor-pointer focus:bg-zinc-800 focus:text-white text-zinc-200"
              >
                <FileJson className="w-4 h-4 mr-2" />
                Copy as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>

        {/* Optimize / Cancel */}
        {optimizing ? (
          <Button
            data-testid="cancel-btn"
            onClick={onCancel}
            variant="secondary"
            className="bg-zinc-800 hover:bg-zinc-700 text-white h-9 px-4 text-sm tracking-tight ml-1"
          >
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Streaming…
            <span className="ml-2 font-mono text-[10px] opacity-60">esc</span>
          </Button>
        ) : (
          <Button
            data-testid="optimize-btn"
            onClick={onOptimize}
            className="bg-[#C4F159] hover:bg-[#D9F99D] text-black font-semibold h-9 px-4 text-sm tracking-tight ml-1"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Optimize
            <span className="ml-2 font-mono text-[10px] opacity-60">⌘↵</span>
          </Button>
        )}
      </div>
    </div>
  );
}
