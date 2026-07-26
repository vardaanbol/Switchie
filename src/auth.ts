import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/models/User";
import { isProfileComplete } from "@/lib/profile";
import {
  assertCanCreateUser,
  getPhase1PublicCap,
} from "@/lib/beta-seats";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      profileComplete: boolean;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    googleId?: string;
    userId?: string;
    profileComplete?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !account.providerAccountId) {
        console.warn("[auth] AccessDenied: missing google account id");
        return false;
      }
      if (!user.email) {
        console.warn("[auth] AccessDenied: Google did not return an email");
        return false;
      }

      const name = user.name?.trim() || user.email.split("@")[0] || "User";
      const googleId = account.providerAccountId;

      try {
        await connectDB();

        const seatGate = await assertCanCreateUser(googleId);
        if (seatGate === "no_seats") {
          console.warn("[auth] Phase-1 public seats full — blocked new signup");
          return "/?error=no_seats";
        }

        const dbUser = await User.findOneAndUpdate(
          { googleId },
          {
            $set: {
              email: user.email,
              name,
              image: user.image ?? undefined,
            },
            $setOnInsert: {
              googleId,
              profile: {
                preferredLocations: [],
                rolesOfInterest: [],
                resumeParsedSkills: [],
                emailDigestEnabled: true,
                updatedAt: new Date(),
              },
            },
          },
          { upsert: true, new: true }
        );

        // Best-effort race guard: two first-time OAuths at the last seat.
        if (seatGate === "ok_new" && dbUser) {
          const used = await User.countDocuments();
          const publicCap = getPhase1PublicCap();
          if (used > publicCap) {
            await User.deleteOne({ _id: dbUser._id, googleId });
            console.warn(
              "[auth] Phase-1 overshoot after race — rolled back new user"
            );
            return "/?error=no_seats";
          }
        }
      } catch (err) {
        // Surface as AccessDenied otherwise — log the real cause for Vercel logs.
        console.error("[auth] signIn DB failure", err);
        return false;
      }

      return true;
    },

    async jwt({ token, account, trigger, session }) {
      if (account?.providerAccountId) {
        token.googleId = account.providerAccountId;
      }

      // Client can pass profileComplete via session.update({ profileComplete })
      if (trigger === "update" && session && typeof session === "object") {
        const incoming = session as { profileComplete?: boolean };
        if (typeof incoming.profileComplete === "boolean") {
          token.profileComplete = incoming.profileComplete;
        }
      }

      const shouldRefresh =
        Boolean(token.googleId) &&
        (!token.userId || trigger === "update" || trigger === "signIn");

      if (shouldRefresh && token.googleId) {
        await connectDB();
        const dbUser = await User.findOne({ googleId: token.googleId }).lean();
        if (dbUser) {
          token.userId = dbUser._id.toString();
          // Prefer DB truth on refresh; fall back to any client-provided flag
          token.profileComplete =
            isProfileComplete(dbUser.profile) ||
            Boolean(token.profileComplete);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? "";
        session.user.profileComplete = Boolean(token.profileComplete);
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
});
