"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { navItems, orderedProjects, profile, socials } from "@/content";
import { fuzzyMatch } from "@/lib/fuzzy";
import { toggleTheme } from "./theme-toggle";

export type PalettePost = { slug: string; title: string; summary: string };

type Command = {
  id: string;
  label: string;
  hint: string;
  group: "Sections" | "Work" | "Writing" | "Elsewhere" | "Actions";
  /** Extra text folded into matching but never displayed. */
  haystack?: string;
  run: (ctx: CommandContext) => void;
};

type CommandContext = {
  navigate: (href: string) => void;
  announce: (message: string) => void;
  close: () => void;
};

/** Built once at module scope, not rebuilt per render or per keystroke. */
const commands: Command[] = [
  ...navItems.map<Command>((item) => ({
    id: `nav:${item.href}`,
    label: item.label,
    hint: "Section",
    group: "Sections",
    run: (ctx) => ctx.navigate(item.href),
  })),
  ...orderedProjects.map<Command>((project) => ({
    id: `project:${project.slug}`,
    label: project.name,
    hint: project.eyebrow,
    group: "Work",
    haystack: `${project.tagline} ${project.stack.join(" ")} ${project.org ?? ""}`,
    run: (ctx) => ctx.navigate(`/projects/${project.slug}`),
  })),
  ...socials
    .filter((s) => s.kind !== "email")
    .map<Command>((social) => ({
      id: `social:${social.kind}`,
      label: social.label,
      hint: "Opens in a new tab",
      group: "Elsewhere",
      run: (ctx) => {
        window.open(social.href, "_blank", "noopener,noreferrer");
        ctx.close();
      },
    })),
  {
    id: "action:theme",
    label: "Switch colour theme",
    hint: "Light / dark",
    group: "Actions",
    haystack: "dark light mode appearance",
    run: (ctx) => {
      toggleTheme();
      ctx.announce("Theme switched");
    },
  },
  {
    id: "action:copy-email",
    label: "Copy email address",
    hint: profile.email,
    group: "Actions",
    haystack: "contact mail reach out",
    run: (ctx) => {
      navigator.clipboard
        ?.writeText(profile.email)
        .then(() => ctx.announce("Email address copied"))
        .catch(() => ctx.announce("Could not copy. Select it manually."));
    },
  },
  ...(profile.resume
    ? [
        {
          id: "action:resume",
          label: "Download résumé",
          hint: "PDF",
          group: "Actions" as const,
          haystack: "cv pdf",
          run: (ctx: CommandContext) => {
            window.open(profile.resume!.href, "_blank", "noopener,noreferrer");
            ctx.close();
          },
        },
      ]
    : []),
  {
    id: "action:source",
    label: "View site source",
    hint: "GitHub",
    group: "Actions",
    haystack: "code repo repository",
    run: (ctx) => {
      window.open(profile.github, "_blank", "noopener,noreferrer");
      ctx.close();
    },
  },
];

const GROUP_ORDER: Command["group"][] = [
  "Sections",
  "Work",
  "Writing",
  "Elsewhere",
  "Actions",
];

/** Posts are read through a server-only module, so they arrive as a prop. */
export function CommandPalette({ posts = [] }: { posts?: PalettePost[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [everOpened, setEverOpened] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("");

  const open = useCallback(() => {
    setEverOpened(true);
    setQuery("");
    setActive(0);
    setStatus("");
    // Wait for the contents to mount before showing, so focus lands correctly.
    requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) dialog.showModal();
      inputRef.current?.focus();
    });
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isShortcut || (event.key === "/" && !typing && !dialogRef.current?.open)) {
        event.preventDefault();
        if (dialogRef.current?.open) close();
        else open();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-palette", open);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-palette", open);
    };
  }, [open, close]);

  const allCommands = useMemo<Command[]>(() => {
    if (posts.length === 0) return commands;
    const postCommands = posts.map<Command>((post) => ({
      id: `post:${post.slug}`,
      label: post.title,
      hint: "Post",
      group: "Writing",
      haystack: post.summary,
      run: (ctx) => ctx.navigate(`/writing/${post.slug}`),
    }));
    // Writing sits after Work, matching the header order.
    const cut = commands.findIndex((c) => c.group === "Elsewhere");
    return [...commands.slice(0, cut), ...postCommands, ...commands.slice(cut)];
  }, [posts]);

  const results = useMemo(() => {
    if (!query.trim()) return allCommands;
    return allCommands
      .map((command) => {
        const primary = fuzzyMatch(query, command.label);
        const secondary = command.haystack ? fuzzyMatch(query, command.haystack) : null;
        if (!primary && !secondary) return null;
        // A hit in the visible label always outranks one in hidden metadata.
        const score = Math.max(primary ? primary.score + 12 : 0, secondary?.score ?? 0);
        return { command, score };
      })
      .filter((x): x is { command: Command; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.command);
  }, [query, allCommands]);

  useEffect(() => {
    if (!dialogRef.current?.open) return;
    setStatus(`${results.length} result${results.length === 1 ? "" : "s"}`);
  }, [results.length]);

  const navigate = useCallback(
    (href: string) => {
      close();
      if (href.startsWith("/#")) {
        const id = href.slice(2);
        // Let the hash drive focus and scrolling natively.
        if (window.location.pathname === "/") {
          window.location.hash = id;
        } else {
          router.push(href);
        }
        return;
      }
      router.push(href);
    },
    [close, router],
  );

  const ctx = useMemo<CommandContext>(
    () => ({ navigate, announce: setStatus, close }),
    [navigate, close],
  );

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || (event.key === "n" && event.ctrlKey)) {
      event.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === "ArrowUp" || (event.key === "p" && event.ctrlKey)) {
      event.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      results[active]?.run(ctx);
    }
  }

  // Keep the highlighted row in view during keyboard traversal.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: results.filter((command) => command.group === group),
  })).filter((section) => section.items.length > 0);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Command palette"
      onClose={() => setQuery("")}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      className="m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-foreground/25 backdrop:backdrop-blur-[2px]"
    >
      {everOpened && (
        <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
          <div
            className="w-full max-w-xl border border-rule-strong bg-background shadow-2xl shadow-foreground/10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-rule px-4">
              <span aria-hidden className="meta text-faint">
                &gt;
              </span>
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded
                aria-controls="command-list"
                aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
                aria-autocomplete="list"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search projects, sections, actions…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  // Reset selection here rather than in an effect, which would
                  // cascade an extra render on every keystroke.
                  setActive(0);
                }}
                onKeyDown={onInputKeyDown}
                className="h-13 w-full bg-transparent text-base text-foreground outline-none placeholder:text-faint"
              />
              <kbd className="meta hidden shrink-0 border border-rule px-1.5 py-1 text-faint sm:block">
                ESC
              </kbd>
            </div>

            <div ref={listRef} id="command-list" role="listbox" className="max-h-[52vh] overflow-y-auto py-2">
              {grouped.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted">
                  Nothing matches &ldquo;{query}&rdquo;.
                </p>
              )}

              {grouped.map((section) => (
                <div key={section.group} role="group" aria-label={section.group}>
                  <p className="meta px-4 pb-1.5 pt-3 text-faint">{section.group}</p>
                  {section.items.map((command) => {
                    const index = results.indexOf(command);
                    const isActive = index === active;
                    return (
                      <div
                        key={command.id}
                        id={`cmd-${command.id}`}
                        role="option"
                        aria-selected={isActive}
                        data-active={isActive}
                        onMouseMove={() => setActive(index)}
                        onClick={() => command.run(ctx)}
                        className={`flex cursor-pointer items-baseline justify-between gap-4 px-4 py-2.5 text-sm ${
                          isActive ? "bg-inset text-foreground" : "text-muted"
                        }`}
                      >
                        <span className="truncate">{command.label}</span>
                        <span className="meta shrink-0 truncate text-faint">{command.hint}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <p aria-live="polite" className="sr-only">
              {status}
            </p>
          </div>
        </div>
      )}
    </dialog>
  );
}
