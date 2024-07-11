const WINDOW_SIZE = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute

const requestCounts = new Map<string, number[]>();

export function rateLimit(clientId: string): { success: boolean } {
  const now = Date.now();
  const clientRequests = requestCounts.get(clientId) || [];

  // Remove requests outside the current window
  const validRequests = clientRequests.filter(timestamp => now - timestamp < WINDOW_SIZE);

  if (validRequests.length >= MAX_REQUESTS) {
    return { success: false };
  }

  validRequests.push(now);
  requestCounts.set(clientId, validRequests);

  return { success: true };
}