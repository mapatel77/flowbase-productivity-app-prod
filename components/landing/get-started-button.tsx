"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

type Props = {
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
};

export function GetStartedButton({
  size = "default",
  className,
  children = "Get Started",
}: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  const href = isLoaded && isSignedIn ? "/dashboard" : "/sign-in";

  return (
    <Link
      href={href}
      className={cn(buttonVariants({ size }), className)}
    >
      {children}
    </Link>
  );
}
