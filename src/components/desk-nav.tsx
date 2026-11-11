"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/desk", label: "Desk" },
  { href: "/desk/assistant", label: "Assistant" },
] as const;

export function DeskNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Desk" className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
      {items.map((item) => {
        const current = item.href === "/desk" ? pathname === "/desk" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              current ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
