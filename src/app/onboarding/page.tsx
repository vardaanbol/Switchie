import { auth, signOut } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/models/User";
import { ProfileForm } from "@/components/profile/profile-form";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";

function SawbladeMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M32 4l3.2 7.4 7.6-2.6-2.2 7.7 7.1 3.7-5.5 5.7 5.5 5.7-7.1 3.7 2.2 7.7-7.6-2.6L32 60l-3.2-7.4-7.6 2.6 2.2-7.7-7.1-3.7 5.5-5.7-5.5-5.7 7.1-3.7-2.2-7.7 7.6 2.6L32 4z" />
      <circle cx="32" cy="32" r="10" fill="#fffef8" />
      <circle cx="32" cy="32" r="4.5" />
    </svg>
  );
}

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) redirect("/");

  return (
    <div className="comic-paper relative min-h-screen overflow-x-hidden text-black">
      <div className="comic-halftone pointer-events-none absolute inset-0 opacity-[0.3]" />
      <SawbladeMark className="pointer-events-none absolute -right-8 top-24 size-32 text-black/[0.06]" />

      <header className="relative z-20 border-b-[3px] border-black bg-[#fffef8]/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-black tracking-tight"
          >
            <SawbladeMark className="size-5" />
            Y.A.W.N
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border-[2.5px] border-black bg-white px-3 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5"
            >
              <LogOut className="size-3.5" />
              Out
            </button>
          </form>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-2xl px-5 py-9">
        <div className="mb-8 overflow-hidden rounded-lg border-[3px] border-black bg-[#fffef8] p-6 shadow-[6px_6px_0_#000]">
          <div className="mb-2 inline-block -rotate-2 rounded-md border-[3px] border-black bg-[#ff6b6b] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-[2px_2px_0_#000]">
            Step 01
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Tell us what you want
          </h1>
          <p className="mt-3 max-w-md border-l-[3px] border-black pl-4 text-sm font-medium leading-relaxed text-black/65">
            A few preferences so we can match roles to your salary, locations,
            and skills — all in ₹.
          </p>
        </div>

        <div className="rounded-lg border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#000] sm:p-7">
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

      <style>{`
        .comic-paper {
          background-color: #f7f7f2;
          background-image:
            linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px);
          background-size: 22px 22px;
        }
        .comic-halftone {
          background-image: radial-gradient(circle, rgba(0,0,0,0.09) 1px, transparent 1.2px);
          background-size: 10px 10px;
        }
      `}</style>
    </div>
  );
}
