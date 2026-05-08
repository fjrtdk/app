import { Sparkles } from "lucide-react";

export default function OutputPane({ output, optimizing }) {
  return (
    <div data-testid="output-pane" className="flex-1 min-w-0 flex flex-col bg-[#050505]">
      <div className="h-9 border-b border-zinc-900 px-5 flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          optimized_output
        </span>
        {output && (
          <span className="ml-auto font-mono text-[10px] text-zinc-600">
            {output.length} chars
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {optimizing && !output ? (
          <OptimizingShimmer />
        ) : output ? (
          <pre data-testid="output-text" className="md-output">
            {output}
          </pre>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function OptimizingShimmer() {
  return (
    <div className="space-y-3">
      {[80, 60, 95, 70, 50].map((w, i) => (
        <div
          key={`shimmer-${i}-${w}`}
          className="h-3 rounded-sm bg-zinc-900 animate-pulse"
          style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
      <div className="w-9 h-9 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
        <Sparkles className="w-4 h-4 text-[#C4F159]" />
      </div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">
        ready
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Add notes on the left, pick a pattern, hit{" "}
        <span className="font-mono text-[#C4F159]">Optimize</span>. The structured
        prompt lands here.
      </p>
      <p className="font-mono text-[10px] text-zinc-600 mt-6">
        ⌘↵ to optimize · ⌘S to save
      </p>
    </div>
  );
}
