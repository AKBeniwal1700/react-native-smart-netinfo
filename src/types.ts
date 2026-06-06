export type ConnectionQuality = 'poor' | 'good' | 'excellent';
export type NetworkType = 'wifi' | 'cellular' | 'none' | 'unknown';

export interface NetworkState {
  /** True if the network check succeeded, false if it failed or timed out */
  isConnected: boolean | null;
  /** True if internet reachability check succeeded */
  isInternetReachable: boolean | null;
  /** The type of network connection */
  type: NetworkType;
  /** Round-trip ping latency in milliseconds */
  latencyMs: number | null;
  /** Connection quality based on latency ('poor' | 'good' | 'excellent') */
  connectionQuality: ConnectionQuality | null;
  /** Estimated internet download speed in Mbps (automatically measured when online) */
  internetSpeed: number | null;
  /** True if a speed test is currently running */
  isTestingSpeed: boolean;
}

export interface SmartNetInfoConfig {
  /** The interval in milliseconds to poll the connection (defaults to 10000ms, set to 0 to disable polling) */
  pingIntervalMs?: number;
  /** The fetch timeout in milliseconds (defaults to 5000ms) */
  timeoutMs?: number;
  /** File size of the speed test URL in bytes (defaults to 90000 bytes for jQuery) */
  speedTestFileSizeInBytes?: number;
  /** If true, disables the automatic speed test on mount/online transitions (defaults to false) */
  disableAutoSpeedTest?: boolean;
}

export type NetworkStateListener = (state: NetworkState) => void;
