// Unicode-aware word boundaries: JS `\b` only knows ASCII letters, so words
// ending in Slovak diacritics (zaplatiť, hotovosť…) never matched before.
const START = String.raw`(?<![\p{L}\p{N}_])`; // not preceded by a letter/digit
const END = String.raw`(?![\p{L}\p{N}_])`; // not followed by a letter/digit

const word = (...alternatives: string[]) =>
  new RegExp(`${START}(?:${alternatives.join("|")})${END}`, "iu");

const forbiddenPatterns = [
  // Payment related (Slovak + English)
  word("platba", "platby", "platbu"),
  word("zaplatiť", "vyplatiť", "doplatiť"),
  word("PayPal", "Revolut", "Skrill", "Venmo", "Stripe"),
  word(String.raw`bank\p{L}*`, "IBAN"),
  word("crypto", "Bitcoin", "kryptomena"),
  word("hotovosť", "cash", "peniaze"),

  // Contact information (links allowed — only phone & email blocked)
  /[\w\.-]+@[\w\.-]+\.\w+/i, // emails
  /(\+421|0)\d{8,9}/, // Slovak phone numbers
];

export const hasForbiddenContent = (text: string): boolean => {
  if (!text) return false;
  return forbiddenPatterns.some((pattern) => pattern.test(text));
};
