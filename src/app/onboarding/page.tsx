import { auth } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/models/User";
import { ProfileForm } from "@/components/profile/profile-form";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Set up your profile</h1>
        <p className="text-muted-foreground">
          Tell us what you&apos;re looking for so we can find matching roles in INR.
        </p>
      </div>
      <ProfileForm
        mode="onboarding"
        initial={{
          name: user.name,
          salaryExpectationMin: user.profile?.salaryExpectationMin ?? 800000,
          salaryExpectationMax: user.profile?.salaryExpectationMax ?? 2000000,
          workMode: user.profile?.workMode ?? "both",
          preferredLocations: user.profile?.preferredLocations ?? [],
          rolesOfInterest: user.profile?.rolesOfInterest ?? [],
          emailDigestEnabled: user.profile?.emailDigestEnabled ?? true,
          resumeUrl: user.profile?.resumeUrl ?? undefined,
          resumeParsedSkills: user.profile?.resumeParsedSkills ?? [],
        }}
      />
    </div>
  );
}
