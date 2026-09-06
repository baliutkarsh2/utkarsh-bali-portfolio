import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type DotMaskProps = {
  /** An <Image> (or <video>). It fills the frame and is object-fit: cover. */
  children: ReactNode;
  /** "16 / 9", "700 / 1482" … Reserves the box before the image lands (CLS 0). */
  ratio?: string;
  className?: string;
};

/**
 * Every screenshot resolves through the lattice. The hairline frame is a
 * separate box because a mask eats the border of the element it is on; the
 * inner box carries the `dot-mask` utility (globals.css): a disc mask at the
 * pitch whose `--dot-r` grows 0.45 → 0.71 × pitch on `data-in` from a
 * wrapping <Reveal>, then stays resolved. `dot-mask-box` (components.css)
 * reserves the ratio and fits the image. No JS here; without it, or under
 * reduced motion, the image is simply whole.
 */
export function DotMask({ children, ratio, className }: DotMaskProps) {
  const style = ratio ? ({ "--ratio": ratio } as CSSProperties) : undefined;
  return (
    <div className={cn("dot-frame", className)}>
      <div className="dot-mask dot-mask-box" style={style}>
        {children}
      </div>
    </div>
  );
}
