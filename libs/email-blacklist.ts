// Email blacklist management
// This prevents specific email addresses from creating accounts

const BLACKLISTED_EMAILS: string[] = [
  // Add emails here that should be blocked from registration
  // Example: 'blocked@example.com',
];

// Domains that are blocked (if needed)
const BLACKLISTED_DOMAINS: string[] = [
  // Add domains here if needed, e.g., 'tempmail.com'
];

export function isEmailBlacklisted(email: string): boolean {
  if (!email) return false;

  const normalizedEmail = email.toLowerCase().trim();

  // Check against specific email addresses
  if (BLACKLISTED_EMAILS.includes(normalizedEmail)) {
    return true;
  }

  // Check against domains
  const domain = normalizedEmail.split("@")[1];
  if (domain && BLACKLISTED_DOMAINS.includes(domain)) {
    return true;
  }

  return false;
}

export function getBlacklistReason(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();

  if (BLACKLISTED_EMAILS.includes(normalizedEmail)) {
    return "This email address is not authorized for registration.";
  }

  const domain = normalizedEmail.split("@")[1];
  if (domain && BLACKLISTED_DOMAINS.includes(domain)) {
    return `Email addresses from ${domain} are not allowed.`;
  }

  return "Email address is not authorized.";
}

// For admin use - to add/remove emails from blacklist dynamically
export function addEmailToBlacklist(email: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  if (!BLACKLISTED_EMAILS.includes(normalizedEmail)) {
    BLACKLISTED_EMAILS.push(normalizedEmail);
  }
}

export function removeEmailFromBlacklist(email: string): void {
  const normalizedEmail = email.toLowerCase().trim();
  const index = BLACKLISTED_EMAILS.indexOf(normalizedEmail);
  if (index > -1) {
    BLACKLISTED_EMAILS.splice(index, 1);
  }
}
