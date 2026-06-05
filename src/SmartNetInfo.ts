import { AppState, AppStateStatus } from 'react-native';
import { NetworkState, SmartNetInfoConfig, NetworkStateListener } from './types';
import { getConnectionQuality } from './utils/getConnectionQuality';
import { getLatency } from './utils/getLatency';
import { runSpeedTest as executeSpeedTest } from './utils/runSpeedTest';

const PING_URL = 'https://clients3.google.com/generate_204';
const SPEED_TEST_URL = 'https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js';

class SmartNetInfoManager {
  private config: Required<SmartNetInfoConfig> = {
    pingIntervalMs: 30000,
    timeoutMs: 5000,
    speedTestFileSizeInBytes: 90000,
    disableAutoSpeedTest: false,
  };

  private state: NetworkState = {
    isConnected: null,
    isInternetReachable: null,
    latencyMs: null,
    connectionQuality: null,
    internetSpeed: null,
    isTestingSpeed: false,
  };

  private listeners = new Set<NetworkStateListener>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private isMonitoring = false;

  /**
   * Configure the SmartNetInfo options.
   * If already monitoring, it will restart the monitoring process to apply new intervals.
   */
  public configure(config: Partial<SmartNetInfoConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.isMonitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Fetches the current network state immediately by performing a connectivity check.
   */
  public async fetch(): Promise<NetworkState> {
    await this.checkConnectivity();
    return this.state;
  }

  /**
   * Subscribe to network state changes.
   * Automatically starts monitoring if it was not already running.
   * 
   * @param listener Callback function receiving the updated NetworkState
   * @returns A cleanup function to unsubscribe
   */
  public addEventListener(listener: NetworkStateListener): () => void {
    this.listeners.add(listener);
    
    // Provide the current state immediately to the new listener
    listener(this.state);

    if (!this.isMonitoring) {
      this.startMonitoring();
    }

    return () => this.removeEventListener(listener);
  }

  /**
   * Unsubscribe a listener from network state changes.
   * Automatically stops monitoring if no listeners remain.
   * 
   * @param listener Callback function to unsubscribe
   */
  public removeEventListener(listener: NetworkStateListener): void {
    this.listeners.delete(listener);
    if (this.listeners.size === 0 && this.isMonitoring) {
      this.stopMonitoring();
    }
  }

  /**
   * Triggers an internet speed test manually.
   * 
   * @returns Estimated download speed in Mbps, or null if test fails
   */
  public async runSpeedTest(): Promise<number | null> {
    if (this.state.isTestingSpeed) {
      return this.state.internetSpeed;
    }

    this.updateState({ isTestingSpeed: true });
    
    const speed = await executeSpeedTest(SPEED_TEST_URL, this.config.speedTestFileSizeInBytes);
    
    this.updateState({
      internetSpeed: speed,
      isTestingSpeed: false,
    });

    return speed;
  }

  /**
   * Start monitoring network status (polling, AppState transitions, and browser online/offline events).
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Run initial check immediately
    this.checkConnectivity().then(() => {
      // Auto run speed test on initial connect if online
      if (
        this.state.isInternetReachable &&
        this.state.internetSpeed === null &&
        !this.config.disableAutoSpeedTest
      ) {
        this.runSpeedTest();
      }
    });

    // Set up periodic polling
    if (this.config.pingIntervalMs > 0) {
      this.intervalId = setInterval(() => this.checkConnectivity(), this.config.pingIntervalMs);
    }

    // React Native AppState listener to detect foreground transitions
    try {
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    } catch (error) {
      console.warn('SmartNetInfo failed to register AppState listener:', error);
    }

    // Web browser window event listeners for react-native-web compatibility
    const hasWindowListeners = typeof window !== 'undefined' && typeof window.addEventListener === 'function';
    if (hasWindowListeners) {
      window.addEventListener('online', this.handleWebOnline);
      window.addEventListener('offline', this.handleWebOffline);
    }
  }

  /**
   * Stop monitoring network status and clean up timers and listeners.
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    this.isMonitoring = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.appStateSubscription) {
      if (typeof this.appStateSubscription.remove === 'function') {
        this.appStateSubscription.remove();
      } else {
        // Fallback for older React Native versions
        (AppState as any).removeEventListener?.('change', this.handleAppStateChange);
      }
      this.appStateSubscription = null;
    }

    const hasWindowListeners = typeof window !== 'undefined' && typeof window.removeEventListener === 'function';
    if (hasWindowListeners) {
      window.removeEventListener('online', this.handleWebOnline);
      window.removeEventListener('offline', this.handleWebOffline);
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      this.checkConnectivity();
    }
  };

  private handleWebOnline = (): void => {
    this.updateState({ isConnected: true, isInternetReachable: true });
    this.checkConnectivity();
  };

  private handleWebOffline = (): void => {
    this.updateState({
      isConnected: false,
      isInternetReachable: false,
      latencyMs: null,
      connectionQuality: null,
    });
  };

  private async checkConnectivity(): Promise<void> {
    const { isReachable, latencyMs } = await getLatency(PING_URL, this.config.timeoutMs);
    
    const wasInternetReachable = this.state.isInternetReachable;

    this.updateState({
      isConnected: isReachable,
      isInternetReachable: isReachable,
      latencyMs,
      connectionQuality: getConnectionQuality(latencyMs),
    });

    // If internet just became reachable and we haven't run speed test yet, trigger auto speed test
    if (
      isReachable &&
      wasInternetReachable === false &&
      this.state.internetSpeed === null &&
      !this.config.disableAutoSpeedTest
    ) {
      this.runSpeedTest();
    }
  }

  private updateState(partialState: Partial<NetworkState>): void {
    const nextState = { ...this.state, ...partialState };
    
    // Check if anything actually changed
    const hasChanged = Object.keys(nextState).some(
      (key) => (nextState as any)[key] !== (this.state as any)[key]
    );

    if (hasChanged) {
      this.state = nextState;
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in SmartNetInfo listener:', error);
      }
    });
  }
}

export const SmartNetInfo = new SmartNetInfoManager();
export default SmartNetInfo;
