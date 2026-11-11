import { redirect } from "next/navigation";
import { DeskShell } from "@/components/desk-shell";
import { auth0, isAuth0Configured } from "@/lib/auth0";

export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  if (!isAuth0Configured()) {
    redirect("/setup");
  }

  const session = await auth0.getSession();
  if (!session) {
    redirect("/auth/login?returnTo=/desk");
  }

  return (
    <DeskShell
      user={{
        name: session.user.name,
        email: session.user.email,
        picture: session.user.picture,
      }}
    >
      {children}
    </DeskShell>
  );
}
