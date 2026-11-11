export interface LiquidGlassOptions {
  rim?: number;
  edge?: number;
  power?: number;
  dispersion?: number;
  radius?: number | null;
  corner?: number | null;
  enabled?: boolean;
  property?: string;
}

export interface LiquidGlassController {
  readonly supported: boolean;
  bezel: number;
  update(options?: LiquidGlassOptions): void;
  refresh(): void;
  destroy(): void;
}

export const LENS_DEFAULTS: Required<LiquidGlassOptions>;
export const ROUND_CORNER: number;
export function isLensSupported(): boolean;
export function cornerExponent(shape: string): number;
export function liquidGlass(el: HTMLElement, options?: LiquidGlassOptions): LiquidGlassController;
