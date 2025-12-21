import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getDatabase } from './lib/database/connection';
import { User } from './types/lead';
import { verifyToken, decryptSecret, validateBackupCode } from './lib/security/totp-manager';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "TOTP", type: "text" },
        backupCode: { label: "Backup Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = getDatabase();
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(credentials.email as string) as any;

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // Check if 2FA is enabled for this user
        if (user.two_factor_enabled) {
          const totp = credentials.totp as string | undefined;
          const backupCode = credentials.backupCode as string | undefined;

          // User has 2FA enabled but didn't provide TOTP or backup code
          if (!totp && !backupCode) {
            return null;
          }

          // Decrypt the user's TOTP secret
          const secret = decryptSecret(user.two_factor_secret);

          // Verify TOTP if provided
          if (totp) {
            const isValid = verifyToken(secret, totp);
            if (!isValid) {
              return null;
            }
          }
          // Verify backup code if provided
          else if (backupCode) {
            const hashedBackupCodes = JSON.parse(user.backup_codes || '[]');
            const codeIndex = await validateBackupCode(hashedBackupCodes, backupCode);

            if (codeIndex === -1) {
              return null;
            }

            // Remove the used backup code
            hashedBackupCodes.splice(codeIndex, 1);
            db.prepare('UPDATE users SET backup_codes = ? WHERE id = ?')
              .run(JSON.stringify(hashedBackupCodes), user.id);
          }
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
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours to prevent session fixation
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true, // Prevents JavaScript access to cookies
        sameSite: 'lax', // CSRF protection
        path: '/',
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      },
    },
  },
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
