import bcrypt from "bcryptjs";

const COST = 12;

// Hash of a discarded random value, compared against when an email isn't
// registered so response timing doesn't reveal which emails have accounts.
const PLACEHOLDER_HASH = "$2b$12$JOE09oFN4IhvDvVr2ZW6heMcIPk86I6g.VeFPoyUKgwOp280AUlam";

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string | undefined) {
  return bcrypt.compare(password, hash ?? PLACEHOLDER_HASH);
}
