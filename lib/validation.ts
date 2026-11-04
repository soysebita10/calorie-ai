const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX_BYTES = 72; // bcrypt ignores anything past 72 bytes
export const CALORIES_MIN = 800;
export const CALORIES_MAX = 10000;

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validateEmail(email: string) {
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateName(name: string) {
  if (name.length < 1 || name.length > 100) {
    return "Enter your name (100 characters at most).";
  }
  return null;
}

export function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  if (Buffer.byteLength(password) > PASSWORD_MAX_BYTES) {
    return `Password must be ${PASSWORD_MAX_BYTES} bytes or fewer.`;
  }
  return null;
}
