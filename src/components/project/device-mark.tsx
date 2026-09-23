import type { CSSProperties } from "react";
import type { Plate } from "@/content/plates";
import { cn } from "@/lib/utils";

/**
 * A project's device, as a vector mark.
 *
 * The drawing in scripts/bake-devices.py, written out as geometry by
 * scripts/bake-device-marks.py: solid rules, bars and discs for what is
 * primary, dotted rules for what is secondary. The page uses that SVG as a
 * mask over `currentColor`, so the mark is ink on paper, bone on the plate,
 * CanvasText in forced colours, and needs neither JavaScript nor a canvas: it
 * is in the first paint and it is sharp at every pixel ratio, which the 3 px
 * canvas dot never was on a 1x panel.
 *
 * Decorative by default (the row or the caption beside it names the project);
 * pass `label` where the mark stands alone as a figure.
 */
export function DeviceMark({
  plate,
  label,
  className,
}: {
  plate: Plate;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("device-mark", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ "--mark": `url(/portrait/${plate.id}.svg)` } as CSSProperties}
    />
  );
}
