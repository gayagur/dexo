import ReactPixel from "react-facebook-pixel";

const PIXEL_ID = "2493913244361523";
const IS_PROD = typeof window !== "undefined" && import.meta.env.PROD;

let initialized = false;

/** Initialize Meta Pixel — call once on app load */
export function initPixel(): void {
  if (initialized) return;

  if (IS_PROD) {
    ReactPixel.init(PIXEL_ID, {}, { autoConfig: true, debug: false });
  }

  initialized = true;
}

/** Track a page view */
export function pixelPageView(): void {
  if (IS_PROD) {
    ReactPixel.pageView();
  } else {
    console.debug("[pixel] PageView", window.location.pathname);
  }
}

/** Track a standard Meta event */
export function pixelTrack(event: string, data?: Record<string, unknown>): void {
  if (IS_PROD) {
    ReactPixel.track(event, data);
  } else {
    console.debug("[pixel]", event, data ?? "");
  }
}

// ─── Convenience wrappers for specific events ────────────

export function pixelViewContent(contentName: string, contentId?: string): void {
  pixelTrack("ViewContent", { content_name: contentName, content_ids: contentId ? [contentId] : undefined });
}

export function pixelCompleteRegistration(role: string): void {
  pixelTrack("CompleteRegistration", { content_name: role });
}

export function pixelCustomizeProduct(method: string): void {
  pixelTrack("CustomizeProduct", { content_name: method });
}

export function pixelSearch(query: string): void {
  pixelTrack("Search", { search_string: query });
}

export function pixelContact(): void {
  pixelTrack("Contact");
}

export function pixelLead(projectName?: string): void {
  pixelTrack("Lead", projectName ? { content_name: projectName } : undefined);
}

export function pixelInitiateCheckout(offerId?: string): void {
  pixelTrack("InitiateCheckout", offerId ? { content_ids: [offerId] } : undefined);
}
