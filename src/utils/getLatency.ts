export interface LatencyResult {
  /** True if the ping request responded with an HTTP status < 400 */
  isReachable: boolean;
  /** Latency in milliseconds, or null if the check timed out or failed */
  latencyMs: number | null;
}

/**
 * Pings a URL (normally with a HEAD request) to verify internet reachability and measure round-trip latency.
 * Uses an AbortController to support timeouts.
 * 
 * @param pingUrl The target URL to ping
 * @param timeoutMs Request timeout in milliseconds
 * @returns A promise resolving to LatencyResult
 */
export async function getLatency(pingUrl: string, timeoutMs: number): Promise<LatencyResult> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    // Perform HEAD request to verify connectivity and save bandwidth
    const response = await fetch(pingUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    clearTimeout(timeoutId);

    const isReachable = response.ok || response.status < 400;
    const latencyMs = Date.now() - startTime;
    return { isReachable, latencyMs };
  } catch (error) {
    // If HEAD fails, we could try GET, but usually standard endpoints support HEAD or GET.
    // If it fails due to network/timeout, we are offline.
    return { isReachable: false, latencyMs: null };
  }
}
