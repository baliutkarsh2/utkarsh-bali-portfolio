import Image from "next/image";
import { HalftoneLayer } from "@/components/interactive/halftone-layer";
import { portrait, profile } from "@/content";

/**
 * Sibling of `SpecPlate`: renders the identical box whether or not a real
 * photo exists, so replacing the image later moves nothing on the page.
 *
 * The photograph is the LCP element and paints on its own. `HalftoneLayer`
 * is a separate canvas that only appears once a live four-colour press has
 * compiled on top of it, so no visitor ever waits on WebGL to see a face.
 */
export function HeroPortrait() {
  return (
    <figure>
      <div className="portrait-frame" data-loupe>
      {portrait ? (
        <>
          <Image
            src={portrait.src}
            alt={portrait.alt}
            fill
            priority
            quality={82}
            placeholder="blur"
            sizes="(min-width: 80rem) 26rem, (min-width: 48rem) 34vw, 74vw"
            className="portrait-image"
          />
          <HalftoneLayer src={portrait.src.src} />
        </>
      ) : (
        <div className="portrait-plate">
          <span className="font-display text-7xl leading-none">{profile.initials}</span>
          <div>
            <p className="meta text-faint">{profile.role}</p>
            <p className="meta mt-1.5 text-faint">{profile.location}</p>
          </div>
        </div>
      )}

        <span aria-hidden className="portrait-scrim" />
        <span aria-hidden className="portrait-mark portrait-mark-tl" />
        <span aria-hidden className="portrait-mark portrait-mark-br" />
      </div>

      <figcaption className="portrait-caption meta">
        <span>4C process</span>
        <span className="portrait-caption-hint">Point to inspect</span>
      </figcaption>
    </figure>
  );
}
