import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in · SpentWise",
};

export default async function LoginPage({
  searchParams,
}: {
  // `searchParams` is a Promise in Next.js 16.
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/home";

  return (
    <main
      className="flex min-h-dvh flex-col justify-center px-gutter"
      style={{
        paddingTop: "max(44px, env(safe-area-inset-top))",
        paddingBottom: "max(44px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto w-full max-w-md">
        <header className="pb-section">
          <h1 className="text-figure text-ink">SpentWise</h1>
          <p className="pt-3 text-body text-ink-faint">
            A calm, private place to track what you spend.
          </p>
        </header>

        <LoginForm next={target} initialError={error} />
      </div>
    </main>
  );
}
