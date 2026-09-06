"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { navItems, profile, socials } from "@/content/profile";
import { fuzzyMatch } from "@/lib/fuzzy";
import { getMotion, motionAllowed, setMotion } from "@/lib/motion";

export type PalettePost = {
  slug: string;
  title: string;
  summary: string;
  /** Absolute for a piece published elsewhere, site-relative otherwise. */
  href: string;
  external: boolean;
};

/**
 * The six fields a Work command needs, and nothing else: the case studies'
 * prose lives in the content barrel, which must never enter a client graph,
 * so the layout (a server component) trims the projects to this shape.
 */
export type PaletteProject = {
  slug: string;
  name: string;
  eyebrow: string;
  tagline: string;
  stack: string[];
  org?: string;
};

/** State the palette owns that a command's hint may reflect. */
type PaletteView = {
  /** True when the site-level override `<html data-motion="reduce">` is set. */
  motionReduced: boolean;
};

type Command = {
  id: string;
  label: string;
  /** Right-hand meta. A function when it mirrors state the palette owns. */
  hint: string | ((view: PaletteView) => string);
  group: "Sections" | "Work" | "Writing" | "Elsewhere" | "Actions";
  /** Extra text folded into matching but never displayed. */
  haystack?: string;
  run: (ctx: CommandContext) => void;
};

type CommandContext = {
  navigate: (href: string) => void;
  announce: (message: string) => void;
  close: () => void;
  /** Flips the site-wide reduced-motion override and announces the result. */
  toggleMotion: () => void;
};

/**
 * Built once at module scope, not rebuilt per render or per keystroke. Work
 * and Writing come from props (server-read data) and are spliced in below.
 */
const commands: Command[] = [
  ...navItems.map<Command>((item) => ({
    id: `nav:${item.href}`,
    label: item.label,
    hint: "Section",
    group: "Sections",
    run: (ctx) => ctx.navigate(item.href),
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
  {
    id: "action:motion",
    label: "Reduce motion",
    hint: (view) => (view.motionReduced ? "On" : "Off"),
    group: "Actions",
    haystack: "animation accessibility prefers-reduced-motion still dots",
    run: (ctx) => ctx.toggleMotion(),
  },
];

const GROUP_ORDER: Command["group"][] = [
  "Sections",
  "Work",
  "Writing",
  "Elsewhere",
  "Actions",
];

function hintOf(command: Command, view: PaletteView): string {
  return typeof command.hint === "function" ? command.hint(view) : command.hint;
}

function countLabel(n: number): string {
  return `${n} result${n === 1 ? "" : "s"}`;
}

/** Projects and posts are read on the server, so they arrive as props. */
export function CommandPalette({
  projects = [],
  posts = [],
}: {
  projects?: PaletteProject[];
  posts?: PalettePost[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [everOpened, setEverOpened] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("");
  const [motionReduced, setMotionReduced] = useState(false);

  const open = useCallback(() => {
    setEverOpened(true);
    setQuery("");
    setActive(0);
    setStatus("");
    // The toggle's hint mirrors <html data-motion>, which the inline head
    // script (or a previous toggle) set long before this component rendered.
    setMotionReduced(getMotion() === "reduce");
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
    const projectCommands = projects.map<Command>((project) => ({
      id: `project:${project.slug}`,
      label: project.name,
      hint: project.eyebrow,
      group: "Work",
      haystack: `${project.tagline} ${project.stack.join(" ")} ${project.org ?? ""}`,
      run: (ctx) => ctx.navigate(`/projects/${project.slug}`),
    }));
    const postCommands = posts.map<Command>((post) => ({
      id: `post:${post.slug}`,
      label: post.title,
      hint: post.external ? "External" : "Post",
      group: "Writing",
      haystack: post.summary,
      run: (ctx) => {
        if (post.external) {
          ctx.close();
          window.open(post.href, "_blank", "noopener,noreferrer");
          return;
        }
        ctx.navigate(post.href);
      },
    }));
    // Work, then Writing, after the sections: the header order.
    const cut = commands.findIndex((c) => c.group === "Elsewhere");
    return [...commands.slice(0, cut), ...projectCommands, ...postCommands, ...commands.slice(cut)];
  }, [projects, posts]);

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
    setStatus(countLabel(results.length));
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

  const toggleMotion = useCallback(() => {
    const reduce = getMotion() !== "reduce";
    // setMotion writes data-motion immediately and persists it, so the board
    // and every CSS transition respond before this render lands.
    setMotion(reduce ? "reduce" : "auto");
    setMotionReduced(reduce);
    if (reduce) {
      setStatus("Motion reduced");
    } else {
      // Clearing the override does not restore motion when the OS still asks
      // for less; say so rather than announce something that is not true.
      setStatus(motionAllowed() ? "Motion restored" : "Motion follows your system setting");
    }
  }, []);

  const ctx = useMemo<CommandContext>(
    () => ({ navigate, announce: setStatus, close, toggleMotion }),
    [navigate, close, toggleMotion],
  );

  const view: PaletteView = { motionReduced };

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

  // The <dialog> is the panel itself, so a click whose target is the dialog
  // is either on its own box (nothing there but children, so this does not
  // happen) or on the ::backdrop, which reports the dialog as the target.
  // The rect check makes that distinction explicit rather than assumed.
  function onDialogClick(event: React.MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;
    if (!dialog || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) close();
  }

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: results.filter((command) => command.group === group),
  })).filter((section) => section.items.length > 0);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Command palette"
      className="palette"
      onClose={() => setQuery("")}
      onClick={onDialogClick}
    >
      {everOpened && (
        <>
          <div className="palette-input">
            <span aria-hidden className="palette-prompt data">
              ›
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
              placeholder="Search work, writing, actions"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                // Reset selection here rather than in an effect, which would
                // cascade an extra render on every keystroke.
                setActive(0);
              }}
              onKeyDown={onInputKeyDown}
              className="palette-field text-body"
            />
          </div>

          {/* The empty state sits beside the listbox, not in it: a listbox
              may only contain options and groups. */}
          {grouped.length === 0 && (
            <p className="palette-empty text-small" role="status">
              Nothing matches &quot;{query}&quot;.
            </p>
          )}

          <div
            ref={listRef}
            id="command-list"
            role="listbox"
            aria-label="Results"
            className="palette-list"
          >
            {grouped.map((section) => (
              <div key={section.group} role="group" aria-label={section.group}>
                {/* The group carries its name; the visible label is for eyes. */}
                <p className="palette-group-label meta" aria-hidden="true">
                  {section.group}
                </p>
                {section.items.map((command) => {
                  const index = results.indexOf(command);
                  const isActive = index === active;
                  return (
                    // Compact row: label left, hint right in meta. The active
                    // row fills --ground-3 and carries the 4px --sun LED in
                    // its gutter (chrome.css), the one accent on this screen.
                    <div
                      key={command.id}
                      id={`cmd-${command.id}`}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      onMouseMove={() => setActive(index)}
                      onClick={() => command.run(ctx)}
                      className="palette-row text-small"
                    >
                      <span className="palette-row-label">{command.label}</span>
                      <span className="palette-row-hint meta">{hintOf(command, view)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="palette-foot meta">
            <span aria-hidden>↑↓ navigate · ↵ open · esc close</span>
            <span>{countLabel(results.length)}</span>
          </div>

          <p aria-live="polite" className="sr-only">
            {status}
          </p>
        </>
      )}
    </dialog>
  );
}
