import type { ReactNode } from "react";
import Link from "next/link";
import { DeskNav } from "@/components/desk-nav";
import { Button } from "@/components/ui/button";

type DeskUser = {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
};

function initials(user: DeskUser): string {
  const source = user.name?.trim() || user.email?.trim() || "S";
  const parts = source.split(/[\s@]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DeskShell({ user, children }: { user: DeskUser; children: ReactNode }) {
  const label = user.name || user.email || "Signed in";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-6">
      <header className="sticky top-0 z-20 -mx-4 mb-8 border-b border-border/80 bg-background/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/desk"
            className="mr-auto font-serif text-2xl tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            SecureDesk
          </Link>
          <DeskNav />
          <div className="flex items-center gap-2">
            {user.picture ? (
              // Auth0 profile images come from tenant-specific hosts.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.picture} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials(user)}
              </span>
            )}
            <div className="max-w-28 min-w-0 leading-tight sm:max-w-40">
              <p className="truncate text-sm font-semibold">{label}</p>
              {user.email && user.name ? (
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{user.email}</p>
              ) : null}
            </div>
            <Button asChild variant="outline" size="sm">
              <a href="/auth/logout">Log out</a>
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="pb-12">
        {children}
      </main>
    </div>
  );
}
