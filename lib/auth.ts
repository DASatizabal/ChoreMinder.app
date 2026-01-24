/**
 * Auth Configuration Re-export
 *
 * This file re-exports the consolidated auth configuration from @/libs/next-auth.
 * All auth providers (Google, Email, Credentials) and callbacks are defined there.
 *
 * For backward compatibility, imports from @/lib/auth will continue to work.
 */

export { authOptions, default } from "@/libs/next-auth";
