export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center border border-rule px-2 py-1 text-xs text-muted">
      {children}
    </span>
  );
}

export function TagRow({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item}>
          <Tag>{item}</Tag>
        </li>
      ))}
    </ul>
  );
}
