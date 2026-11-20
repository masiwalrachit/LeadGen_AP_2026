import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(30, "Username must be 30 characters or fewer.")
  .regex(
    /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/,
    "Use letters, numbers, underscores, or hyphens.",
  );

export function usernameInitial(username: string) {
  return username.charAt(0).toUpperCase();
}

/**
 * Same rule as usernameSchema, written for the HTML `pattern` attribute. Browsers compile it with the
 * regexp "v" flag, where a bare "-" inside [...] is a syntax error and makes the browser ignore the pattern.
 */
export const USERNAME_INPUT_PATTERN = "[A-Za-z0-9](?:[A-Za-z0-9_\\-]*[A-Za-z0-9])?";
