

const forbiddenPatterns = [
  // Payment related (Slovak + English)
  /\bplatba\b|\bplatby\b|\bplatbu\b/i,
  /\bzaplatiť\b|\bvyplatiť\b|\bdoplatiť\b/i,
  /\bPayPal\b|\bRevolut\b|\bSkrill\b|\bVenmo\b|\bStripe\b/i,
  /\bbank[a-zA-Z]*\b|\bIBAN\b/i,
  /\bcrypto\b|\bBitcoin\b|\bkryptomena\b/i,
  /\bhotovosť\b|\bcash\b|\bpeniaze\b/i,

  // Contact information
  /[\w\.-]+@[\w\.-]+\.\w+/i, // emails
  /(\+421|0)\d{8,9}/, // Slovak phone numbers
  /@[a-zA-Z0-9_]+/, // socials handle

  // URLs
  /(https?:\/\/[^\s]+)/i
];

export const hasForbiddenContent = (text: string): boolean => {
  return forbiddenPatterns.some((pattern) => pattern.test(text));
};