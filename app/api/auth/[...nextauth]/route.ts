import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth route handlers for App Router
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
