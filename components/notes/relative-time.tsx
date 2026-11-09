"use client";

import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

type RelativeTimeProps = {
  value: Date;
  className?: string;
};

/**
 * Rendered on the client only so the relative label cannot hydrate differently
 * from the server. It refreshes once a minute while the page is open.
 */
export function RelativeTime({ value, className }: RelativeTimeProps) {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = window.setInterval(() => {
      setTick((tick) => tick + 1);
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <span
      className={className}
      title={format(value, "PPpp")}
      suppressHydrationWarning
    >
      {mounted
        ? formatDistanceToNow(value, { addSuffix: true })
        : format(value, "MMM d")}
    </span>
  );
}
