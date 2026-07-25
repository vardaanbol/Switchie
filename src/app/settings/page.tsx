import { auth, signOut } from "@/auth";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/models/User";
import { ProfileForm } from "@/components/profile/profile-form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Update your preferences anytime. Changes apply to the next search.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            Dashboard
          </Button>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button type="submit" variant="ghost" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </div>
      <ProfileForm
        mode="settings"
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
