import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import Image from "next/image";

/**
 * Required by @next/mdx. Maps MDX output onto the editorial system so posts
 * inherit the site's type scale rather than browser defaults.
 *
 * Most styling lives in `.prose` in globals.css; this file handles the cases
 * that need real components (routing-aware links, optimized images).
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href = "", children, ...props }) => {
      const external = /^https?:\/\//.test(href);
      if (external) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        );
      }
      return (
        <Link href={href} {...props}>
          {children}
        </Link>
      );
    },
    img: ({ src = "", alt = "", width, height }) => (
      <Image
        src={String(src)}
        alt={alt}
        width={Number(width) || 1600}
        height={Number(height) || 900}
        sizes="(min-width: 48rem) 44rem, 100vw"
        className="graded h-auto w-full border border-rule"
      />
    ),
    ...components,
  };
}
