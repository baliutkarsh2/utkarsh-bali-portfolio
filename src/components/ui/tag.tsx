import Link from "next/link";
import type { ReactNode } from "react";

type TagProps = {
  children: ReactNode;
  href?: string;
};

const isExternal = (href: string) => /^https?:\/\//.test(href);

/**
 * Meta text, no border, no fill. A publisher name, a status word, a kind.
 * With an href it is a quiet link: internal through <Link>, external in a
 * new tab with the sr-only notice.
 */
export function Tag({ children, href }: TagProps) {
  if (!href) {
    return <span className="tag meta">{children}</span>;
  }
  if (isExternal(href)) {
    return (
      <a className="tag meta" href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link className="tag meta" href={href}>
      {children}
    </Link>
  );
}

/**
 * A list of tags as one meta line joined by middots (§7.7 "tags[] as a meta
 * line"). Kept from the previous site so existing imports resolve; the chips
 * are gone.
 */
export function TagRow({ items, label }: { items: readonly string[]; label?: string }) {
  return (
    <ul className="tag-row meta" aria-label={label}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
