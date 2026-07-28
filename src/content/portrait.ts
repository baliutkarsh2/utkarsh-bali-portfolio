import type { StaticImageData } from "next/image";
import image from "@/assets/utkarsh.jpg";

/**
 * The hero portrait slot.
 *
 * To swap the photo: replace `src/assets/utkarsh.jpg` and update `alt`. The
 * static import is deliberate, it is what lets next/image generate a blur
 * placeholder automatically, which a path in `public/` cannot do.
 *
 * Set this to `null` and the hero renders a typographic plate at the identical
 * dimensions instead. Nothing else in the layout moves either way.
 */
export const portrait: { src: StaticImageData; alt: string } | null = {
  src: image,
  alt: "Utkarsh Bali looking out over the ocean at sunset",
};
