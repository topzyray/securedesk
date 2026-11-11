export const dynamic = "force-dynamic";

const steps = [
  "Create a Regular Web Application in the Auth0 dashboard.",
  "Leave AUTH0_AUDIENCE blank, or set it to a custom API identifier that uses RS256.",
  "Allow callback http://localhost:3000/auth/callback, logout http://localhost:3000, and web origin http://localhost:3000.",
  "Copy the environment template to .env.local and fill in the Auth0, database, and OpenAI values.",
  "Run the database migration, then start the app and use Log in.",
];

export default function SetupPage() {
  return (
    <main id="main" className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-12">
      <p className="text-sm font-semibold tracking-[0.18em] text-primary uppercase">Setup</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight">Connect Auth0</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
        SecureDesk is wired to Auth0 Universal Login. Add the credentials below, then restart the server. No local
        password form is used.
      </p>
      <ol className="mt-8 list-none space-y-4 rounded-3xl border border-border bg-card p-6">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-4 text-sm leading-6">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <a className="mt-8 w-fit text-sm font-semibold text-primary underline-offset-4 hover:underline" href="/">
        Back home
      </a>
    </main>
  );
}
