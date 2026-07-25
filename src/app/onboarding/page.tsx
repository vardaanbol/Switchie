import { auth, signOut } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/models/User";
import { ProfileForm } from "@/components/profile/profile-form";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { SawbladeMark } from "@/components/brand/sawblade-mark";
import { AppHeader, HeaderAction } from "@/components/layout/app-header";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) redirect("/");

  return (
    <div className="comic-paper relative min-h-dvh overflow-x-hidden text-black">
      <div className="comic-halftone pointer-events-none absolute inset-0 opacity-[0.3]" />
      <SawbladeMark className="pointer-events-none absolute -right-8 top-24 size-32 text-black/[0.06]" />

      <AppHeader
        maxWidth="max-w-2xl"
        actions={
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <HeaderAction type="submit" aria-label="Sign out">
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Out</span>
            </HeaderAction>
          </form>
        }
      />

      <main className="relative z-10 mx-auto w-full max-w-2xl px-3 py-7 sm:px-5 sm:py-9">
        <div className="mb-6 overflow-hidden rounded-lg border-[3px] border-black bg-[#fffef8] p-4 shadow-[4px_4px_0_#000] sm:mb-8 sm:p-6 sm:shadow-[6px_6px_0_#000]">
          <div className="mb-2 inline-block -rotate-2 rounded-md border-[3px] border-black bg-[#ff6b6b] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#000]">
            Step 01
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            Tell us what you want
          </h1>
          <p className="mt-3 max-w-md border-l-[3px] border-black pl-4 text-sm font-medium leading-relaxed text-black/65">
            A few preferences so we can match roles to your salary, locations,
            and skills — all in ₹.
          </p>
        </div>

        <div className="rounded-lg border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_#000] sm:p-7 sm:shadow-[6px_6px_0_#000]">
          <ProfileForm
            mode="onboarding"
            initial={{
              name: user.name,
              salaryExpectationMin: user.profile?.salaryExpectationMin ?? 800000,
              salaryExpectationMax:
                user.profile?.salaryExpectationMax ?? 2000000,
              workMode: user.profile?.workMode ?? "both",
              preferredLocations: user.profile?.preferredLocations ?? [],
              rolesOfInterest: user.profile?.rolesOfInterest ?? [],
              emailDigestEnabled: user.profile?.emailDigestEnabled ?? true,
              resumeUrl: user.profile?.resumeUrl ?? undefined,
              resumeParsedSkills: user.profile?.resumeParsedSkills ?? [],
            }}
          />
        </div>
      </main>
    </div>
  );
}
