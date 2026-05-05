declare module "react-facebook-pixel" {
  interface ReactPixel {
    init(pixelId: string, advancedMatching?: Record<string, string>, options?: { autoConfig?: boolean; debug?: boolean }): void;
    pageView(): void;
    track(event: string, data?: Record<string, unknown>): void;
    trackSingle(pixelId: string, event: string, data?: Record<string, unknown>): void;
    trackCustom(event: string, data?: Record<string, unknown>): void;
    fbq(...args: unknown[]): void;
  }

  const ReactPixel: ReactPixel;
  export default ReactPixel;
}
