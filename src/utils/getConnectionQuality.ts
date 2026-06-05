import { ConnectionQuality } from '../types';

/**
 * Categorizes a round-trip connection latency (in milliseconds) into a descriptive rating.
 * 
 * @param latencyMs Latency in milliseconds or null if offline/unknown
 * @returns ConnectionQuality rating or null
 */
export function getConnectionQuality(latencyMs: number | null): ConnectionQuality | null {
  if (latencyMs === null || latencyMs < 0) {
    return null;
  }
  if (latencyMs < 150) {
    return 'excellent';
  }
  if (latencyMs < 400) {
    return 'good';
  }
  return 'poor';
}
