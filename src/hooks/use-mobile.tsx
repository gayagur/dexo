import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export interface MobileInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isMobileLayout: boolean;
}

export function useMobileInfo(): MobileInfo {
  const [width, setWidth] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    const mqlMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const mqlTablet = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`);
    const onChange = () => setWidth(window.innerWidth);
    mqlMobile.addEventListener("change", onChange);
    mqlTablet.addEventListener("change", onChange);
    setWidth(window.innerWidth);
    return () => {
      mqlMobile.removeEventListener("change", onChange);
      mqlTablet.removeEventListener("change", onChange);
    };
  }, []);

  const isMobile = width !== undefined && width < MOBILE_BREAKPOINT;
  const isTablet = width !== undefined && width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
  const isDesktop = width !== undefined && width >= TABLET_BREAKPOINT;
  const isTouchDevice = typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    isMobileLayout: isMobile || isTablet,
  };
}

/** @deprecated Use useMobileInfo().isMobile instead. Kept for backwards compatibility. */
export function useIsMobile() {
  const { isMobile } = useMobileInfo();
  return isMobile;
}
