"use client";

import { useEffect, useState } from "react";

export function Greeting() {
  const [message, setMessage] = useState({
    greeting: "Welcome back",
    date: "",
  });

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();

    setMessage({
      greeting:
        hour < 12
          ? "Good morning"
          : hour < 18
            ? "Good afternoon"
            : "Good evening",
      date: now.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    });
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-[28px]">
        {message.greeting}, Arav
      </h1>
      <p className="text-sm text-muted-foreground">
        {message.date || "Loading your workspace…"} · 3 tasks due today
      </p>
    </div>
  );
}
