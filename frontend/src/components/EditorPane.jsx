import { Lightbulb } from "lucide-react";

export default function EditorPane({ value, onChange, suggestion, onAcceptPattern }) {
  return (
    <div data-testid="editor-pane" className="flex-1 min-w-0 relative flex flex-col bg-[#050505]">
      <div className="h-9 border-b border-zinc-900 px-5 flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          raw_input
        </span>
        <span className="ml-auto font-mono text-[10px] text-zinc-600">
          {value.length} chars
        </span>
      </div>
      <textarea
        data-testid="raw-input-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Drop your messy idea here…&#10;&#10;e.g. 'I need a prompt that reviews a pull request, finds bugs, and writes a checklist for the author. Should work for python and react.'"
        className="flex-1 w-full bg-transparent border-none resize-none text-white font-mono text-[14px] leading-[1.65] px-5 py-4 placeholder:text-zinc-600 focus:outline-none"
        spellCheck={false}
      />

      {suggestion?.pattern && (
        <div
          data-testid="suggestion-bar"
          className="border-t border-zinc-900 bg-zinc-950 px-5 py-2.5 flex items-center gap-3"
        >
          <Lightbulb className="w-3.5 h-3.5 text-[#C4F159] shrink-0" />
          <span className="font-mono text-[11px] text-zinc-400">
            suggested pattern:
          </span>
          <button
            data-testid="apply-suggestion-btn"
            onClick={() => onAcceptPattern(suggestion.pattern)}
            className="font-mono text-[12px] text-[#C4F159] hover:underline"
          >
            {suggestion.pattern}
          </button>
          {suggestion.tags?.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              {suggestion.tags.map((t) => (
                <span
                  key={t}
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
