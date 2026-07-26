import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongodb";
import { getBetaSeatStats } from "@/lib/beta-seats";
import { LandingHero } from "@/components/ui/landing-hero";
import { LandingFeatures } from "@/components/ui/landing-features";
import { LandingFooter } from "@/components/layout/landing-footer";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    redirect(session.user.profileComplete ? "/dashboard" : "/onboarding");
  }

  await connectDB();
  const seats = await getBetaSeatStats();

  return (
    <main>
      <LandingHero
        seatsLeft={seats.remainingPublic}
        phaseFull={seats.isPublicFull}
        noSeatsError={params.error === "no_seats"}
      >
        <form
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo: params.callbackUrl || "/onboarding",
            });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2.5 rounded-md border-[2.5px] border-black bg-white px-6 py-3 text-sm font-black tracking-wide text-black shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5 hover:bg-[#ffe566] active:translate-y-0 active:shadow-[2px_2px_0_#000]"
          >
            <GoogleMark />
            Sign in with Google
          </button>
        </form>
        {seats.isPublicFull && params.error !== "no_seats" ? (
          <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-black/45">
            Existing yawners can still sign in
          </p>
        ) : null}
      </LandingHero>

      <LandingFeatures />
      <LandingFooter />
    </main>
  );
}
