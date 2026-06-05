# react-native-smart-netinfo

A lightweight, zero-dependency, smart network connection monitor for React Native and React Native Web. It keeps track of device connectivity, measures latency (ping), rates the connection quality, and automatically/manually estimates download speeds in Mbps.

## Features

- 🌐 **Online/Offline Detection**: Standard and reliable reachability check.
- ⚡ **Latency Measuring (Ping)**: Periodic background pinging to verify real internet access.
- 📶 **Connection Quality**: Automatically rates network latency as `'poor' | 'good' | 'excellent'`.
- 🚀 **Speed Test**: Estimate download throughput speed (in Mbps) by downloading a configurable asset.
- 🔄 **Auto Speed Test**: Automatically run speed test when transitioning from offline to online.
- 📱 **Foreground Check**: Recheck connectivity instantly when the app transitions back to the foreground.
- 🕸️ **Web Compatibility**: Smooth fallback and support for browser online/offline events (perfect for React Native Web).
- 🧩 **Zero Native Dependencies**: No need for linking or dealing with native pods. Uses standard `fetch` and `AppState`.

---

## Installation

```bash
# Using npm
npm install react-native-smart-netinfo

# Using yarn
yarn add react-native-smart-netinfo
```

---

## Usage

### 1. Basic Event Subscription (TypeScript/JavaScript)

Subscribe to network state updates anywhere in your app:

```typescript
import { SmartNetInfo, NetworkState } from 'react-native-smart-netinfo';

// (Optional) Configure settings
SmartNetInfo.configure({
  pingIntervalMs: 30000, // Ping check every 30 seconds
  timeoutMs: 5000,
  speedTestFileSizeInBytes: 90000,
  disableAutoSpeedTest: false, // Automatically run speed test on online transition
});

// Subscribe to state updates
const unsubscribe = SmartNetInfo.addEventListener((state: NetworkState) => {
  console.log('Is connected:', state.isConnected);
  console.log('Is internet reachable:', state.isInternetReachable);
  console.log('Latency (ms):', state.latencyMs);
  console.log('Connection Quality:', state.connectionQuality); // 'excellent' | 'good' | 'poor'
  console.log('Internet Speed (Mbps):', state.internetSpeed);
  console.log('Is Speed Testing:', state.isTestingSpeed);
});

// Unsubscribe later to clean up
unsubscribe();
```

---

### 2. React Hook Integration

Create a custom hook to use `SmartNetInfo` easily in your React Native components:

```tsx
import { useEffect, useState } from 'react';
import { SmartNetInfo, NetworkState } from 'react-native-smart-netinfo';

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkState>({
    isConnected: null,
    isInternetReachable: null,
    latencyMs: null,
    connectionQuality: null,
    internetSpeed: null,
    isTestingSpeed: false,
  });

  useEffect(() => {
    const unsubscribe = SmartNetInfo.addEventListener((nextState) => {
      setStatus(nextState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...status,
    runSpeedTest: () => SmartNetInfo.runSpeedTest(),
  };
}
```

Then use it inside any component:

```tsx
import React from 'react';
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { useNetworkStatus } from './useNetworkStatus';

export default function ConnectionScreen() {
  const {
    isConnected,
    isInternetReachable,
    latencyMs,
    connectionQuality,
    internetSpeed,
    isTestingSpeed,
    runSpeedTest
  } = useNetworkStatus();

  return (
    <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
        Network: {isConnected ? 'Connected' : 'Disconnected'}
      </Text>
      
      <Text>Internet Reachable: {isInternetReachable ? 'Yes' : 'No'}</Text>
      <Text>Latency: {latencyMs ? `${latencyMs}ms` : 'Calculating...'}</Text>
      <Text>Quality: {connectionQuality ? connectionQuality.toUpperCase() : 'Calculating...'}</Text>
      <Text>Speed: {internetSpeed ? `${internetSpeed} Mbps` : 'No speed test run yet'}</Text>
      
      {isTestingSpeed ? (
        <ActivityIndicator size="small" color="#0000ff" />
      ) : (
        <Button title="Test Speed Now" onPress={runSpeedTest} disabled={!isInternetReachable} />
      )}
    </View>
  );
}
```

---

## API Reference

### `SmartNetInfo.configure(config: Partial<SmartNetInfoConfig>): void`
Customizes settings. If the monitor is currently running, configuring settings will restart the monitoring session using the updated configurations.

### `SmartNetInfo.fetch(): Promise<NetworkState>`
Forces an immediate network latency check and returns the latest `NetworkState`.

### `SmartNetInfo.addEventListener(listener: NetworkStateListener): () => void`
Subscribes a listener to network changes. Returns an `unsubscribe` function. If monitoring is not active, calling this will automatically start monitoring.

### `SmartNetInfo.removeEventListener(listener: NetworkStateListener): void`
Manually unsubscribes a listener. If all listeners are removed, it automatically stops background monitoring, cleaning up timers and system hooks.

### `SmartNetInfo.runSpeedTest(): Promise<number | null>`
Manually initiates a speed test, downloads the speed test asset, updates the state (`internetSpeed` and `isTestingSpeed`), and returns the estimated speed in Mbps.

### `SmartNetInfo.startMonitoring(): void`
Manually starts monitoring. You normally don't need to call this manually unless you are calling `fetch()` without subscriptions and want background polling active.

### `SmartNetInfo.stopMonitoring(): void`
Manually stops monitoring, cleaning up timers, AppState listeners, and window listeners.

---

## Types

```typescript
export type ConnectionQuality = 'poor' | 'good' | 'excellent';

export interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  latencyMs: number | null;
  connectionQuality: ConnectionQuality | null;
  internetSpeed: number | null;
  isTestingSpeed: boolean;
}

export interface SmartNetInfoConfig {
  pingIntervalMs?: number; // Background checking frequency in ms (default: 30000)
  timeoutMs?: number; // Request timeout in ms (default: 5000)
  speedTestFileSizeInBytes?: number; // Expected file size (default: 90000)
  disableAutoSpeedTest?: boolean; // If true, only speed test when runSpeedTest() is called (default: false)
}
```

## License

MIT © akbeniwal
