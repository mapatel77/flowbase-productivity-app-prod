import Link from "next/link";
import { Boxes, Github, Linkedin, Twitter } from "lucide-react";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Product", href: "#product" },
      { label: "Pricing", href: "#pricing" },
      { label: "AI", href: "#ai" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Support", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-foreground/10 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 via-orange-400 to-amber-300 text-white">
                <Boxes className="size-4" strokeWidth={2.2} />
              </span>
              <span className="font-heading text-lg font-semibold tracking-tight">
                Flowbase
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Your AI-powered workspace for notes, tasks, whiteboards, and team
              collaboration.
            </p>
            <div className="mt-4 flex items-center gap-2">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <div className="font-heading text-sm font-semibold tracking-tight">
                {col.title}
              </div>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-foreground/10 pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Flowbase. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
