"use client";

import * as React from "react";

/**
 * Tracks a CSS media query. Returns `false` during the first render so the
 * server and client markup always match, then updates after mount.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    onChange();
    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True on phone-sized viewports, where the month grid collapses to dots. */
export function useIsCompactCalendar() {
  return useMediaQuery("(max-width: 767px)");
}
