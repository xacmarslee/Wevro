// Auth utilities for handling unauthorized errors
// From Replit Auth blueprint

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}
