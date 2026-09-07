import { cn } from "@/lib/utils";

type NumeralProps = {
  /** The figure as text: "0.844", "Top 10%", "<1%", "~3x". */
  value: string;
  /** Two sizes: `m` for a figure in a row, `l` for the one that carries a page. */
  size: "m" | "l";
  /** Sets the figure in the accent ink. Rationed; see the palette. */
  accent?: boolean;
  as?: "span" | "p" | "dd";
};

/**
 * A figure, set in Bodoni Moda at 700 with lining tabular numerals.
 *
 * This used to be the one component that set Doto, a 2 KB hand-subset of
 * twenty-three glyphs. That subset was a cage: every metric on the site had to
 * be spellable in `0123456789.,%<>~+xKTop`, a prebuild script failed the build
 * when it was not, and this component threw in development for the same reason.
 * A Didone has the whole alphabet and a proper set of lining figures, so the
 * cage, the script and the throw are all gone — a metric can now say whatever it
 * honestly says.
 *
 * `lining-nums tabular-nums` is not cosmetic: figures stack in a column on the
 * work index and in the case-study plate, and they have to align on the decimal.
 */
export function Numeral({ value, size, accent = false, as: Tag = "span" }: NumeralProps) {
  return (
    <Tag
      className={cn(
        "numeral lining-nums tabular-nums",
        size === "l" ? "text-numeral-l" : "text-numeral",
        accent ? "text-accent" : "text-ink",
      )}
      data-size={size}
      data-accent={accent ? "" : undefined}
    >
      {value}
    </Tag>
  );
}
