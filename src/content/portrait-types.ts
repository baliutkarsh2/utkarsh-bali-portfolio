/**
 * A baked dot field. Generated modules (portrait-field-*.ts) conform to this;
 * the board renderer (src/lib/board.ts) consumes it.
 */
export type BoardField = {
  /** Grid columns and rows. */
  w: number;
  h: number;
  /** Lit cells (luminance >= 0.05). */
  count: number;
  /** [x, y] cell of the eye catchlight: the one fixed, always-sun dot. */
  datum: [number, number];
  /** [x, y] face centre, used to order the assembly. */
  center: [number, number];
  /** Indices (y * w + x) of the brightest 2% of lit cells, drawn in --sun. */
  rim: number[];
  /**
   * base64 of w * h bytes, row-major: 0 = outside the mask (nothing drawn),
   * 1..12 = inside but unlit, 13..255 = luminance * 255.
   */
  data: string;
};
