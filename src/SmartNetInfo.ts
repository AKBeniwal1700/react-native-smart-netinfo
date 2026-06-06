import { AppState, AppStateStatus, NativeEventEmitter } from 'react-native';
import NativeReactNativeSmartNetinfo from './NativeReactNativeSmartNetinfo';
import { NetworkState, SmartNetInfoConfig, NetworkStateListener } from './types';
import { getConnectionQuality } from './utils/getConnectionQuality';
import { getLatency } from './utils/getLatency';
import { runSpeedTest as executeSpeedTest } from './utils/runSpeedTest';

const PING_URLS = [
  'https://clients3.google.com/generate_204',
  'https://www.apple.com/library/test/success.html',
  'https://cloudflare-dns.com/dns-query',
  'https://google.com/generate_204'
];

const SPEED_TEST_URL = 'https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js';

class SmartNetInfoManager {
  private pingUrlIndex = 0;
  private config: Required<SmartNetInfoConfig> = {
    pingIntervalMs: 10000,
    timeoutMs: 5000,
    speedTestFileSizeInBytes: 90000,
    disableAutoSpeedTest: false,
  };

  private state: NetworkState = {
    isConnected: null,
    isInternetReachable: null,
    type: 'unknown',
    latencyMs: null,
    connectionQuality: null,
    internetSpeed: null,
    isTestingSpeed: false,
  };

  private listeners = new Set<NetworkStateListener>();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private nativeEventEmitter: NativeEventEmitter | null = null;
  private nativeEventSubscription: { remove: () => void } | null = null;
  private isMonitoring = false;
  private isChecking = false;

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
    
    const timeout = Math.max(this.config.timeoutMs * 3, 15000);
    const speed = await executeSpeedTest(SPEED_TEST_URL, this.config.speedTestFileSizeInBytes, timeout);
    
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

    // Set up Native Event Emitter if available
    try {
      if (NativeReactNativeSmartNetinfo) {
        this.nativeEventEmitter = new NativeEventEmitter(NativeReactNativeSmartNetinfo as any);
        this.nativeEventSubscription = this.nativeEventEmitter.addListener(
          'NetworkStatusChanged',
          this.handleNativeNetworkChange
        );
      }
    } catch (e) {
      console.warn('SmartNetInfo native module not found, falling back to pure polling');
    }

    // Run initial check immediately and then schedule subsequent checks
    this.checkConnectivity().then(() => {
      // Auto run speed test on initial connect if online
      if (
        this.state.isInternetReachable &&
        this.state.internetSpeed === null &&
        !this.config.disableAutoSpeedTest
      ) {
        this.runSpeedTest();
      }
      this.scheduleNextCheck();
    });

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

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.nativeEventSubscription) {
      this.nativeEventSubscription.remove();
      this.nativeEventSubscription = null;
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

  private handleNativeNetworkChange = (event: { isConnected: boolean, type?: any }) => {
    if (!event.isConnected) {
      this.updateState({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        latencyMs: null,
        connectionQuality: null,
      });
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      this.scheduleNextCheck();
    } else {
      this.updateState({ isConnected: true, type: event.type || 'unknown' });
      this.checkConnectivity().finally(() => {
        this.scheduleNextCheck();
      });
    }
  };

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      this.checkConnectivity().finally(() => {
        this.scheduleNextCheck();
      });
    }
  };

  private handleWebOnline = (): void => {
    this.updateState({ isConnected: true, isInternetReachable: true });
    this.checkConnectivity().finally(() => {
      this.scheduleNextCheck();
    });
  };

  private handleWebOffline = (): void => {
    this.updateState({
      isConnected: false,
      isInternetReachable: false,
      latencyMs: null,
      connectionQuality: null,
    });
  };

  private scheduleNextCheck(): void {
    if (!this.isMonitoring) return;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.config.pingIntervalMs <= 0) return;

    // We always keep polling as a bulletproof fallback, even if native module says offline.
    // If the native module misses an event, polling will catch the recovery.

    // When offline (without native fallback), check more frequently (every 3 seconds) to detect recovery quickly.
    // When online, use the configured pingIntervalMs.
    const isOffline = this.state.isInternetReachable === false;
    const interval = isOffline
      ? Math.min(this.config.pingIntervalMs, 3000)
      : this.config.pingIntervalMs;

    this.timeoutId = setTimeout(async () => {
      await this.checkConnectivity();
      this.scheduleNextCheck();
    }, interval);
  }

  private async checkConnectivity(): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      // Add a buffer to timeout when we are currently offline to allow the radio to wake up
      const isCurrentlyOffline = this.state.isInternetReachable === false;
      const actualTimeout = isCurrentlyOffline
        ? Math.max(this.config.timeoutMs, 4000)
        : this.config.timeoutMs;

      const currentPingUrl = PING_URLS[this.pingUrlIndex];
      // Cycle to the next URL for the next check to avoid DNS caching issues if it fails
      this.pingUrlIndex = (this.pingUrlIndex + 1) % PING_URLS.length;

      const { isReachable, latencyMs } = await getLatency(currentPingUrl, actualTimeout);
      
      const wasInternetReachable = this.state.isInternetReachable;

      let nextIsConnected = this.state.isConnected;
      if (isReachable) {
        nextIsConnected = true;
      } else if (this.nativeEventEmitter && this.state.isConnected !== null) {
        nextIsConnected = this.state.isConnected;
      } else {
        nextIsConnected = false;
      }

      this.updateState({
        isConnected: nextIsConnected,
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
    } catch (error) {
      console.warn('SmartNetInfo failed during checkConnectivity:', error);
    } finally {
      this.isChecking = false;
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
