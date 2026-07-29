/**
 * A real four-colour process screen, written as a single fragment shader.
 *
 * The image is separated into CMYK, each ink is screened on its own
 * traditional angle (C 15, M 75, Y 0, K 45 degrees), and the four screens are
 * multiplied down onto paper white. Those angles are what produce a rosette
 * rather than a moire, and they are the reason this reads as printing rather
 * than as a "halftone filter".
 *
 * No library. The whole thing compiles to a few hundred bytes of GLSL.
 */

export const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAG = `
precision highp float;

uniform sampler2D uTex;
uniform vec2  uRes;     // drawing buffer size, px
uniform vec2  uImg;     // source image size, px
uniform float uFocus;   // vertical framing, 0 top .. 1 bottom
uniform float uResolve; // 0 fully screened .. 1 continuous tone
uniform float uFreq;    // screen ruling: cell size in px
uniform vec3  uPaper;   // paper colour the inks print onto
uniform vec3  uLoupe;   // xy centre px, z radius px (0 disables)
uniform float uZoom;    // loupe magnification

varying vec2 vUv;

/** Map a normalised frame coordinate onto the image with cover framing. */
vec2 coverUv(vec2 uv) {
  float ca = uRes.x / uRes.y;
  float ia = uImg.x / uImg.y;
  vec2 vis = ca > ia ? vec2(1.0, ia / ca) : vec2(ca / ia, 1.0);
  float cy = clamp(uFocus, vis.y * 0.5, 1.0 - vis.y * 0.5);
  return vec2(0.5 + (uv.x - 0.5) * vis.x, cy + (uv.y - 0.5) * vis.y);
}

/**
 * One ink screened at a given angle. Dot radius follows sqrt of ink density so
 * that dot AREA is linear in density, which is how real screening behaves.
 */
float screenInk(vec2 px, float angle, float ink, float freq) {
  float s = sin(angle);
  float c = cos(angle);
  vec2 p = mat2(c, -s, s, c) * px;
  vec2 cell = fract(p / freq) - 0.5;
  float d = length(cell) * 2.0;
  float r = sqrt(clamp(ink, 0.0, 1.0));
  // Softness scales with cell size so the dots stay crisp at any ruling.
  float aa = 2.4 / freq;
  return smoothstep(r + aa, r - aa, d);
}

vec3 separate(vec2 uv, vec2 px, float freq) {
  vec3 rgb = texture2D(uTex, uv).rgb;

  float k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);
  float ik = 1.0 - k;
  vec3 cmy = ik > 0.0015 ? clamp((vec3(1.0) - rgb - k) / ik, 0.0, 1.0) : vec3(0.0);

  float C = screenInk(px, 0.261799, cmy.x, freq);
  float M = screenInk(px, 1.308997, cmy.y, freq);
  float Y = screenInk(px, 0.0,      cmy.z, freq);
  float K = screenInk(px, 0.785398, k,     freq);

  vec3 col = uPaper;
  col *= mix(vec3(1.0), vec3(0.00, 0.68, 0.94), C * 0.90);
  col *= mix(vec3(1.0), vec3(0.93, 0.00, 0.55), M * 0.90);
  col *= mix(vec3(1.0), vec3(1.00, 0.95, 0.00), Y * 0.85);
  col *= mix(vec3(1.0), vec3(0.06, 0.06, 0.05), K * 0.94);
  return col;
}

void main() {
  vec2 px = vUv * uRes;
  vec2 uv = coverUv(vUv);
  vec3 photo = texture2D(uTex, uv).rgb;

  // The image resolves from the top down, the way a sheet clears the press.
  // vUv.y is 1 at the top of the canvas, so depth runs 0 at top to 1 at foot.
  float depth = 1.0 - vUv.y;
  float prog = mix(-0.05, 1.4, uResolve);
  float sweep = 1.0 - smoothstep(prog - 0.34, prog, depth);
  vec3 col = mix(separate(uv, px, uFreq), photo, sweep);

  // Loupe: magnify the sheet, and magnify the screen with it, which is what
  // looking at real printed matter through glass actually does.
  if (uLoupe.z > 0.5) {
    float d = distance(px, uLoupe.xy);
    if (d < uLoupe.z + 2.0) {
      vec2 mpx = (px - uLoupe.xy) / uZoom + uLoupe.xy;
      vec2 muv = coverUv(mpx / uRes);
      vec3 mag = separate(muv, px, uFreq * uZoom);
      float inside = 1.0 - smoothstep(uLoupe.z - 1.5, uLoupe.z, d);
      col = mix(col, mag, inside);
      // Ground glass rim. Thin: a heavy ring reads as a sticker, not optics.
      float rim = smoothstep(uLoupe.z - 1.6, uLoupe.z - 0.4, d) *
                  (1.0 - smoothstep(uLoupe.z, uLoupe.z + 1.0, d));
      col = mix(col, vec3(0.06, 0.06, 0.05), rim * 0.6);
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

type Uniforms = Record<string, WebGLUniformLocation | null>;

export type PressState = {
  resolve: number;
  loupe: { x: number; y: number; r: number };
  zoom: number;
  /** Re-sent each frame so a theme flip needs no rebuild. */
  paper: [number, number, number];
};

export type Press = {
  draw(state: PressState): void;
  resize(w: number, h: number): void;
  dispose(): void;
};

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/**
 * Builds the press for one canvas. Returns null on any failure, which is the
 * signal for the caller to leave the plain photograph alone.
 */
export function createPress(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  paper: [number, number, number],
  focus: number,
  freq: number,
): Press | null {
  const gl =
    (canvas.getContext("webgl", { antialias: false, alpha: false }) as WebGLRenderingContext) ??
    null;
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // Non power of two source, so clamp and linear filtering with no mipmaps.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  const u: Uniforms = {};
  for (const name of [
    "uTex",
    "uRes",
    "uImg",
    "uFocus",
    "uResolve",
    "uFreq",
    "uPaper",
    "uLoupe",
    "uZoom",
  ]) {
    u[name] = gl.getUniformLocation(prog, name);
  }

  gl.uniform1i(u.uTex, 0);
  gl.uniform2f(u.uImg, image.naturalWidth, image.naturalHeight);
  gl.uniform1f(u.uFocus, focus);
  gl.uniform1f(u.uFreq, freq);
  gl.uniform3f(u.uPaper, paper[0], paper[1], paper[2]);

  return {
    resize(w, h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.uRes, w, h);
    },
    draw({ resolve, loupe, zoom, paper: sheet }) {
      gl.uniform1f(u.uResolve, resolve);
      gl.uniform3f(u.uLoupe, loupe.x, loupe.y, loupe.r);
      gl.uniform1f(u.uZoom, zoom);
      gl.uniform3f(u.uPaper, sheet[0], sheet[1], sheet[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
