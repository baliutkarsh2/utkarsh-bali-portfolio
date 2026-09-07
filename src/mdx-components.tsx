import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import Image from "next/image";
import { Children, isValidElement, type ComponentPropsWithoutRef } from "react";
import { DotMask } from "@/components/ui/dot-mask";
import { Reveal } from "@/components/interactive/reveal";
import { Note } from "@/components/writing/note";

/**
 * Required by @next/mdx. Maps MDX output onto the site's type system so a
 * post inherits the token scale instead of browser defaults.
 *
 * Nearly all of the styling is CSS: the `.prose` block in components.css
 * sets the body in Source Serif, the Bodoni headings (with the anchors that
 * rehype-autolink-headings wraps around them as `a.heading-anchor`), the
 * underlined links, the 2 px blockquote rule, and code on --ground-2 with
 * its inline token colours. This file covers only
 * what needs a real component: routing-aware links, images resolving
 * through a dot mask, a scroll container for wide tables, and two guards
 * (a second h1 in a body, a paragraph that is only a picture).
 */

type ImgProps = ComponentPropsWithoutRef<"img">;

/** A positive pixel count from an `<img width>`-style value, else undefined. */
function toDimension(value: ImgProps["width"]): number | undefined {
  const n =
    typeof value === "number" ? value : value ? Number(value) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** The prose column is 44rem; below 48rem the picture runs the viewport. */
const IMAGE_SIZES = "(min-width: 48rem) 44rem, 100vw";

/**
 * Every picture in a post resolves through the lattice (§7.6): a <DotMask>
 * (hairline frame, ground-2 behind, the disc mask at the pitch) inside a
 * <Reveal>, which is what lands `data-in` and grows the discs from a dot
 * screen to a whole image over --dur-3 as it enters view. Without JS or under
 * reduced motion the mask is resolved from the first frame.
 *
 * Always next/image, never a raw <img>. With both dimensions known
 * (`<img src width height>` in the MDX) the ratio is reserved and the box
 * never jumps. Without them it is Next's own pattern for a picture of unknown
 * size: 0 × 0 intrinsic attributes, the real size read from the file, and the
 * CSS box from the mask (width 100 %, height auto); that one case is a layout
 * shift by nature, so give pictures their dimensions. A remote host is served
 * as-is (`unoptimized`): the config declares no `images.remotePatterns`, and
 * without the flag next/image would refuse the URL.
 *
 * The markdown `title` ("![alt](src "title")") becomes the caption, set in
 * meta by `.prose figure figcaption`.
 */
function MdxImage({ src = "", alt = "", title, width, height }: ImgProps) {
  const source = String(src);
  const w = toDimension(width);
  const h = toDimension(height);
  const sized = w !== undefined && h !== undefined;
  const remote = !source.startsWith("/");

  return (
    <figure>
      <Reveal>
        <DotMask ratio={sized ? `${w} / ${h}` : undefined}>
          {sized ? (
            <Image
              src={source}
              alt={alt}
              width={w}
              height={h}
              sizes={IMAGE_SIZES}
              unoptimized={remote}
            />
          ) : (
            <Image
              src={source}
              alt={alt}
              width={0}
              height={0}
              sizes={IMAGE_SIZES}
              unoptimized={remote}
              className="h-auto w-full"
            />
          )}
        </DotMask>
      </Reveal>
      {title && <figcaption>{title}</figcaption>}
    </figure>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    /**
     * Marginalia, so a post can write <Note>…</Note> or
     * <Note kind="quote">…</Note> at the point in the text the note answers,
     * with no import. Its y-position is the flow's; the margin column it
     * hangs in is `.column-note` in plates.css.
     */
    Note,

    a: ({ href = "", children, ...props }) => {
      if (/^https?:\/\//.test(href)) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        );
      }
      if (href.startsWith("/")) {
        return (
          <Link href={href} {...props}>
            {children}
          </Link>
        );
      }
      // Same-page anchors (the heading autolinks are `#id`), mailto:, tel:.
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },

    // The page's title is the one h1; a body heading written as `#` is
    // demoted so the outline stays in order. Its id and anchor come along.
    h1: ({ children, ...props }) => <h2 {...props}>{children}</h2>,

    img: MdxImage,

    // Markdown puts a lone image inside a paragraph. A <figure> cannot live
    // in a <p>, so a paragraph whose only child is a picture is unwrapped.
    // MDX hands us our own `img` component as the child's type, which makes
    // the check exact rather than a guess at the element name.
    p: ({ children, ...props }) => {
      const kids = Children.toArray(children);
      if (
        kids.length === 1 &&
        isValidElement(kids[0]) &&
        kids[0].type === MdxImage
      ) {
        return kids[0];
      }
      return <p {...props}>{children}</p>;
    },

    // Wide content scrolls inside itself; the page never scrolls sideways.
    table: ({ children, ...props }) => (
      <div className="table-scroll">
        <table {...props}>{children}</table>
      </div>
    ),

    ...components,
  };
}
