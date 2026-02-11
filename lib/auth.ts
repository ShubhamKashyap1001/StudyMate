import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectToDatabase();
        const user = await User.findOne({ email: credentials.email }).lean();
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, (user as any).password);
        if (!valid) return null;

        // ✅ RETURN USER ID
        return {
          id: (user as any)._id.toString(),
          name: (user as any).name,
          email: (user as any).email,
          image: (user as any).image,
        } as any;
      },
    }),

    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),

    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
          }),
        ]
      : []),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user, account }: { token: any; user?: any; account?: any }) {
      // ✅ Save user ID for credentials login
      if (user) {
        token.id = (user as any).id;
      }

      // ✅ ADD THIS FOR GOOGLE / GITHUB LOGIN
      if (account?.provider && user?.email) {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
        }
      }

      return token;
    },

    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.id as string; // ✅ Ensure ID always exists
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      // For OAuth, ensure a user exists in our database
      if (account && (account.type === "oauth" || account.provider === "google" || account.provider === "github")) {
        try {
          await connectToDatabase();
          const email = user.email;
          if (!email) return false;

          const existing = await User.findOne({ email });

          if (!existing) {
            await User.create({
              name: user.name || "",
              email,
              password: await bcrypt.hash(Math.random().toString(36), 10),
              image: (user as any).image,
            });
          }
        } catch (e) {
          return false;
        }
      }
      return true;
    },
  },

  debug: process.env.NODE_ENV === "development",
};
