

const forbiddenPatterns = [
  // Payment related (Slovak + English)
  /\bplatba\b|\bplatby\b|\bplatbu\b/i,
  /\bzaplatiť\b|\bvyplatiť\b|\bdoplatiť\b/i,
  /\bPayPal\b|\bRevolut\b|\bSkrill\b|\bVenmo\b|\bStripe\b/i,
  /\bbank[a-zA-Z]*\b|\bIBAN\b/i,
  /\bcrypto\b|\bBitcoin\b|\bkryptomena\b/i,
  /\bhotovosť\b|\bcash\b|\bpeniaze\b/i,

  // Contact information (links allowed — only phone & email blocked)
  /[\w\.-]+@[\w\.-]+\.\w+/i, // emails
  /(\+421|0)\d{8,9}/, // Slovak phone numbers
];

export const hasForbiddenContent = (text: string): boolean => {
  return forbiddenPatterns.some((pattern) => pattern.test(text));
};