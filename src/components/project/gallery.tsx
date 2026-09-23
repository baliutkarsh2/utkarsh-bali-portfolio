import Image from "next/image";
import { DotMask } from "@/components/ui/dot-mask";
import type { MediaSlot } from "@/content";

/**
 * The screens: a case study's screenshots, each pressed into the sheet in its
 * own plate mark with its caption under it, the way a plate is captioned.
 *
 * Three across at >= 48rem (the clinical assistant's 700 x 1482 phone
 * screens); below that, a strip that scrolls sideways inside itself, each
 * screen about two thirds of the column so the next one shows at the edge.
 * It sits inside a movement of its own, so its left edge is the text
 * column's and the running head in the margin says what it is. The column
 * gap is wider than the plate mark's inset twice over, so two marks never
 * touch.
 */
export function Gallery({ media }: { media: MediaSlot[] }) {
  if (media.length === 0) return null;

  return (
    <ul className="plate-grid">
      {media.map((item) => (
        <li key={item.src}>
          <figure className="plate-mark m-0">
            <DotMask ratio={`${item.width} / ${item.height}`}>
              {item.kind === "video" ? (
                // The content type allows a video slot; none exists yet.
                // Muted, inline and on demand so nothing plays by itself.
                <video
                  src={item.src}
                  width={item.width}
                  height={item.height}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  aria-label={item.alt}
                />
              ) : (
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  sizes="(min-width: 48rem) 15rem, 68vw"
                />
              )}
            </DotMask>
          </figure>
          {item.caption && <p className="plate-caption caption">{item.caption}</p>}
        </li>
      ))}
    </ul>
  );
}
