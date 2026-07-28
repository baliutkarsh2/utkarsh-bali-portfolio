import Image from "next/image";
import { portrait, profile } from "@/content";

/**
 * Sibling of `SpecPlate`: renders the identical box whether or not a real
 * photo exists, so replacing the image later moves nothing on the page.
 *
 * The treatment layers (grade, scrim, corner marks) are what stop a candid
 * snapshot from looking like a snapshot. Each is driven by a token, so a
 * better photo is a value change rather than a rewrite.
 */
export function HeroPortrait() {
  return (
    <figure className="portrait-frame">
      {portrait ? (
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
    </figure>
  );
}
