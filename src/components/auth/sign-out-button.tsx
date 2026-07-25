import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton({
  variant = "ghost",
  className,
}: {
  variant?: "ghost" | "outline" | "secondary";
  className?: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <Button type="submit" variant={variant} className={className}>
        <LogOut className="size-4" />
        Log out
      </Button>
    </form>
  );
}
