import { auth0, isAuth0Configured } from "@/lib/auth0";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const steps = [
  {
    title: "Universal Login",
    body: "Auth0 handles the password. SecureDesk never stores one.",
  },
  {
    title: "Your subject",
    body: "Every private request is tied to the validated Auth0 subject.",
  },
  {
    title: "Your city",
    body: "The forecast uses the city and hours saved for that account.",
  },
];

function ExampleDesk() {
  return (
    <aside className="relative rounded-[1.75rem] border border-border bg-card p-5 shadow-[0_24px_60px_rgba(20,34,27,0.08)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">Example</p>
        <p className="text-xs text-muted-foreground">Lagos · 09:00–17:00</p>
      </div>
      <p className="mt-6 font-serif text-6xl tracking-tight">28.4°</p>
      <p className="mt-2 text-lg">Partly cloudy</p>
      <p className="mt-1 text-sm text-muted-foreground">Inside working hours, and fair enough to meet outside.</p>
      <div className="mt-5 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
        Suitable for an outdoor meeting
      </div>
      <div className="mt-6 space-y-3 border-t border-border pt-5">
        <div className="ml-8 rounded-2xl bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
          What is the weather in my preferred city, and is it suitable for an outdoor meeting during my working hours?
        </div>
        <div className="mr-8 rounded-2xl bg-muted px-4 py-3 text-sm leading-6">
          28.4° and partly cloudy in Lagos. That is inside your working hours, so an outdoor meeting looks suitable.
        </div>
      </div>
    </aside>
  );
}

export default async function HomePage() {
  let signedIn = false;
  let name: string | undefined;
  let email: string | undefined;
  let subject: string | undefined;

  if (isAuth0Configured()) {
    try {
      const session = await auth0.getSession();
      signedIn = Boolean(session?.user);
      name = session?.user.name;
      email = session?.user.email;
      subject = session?.user.sub;
    } catch {
      signedIn = false;
    }
  }

  const configured = isAuth0Configured();

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute top-24 -right-24 h-80 w-80 rounded-full bg-accent/70 blur-3xl" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
        <a href="/" className="font-serif text-2xl tracking-tight">
          SecureDesk
        </a>
        {signedIn ? (
          <Button asChild variant="outline" size="sm">
            <a href="/auth/logout">Log out</a>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <a href="/auth/login">Log in</a>
          </Button>
        )}
      </header>
      <main id="main" className="relative mx-auto w-full max-w-6xl px-6 pb-16">
        <section className="grid items-center gap-12 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">Personal assistant</p>
            <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl">
              {signedIn ? `Welcome back, ${name ?? email ?? "there"}.` : "Your preferences travel with you."}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Sign in once. SecureDesk keeps your city and working hours on that account, then answers from the live
              forecast. The assistant never chooses a user id.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {configured ? (
                signedIn ? (
                  <>
                    <Button asChild size="lg">
                      <a href="/desk">Open desk</a>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <a href="/desk/assistant">Ask the assistant</a>
                    </Button>
                  </>
                ) : (
                  <Button asChild size="lg">
                    <a href="/auth/login?screen_hint=signup">Sign up</a>
                  </Button>
                )
              ) : (
                <Button asChild size="lg">
                  <a href="/setup">Finish Auth0 setup</a>
                </Button>
              )}
            </div>
            {signedIn ? (
              <div className="mt-8 max-w-xl rounded-2xl border border-border bg-card/80 px-4 py-3">
                <p className="text-sm font-semibold">Signed in as {email ?? name ?? "your Auth0 user"}</p>
                <p className="mt-1 font-mono text-xs break-all text-muted-foreground">{subject}</p>
              </div>
            ) : null}
          </div>
          <ExampleDesk />
        </section>

        <section className="mt-20 border-t border-border pt-12" aria-labelledby="session-heading">
          <h2 id="session-heading" className="font-serif text-3xl tracking-tight">
            How a session works
          </h2>
          <ol className="mt-8 grid list-none gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-3xl border border-border bg-card p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-serif text-2xl tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <footer className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground">
        <p>SecureDesk</p>
        <p>Auth0 session · Open-Meteo forecast</p>
      </footer>
    </div>
  );
}
