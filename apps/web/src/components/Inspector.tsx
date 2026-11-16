"use client";

import { findClip } from "@/lib/timeline";
import { useEditorStore } from "@/store/editorStore";

export function Inspector() {
  const project = useEditorStore((s) => s.project);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const updateSelected = useEditorStore((s) => s.updateSelected);
  const setEffect = useEditorStore((s) => s.setEffect);
  const clearEffect = useEditorStore((s) => s.clearEffect);

  if (!project) return null;
  const found = selectedClipId ? findClip(project, selectedClipId) : null;

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-pv-border bg-pv-panel/80">
      <div className="border-b border-pv-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-pv-muted">
          Inspector
        </h2>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3 text-sm">
        {!found && (
          <p className="text-xs text-pv-muted">Select a clip on the timeline.</p>
        )}
        {found && (
          <>
            <div>
              <div className="mb-1 text-[11px] uppercase text-pv-muted">Clip</div>
              <div className="rounded-md border border-pv-border bg-pv-panel2 p-2 text-xs">
                <div>Track: {found.track.name}</div>
                <div>Start: {found.clip.start.toFixed(2)}s</div>
                <div>Duration: {found.clip.duration.toFixed(2)}s</div>
                <div>
                  In/Out: {found.clip.inPoint.toFixed(2)} → {found.clip.outPoint.toFixed(2)}
                </div>
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-[11px] uppercase text-pv-muted">Start (s)</span>
              <input
                type="number"
                step="0.05"
                min={0}
                className="w-full rounded-md border border-pv-border bg-pv-bg px-2 py-1.5"
                value={found.clip.start}
                onChange={(e) =>
                  updateSelected({ start: Math.max(0, Number(e.target.value) || 0) })
                }
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] uppercase text-pv-muted">Duration (s)</span>
              <input
                type="number"
                step="0.05"
                min={0.05}
                className="w-full rounded-md border border-pv-border bg-pv-bg px-2 py-1.5"
                value={found.clip.duration}
                onChange={(e) => {
                  const duration = Math.max(0.05, Number(e.target.value) || 0.05);
                  updateSelected({
                    duration,
                    outPoint: found.clip.inPoint + duration,
                  });
                }}
              />
            </label>

            {found.track.type === "text" && (
              <>
                <label className="block space-y-1">
                  <span className="text-[11px] uppercase text-pv-muted">Text</span>
                  <textarea
                    className="min-h-[72px] w-full rounded-md border border-pv-border bg-pv-bg px-2 py-1.5"
                    value={found.clip.text || ""}
                    onChange={(e) => updateSelected({ text: e.target.value })}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] uppercase text-pv-muted">Font size</span>
                  <input
                    type="number"
                    className="w-full rounded-md border border-pv-border bg-pv-bg px-2 py-1.5"
                    value={found.clip.textStyle?.fontSize || 48}
                    onChange={(e) =>
                      updateSelected({
                        textStyle: {
                          ...(found.clip.textStyle || {
                            fontFamily: "Arial",
                            fontSize: 48,
                            color: "#FFFFFF",
                            align: "center",
                            position: "bottom",
                          }),
                          fontSize: Number(e.target.value) || 48,
                        },
                      })
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] uppercase text-pv-muted">Color</span>
                  <input
                    type="color"
                    className="h-9 w-full rounded-md border border-pv-border bg-pv-bg"
                    value={found.clip.textStyle?.color || "#ffffff"}
                    onChange={(e) =>
                      updateSelected({
                        textStyle: {
                          fontFamily: "Arial",
                          fontSize: 48,
                          align: "center",
                          position: "bottom",
                          ...found.clip.textStyle,
                          color: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] uppercase text-pv-muted">Position</span>
                  <select
                    className="w-full rounded-md border border-pv-border bg-pv-bg px-2 py-1.5"
                    value={found.clip.textStyle?.position || "bottom"}
                    onChange={(e) =>
                      updateSelected({
                        textStyle: {
                          fontFamily: "Arial",
                          fontSize: 48,
                          color: "#FFFFFF",
                          align: "center",
                          ...found.clip.textStyle,
                          position: e.target.value as "top" | "center" | "bottom",
                        },
                      })
                    }
                  >
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </label>
              </>
            )}

            {(found.track.type === "video" || found.track.type === "audio") && (
              <div className="space-y-3">
                <div className="text-[11px] uppercase text-pv-muted">Effects</div>
                <EffectRow
                  label="Fade in (s)"
                  value={
                    found.clip.effects.find((e) => e.type === "fadeIn")?.duration ?? 0
                  }
                  onChange={(v) =>
                    v > 0
                      ? setEffect("fadeIn", { duration: v })
                      : clearEffect("fadeIn")
                  }
                />
                <EffectRow
                  label="Fade out (s)"
                  value={
                    found.clip.effects.find((e) => e.type === "fadeOut")?.duration ?? 0
                  }
                  onChange={(v) =>
                    v > 0
                      ? setEffect("fadeOut", { duration: v })
                      : clearEffect("fadeOut")
                  }
                />
                <EffectRow
                  label="Speed"
                  value={
                    found.clip.effects.find((e) => e.type === "speed")?.value ?? 1
                  }
                  min={0.5}
                  max={2}
                  step={0.05}
                  onChange={(v) =>
                    Math.abs(v - 1) > 0.01
                      ? setEffect("speed", { value: v })
                      : clearEffect("speed")
                  }
                />
                {found.track.type === "video" && (
                  <>
                    <EffectRow
                      label="Brightness"
                      value={
                        found.clip.effects.find((e) => e.type === "brightness")
                          ?.value ?? 0
                      }
                      min={-0.5}
                      max={0.5}
                      step={0.05}
                      onChange={(v) =>
                        Math.abs(v) > 0.01
                          ? setEffect("brightness", { value: v })
                          : clearEffect("brightness")
                      }
                    />
                    <EffectRow
                      label="Contrast"
                      value={
                        found.clip.effects.find((e) => e.type === "contrast")
                          ?.value ?? 1
                      }
                      min={0.5}
                      max={2}
                      step={0.05}
                      onChange={(v) =>
                        Math.abs(v - 1) > 0.01
                          ? setEffect("contrast", { value: v })
                          : clearEffect("contrast")
                      }
                    />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function EffectRow({
  label,
  value,
  onChange,
  min = 0,
  max = 5,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex justify-between text-[11px] text-pv-muted">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}
