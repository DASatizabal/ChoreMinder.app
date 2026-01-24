import { MongoDBAdapter } from "@auth/mongodb-adapter";
import type { NextAuthOptions } from "next-auth";
import { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";

import config from "@/config";
import { User } from "@/models";

import dbConnect from "@/lib/dbConnect";

import { isEmailBlacklisted } from "./email-blacklist";
import clientPromise from "./mongo";

// Extend the built-in types for our application
declare module "next-auth" {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: clientPromise ? (MongoDBAdapter(clientPromise) as Adapter) : undefined,
  session: {
    strategy: "jwt",
  },
  providers: [
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
      async profile(profile) {
        return {
          id: profile.sub,
          name: profile.given_name ? profile.given_name : profile.name,
          email: profile.email,
          image: profile.picture,
          role: "user",
        };
      },
    }),

    // Email Magic Link Provider
    ...(clientPromise
      ? [
          EmailProvider({
            server: {
              host: "smtp.resend.com",
              port: 465,
              auth: {
                user: "resend",
                pass: process.env.RESEND_API_KEY || "",
              },
            },
            from: config.resend.fromNoReply,
          }),
        ]
      : []),

    // Credentials Provider (email/password)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password");
        }

        await dbConnect();
        const user = await User.findOne({ email: credentials.email })
          .select("+hashedPassword")
          .lean()
          .exec();

        if (!user || !("hashedPassword" in user) || !user.hashedPassword) {
          throw new Error("Invalid email or password");
        }

        // Import bcrypt dynamically to avoid issues with edge runtime
        const bcrypt = await import("bcryptjs");
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword,
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role || "user",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Check if email is blacklisted
      if (user.email && isEmailBlacklisted(user.email)) {
        console.log(
          `Blocked sign-in attempt for blacklisted email: ${user.email}`,
        );
        return false;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  theme: {
    brandColor: config.colors.main,
  },
  debug: process.env.NODE_ENV === "development",
};

export default authOptions;
