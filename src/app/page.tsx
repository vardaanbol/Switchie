import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    redirect(session.user.profileComplete ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-16">
      <main className="flex w-full max-w-lg flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit">
            AI Job Finder Agent
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Job Finder Agent
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Daily curated roles matched to your salary (₹), locations, and
            skills — with pros, cons, and public referral contacts.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo: params.callbackUrl || "/onboarding",
            });
          }}
        >
          <Button type="submit" size="lg" className="w-full">
            Sign in with Google
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          By continuing you agree to receive optional daily digests you can turn
          off in settings.
        </p>
      </main>
    </div>
  );
}
