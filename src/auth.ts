import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/models/User";
import { isProfileComplete } from "@/lib/profile";
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
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !account.providerAccountId) {
        return false;
      }
      if (!user.email || !user.name) {
        return false;
      }

      await connectDB();

      await User.findOneAndUpdate(
        { googleId: account.providerAccountId },
        {
          $set: {
            email: user.email,
            name: user.name,
            image: user.image ?? undefined,
          },
          $setOnInsert: {
            googleId: account.providerAccountId,
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

      return true;
    },

    async jwt({ token, account, trigger }) {
      if (account?.providerAccountId) {
        token.googleId = account.providerAccountId;
      }

      const shouldRefresh =
        Boolean(token.googleId) &&
        (!token.userId || trigger === "update" || trigger === "signIn");

      if (shouldRefresh && token.googleId) {
        await connectDB();
        const dbUser = await User.findOne({ googleId: token.googleId }).lean();
        if (dbUser) {
          token.userId = dbUser._id.toString();
          token.profileComplete = isProfileComplete(dbUser.profile);
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
