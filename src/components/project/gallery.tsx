import Image from "next/image";
import { Reveal } from "@/components/interactive/reveal";
import { DotMask } from "@/components/ui/dot-mask";
import type { MediaSlot } from "@/content";

/**
 * Case-study media (§7.4.6): each item under a dot mask that resolves as it
 * enters view, with its caption in meta beneath. Three across at ≥ 64rem
 * (the Clinical assistant's 700 × 1482 phone screens), stacked below, full
 * width on a phone. Every item gets its own <Reveal> so a stacked gallery
 * resolves one screen at a time rather than all at once when the first
 * appears.
 *
 * The `sizes` hint is the rail-free shell: a third of the shell's inner
 * width at ≥ 64rem is 304–400px, so 26rem covers it without over-fetching.
 */
export function Gallery({ media }: { media: MediaSlot[] }) {
  if (media.length === 0) return null;

  return (
    <section className="shell" aria-label="Gallery">
      <ul className="m-0 grid list-none gap-x-(--gutter) gap-y-12 p-0 lg:grid-cols-3">
        {media.map((item) => (
          <li key={item.src} className="min-w-0">
            <figure className="m-0">
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
                      sizes="(min-width: 64rem) 26rem, 100vw"
                    />
                  )}
                </DotMask>
              </Reveal>
              {item.caption && (
                <figcaption className="meta mt-3 text-ink-3">{item.caption}</figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
