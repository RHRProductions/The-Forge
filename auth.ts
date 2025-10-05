import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getDatabase } from './lib/database/connection';
import { User } from './types/lead';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = getDatabase();
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(credentials.email as string) as User | undefined;

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // Return user without password
        return {
          id: user.id!.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          agent_id: user.agent_id,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.agent_id = (user as any).agent_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).agent_id = token.agent_id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  trustHost: true,
});
