import Image from "next/image";
import { Reveal } from "@/components/interactive/reveal";
import { DotMask } from "@/components/ui/dot-mask";
import type { MediaSlot } from "@/content";

/**
 * The plates: the case study's screenshots, pressed into the sheet rather than
 * floated over it. Each image sits in its --ground-2 well (the shared
 * `.dot-frame`, which is also what reserves its ratio) and the plate mark — the
 * one container on this site — is struck a little outside the well, so the
 * whole thing reads as an impression in the paper instead of a card on it.
 *
 * Three across at ≥ 64rem (the clinical assistant's 700 × 1482 phone screens),
 * stacked below. The column gap is wider than the page gutter on purpose: two
 * plate marks eat 20px of it and the marks must not touch. Each item keeps its
 * own <Reveal> so a stacked gallery resolves one screen at a time.
 *
 * Captions are the `caption` utility now, not `meta`: a caption under a plate
 * is a sentence a person reads, and mono uppercase is for machine labels.
 *
 * The `sizes` hint: the grid is capped at --plate-lede (52rem) like every other
 * figure on the sheet, so a third of it less two --space-6 gaps is about 15rem.
 */
export function Gallery({ media }: { media: MediaSlot[] }) {
  if (media.length === 0) return null;

  return (
    <section className="plates-band sheet-row shell" aria-labelledby="plates-title">
      <h2 id="plates-title" className="movement-title meta">
        Plates
      </h2>

      <ul className="plate-grid">
        {media.map((item) => (
          <li key={item.src}>
            <figure className="plate-mark m-0">
              <Reveal>
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
                      sizes="(min-width: 64rem) 15rem, 100vw"
                    />
                  )}
                </DotMask>
              </Reveal>
              {item.caption && <figcaption className="caption">{item.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
