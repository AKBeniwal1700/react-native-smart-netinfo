# 🚀 @akbeniwal/react-native-smart-netinfo

A completely **Hybrid**, intelligent, and robust network monitoring library for React Native. It tracks internet reachability, network types (Wi-Fi/Cellular), measures real latency (Ping), and can perform bandwidth speed tests.

By leveraging **Native iOS/Android OS Events** combined with a **JavaScript Polling Fallback**, it guarantees **Zero Battery Drain** while offline, while maintaining bulletproof real-time connection status when online.

---

## ✨ Features

- 🔋 **Zero Battery Drain (Offline):** When the OS reports the device as offline, the JS polling stops completely, saving battery.
- 📡 **Network Type Detection:** Identifies whether the user is on **`wifi`**, **`cellular`**, or **`none`**.
- 🌐 **Bulletproof Online Check:** Even if the OS says "Connected", the library pings a reliable server in the background to verify _actual_ internet reachability.
- ⚡ **Real-time Latency (Ping):** Accurately tracks connection speed in milliseconds.
- 📶 **Connection Quality:** Automatically classifies the connection as `'poor' | 'good' | 'excellent'`.
- 🚀 **Manual/Auto Speed Testing:** Estimate actual download throughput (Mbps) by downloading a configurable asset.
- 📱 **Hybrid Architecture:** Built natively using `NWPathMonitor` (iOS) and `ConnectivityManager` (Android), seamlessly bridged to JavaScript via TurboModules/Codegen.

---

## 📦 Installation

```bash
# Using npm
npm install @akbeniwal/react-native-smart-netinfo

# Using yarn
yarn add @akbeniwal/react-native-smart-netinfo
```

### iOS Setup

This package uses advanced Native Codegen. You **must** run CocoaPods:

```bash
cd ios
pod install
cd ..
```

_(Android is auto-linked, no extra steps required)._

---

## 💻 Usage

### 1. Basic Setup & Event Subscription

You can subscribe to network state changes anywhere in your code. The most common place is your root `App.tsx` or a global state manager.

```typescript
import {
  SmartNetInfo,
  NetworkState,
} from "@akbeniwal/react-native-smart-netinfo";

// 1. (Optional) Configure default intervals
SmartNetInfo.configure({
  pingIntervalMs: 10000, // Check internet every 10 seconds (Recommended)
  timeoutMs: 5000, // Max time to wait for a ping response
  speedTestFileSizeInBytes: 90000,
  disableAutoSpeedTest: true, // Set to true to prevent random data usage
});

// 2. Subscribe to live changes
const unsubscribe = SmartNetInfo.addEventListener((state: NetworkState) => {
  console.log("Connected to Router/Tower?", state.isConnected);
  console.log("Actual Internet Reachable?", state.isInternetReachable);
  console.log("Network Type:", state.type); // 'wifi' | 'cellular' | 'none'
  console.log("Latency (ms):", state.latencyMs);
  console.log("Quality:", state.connectionQuality); // 'excellent' | 'good' | 'poor'
});

// Remember to unsubscribe when your component unmounts
// unsubscribe();
```

---

### 2. Manual Network Verification & Speed Tests

If you want to manually force an immediate connectivity check (for example, right before a user clicks "Submit Payment"), you can use `fetch()`.

```tsx
import React, from 'react';
import { View, Button, Alert } from 'react-native';
import { SmartNetInfo } from '@akbeniwal/react-native-smart-netinfo';

export default function CheckoutScreen() {

  const handlePayment = async () => {
    // Force an immediate check before critical operations
    const state = await SmartNetInfo.fetch();

    if (!state.isInternetReachable) {
      Alert.alert('Error', 'No active internet connection. Please try again.');
      return;
    }

    if (state.type === 'cellular' && state.connectionQuality === 'poor') {
      Alert.alert('Warning', 'Your cellular connection is very poor. Payment might fail.');
    }

    // Process payment...
  };

  const testSpeed = async () => {
    // Only run this manually when the user clicks a button!
    const mbps = await SmartNetInfo.runSpeedTest();
    Alert.alert('Download Speed', `Your speed is approx ${mbps} Mbps`);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Pay Now" onPress={handlePayment} />
      <Button title="Run Speed Test" onPress={testSpeed} />
    </View>
  );
}
```

---

## 📖 API Reference

### `SmartNetInfo.configure(config: Partial<SmartNetInfoConfig>): void`

Customizes default settings. Calling this while monitoring is active will seamlessly restart the polling loop with the new configurations.

### `SmartNetInfo.fetch(): Promise<NetworkState>`

Forces an immediate background network check and returns a Promise with the latest accurate `NetworkState`.

### `SmartNetInfo.addEventListener(listener: NetworkStateListener): () => void`

Subscribes a callback to receive real-time network changes. Calling this automatically activates the native OS listeners and JS background loop. Returns an `unsubscribe` function.

### `SmartNetInfo.runSpeedTest(): Promise<number | null>`

Initiates a manual speed test. It updates the state's `internetSpeed` and `isTestingSpeed` flags in real-time, and resolves with the final Mbps value.

---

## ⚠️ Critical Safety & Usage Warnings

Please read these warnings carefully before integrating the package into your production app.

> [!CAUTION]
> **Avoid Aggressive Polling:**
> By default, the `pingIntervalMs` is set to `10000` (10 seconds). Do **NOT** set this to less than 5 seconds. Pinging too aggressively (e.g., every 1 second) will cause massive battery drain, thermal throttling, and may get your app rate-limited by the DNS/Ping server.

> [!WARNING]
> **Beware of Data Consumption:**
> The `runSpeedTest()` function physically downloads a file (default 90KB) to calculate Mbps. **NEVER** run this inside a fast `useEffect` loop or on every screen load. It will rapidly consume the user's mobile data quota.

> [!IMPORTANT]
> **Native Rebuilds are Mandatory:**
> Because this package relies on Native C++ (iOS) and Kotlin (Android) code, simply reloading Metro (pressing `r`) is **NOT** enough after installation or updates.
> You **MUST** run `pod install` in the `ios` directory, and perform a completely **Clean Build** via Xcode or Android Studio. If you don't rebuild natively, the app will crash or return `type: "unknown"`.

---

## 🏷️ TypeScript Types

```typescript
export type NetworkType = "wifi" | "cellular" | "none" | "unknown";
export type ConnectionQuality = "poor" | "good" | "excellent";

export interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: NetworkType;
  latencyMs: number | null;
  connectionQuality: ConnectionQuality | null;
  internetSpeed: number | null;
  isTestingSpeed: boolean;
}

export interface SmartNetInfoConfig {
  pingIntervalMs?: number;
  timeoutMs?: number;
  speedTestFileSizeInBytes?: number;
  disableAutoSpeedTest?: boolean;
}
```

---

## 📜 License

MIT © akbeniwal

---

## 👨‍💻 Author

**Abhishek Beniwal**

- NPM: [@akbeniwal](https://www.npmjs.com/~akbeniwal)
