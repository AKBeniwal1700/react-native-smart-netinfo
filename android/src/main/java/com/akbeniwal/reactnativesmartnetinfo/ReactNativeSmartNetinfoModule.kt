package com.akbeniwal.reactnativesmartnetinfo

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class ReactNativeSmartNetinfoModule(private val reactContext: ReactApplicationContext) :
  NativeReactNativeSmartNetinfoSpec(reactContext) {

  private var connectivityManager: ConnectivityManager? = null
  private var networkCallback: ConnectivityManager.NetworkCallback? = null
  private var isConnected = false

  init {
    connectivityManager = reactContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    registerNetworkCallback()
  }

  private fun registerNetworkCallback() {
    try {
      networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
          super.onAvailable(network)
          isConnected = true
          val caps = connectivityManager?.getNetworkCapabilities(network)
          var type = "unknown"
          if (caps != null) {
              if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                  type = "wifi"
              } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
                  type = "cellular"
              }
          }
          sendEvent("NetworkStatusChanged", true, type)
        }

        override fun onLost(network: Network) {
          super.onLost(network)
          isConnected = false
          sendEvent("NetworkStatusChanged", false, "none")
        }
      }

      val builder = NetworkRequest.Builder()
        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)

      connectivityManager?.registerNetworkCallback(builder.build(), networkCallback!!)
    } catch (e: Exception) {
      // Fallback or ignore
    }
  }

  private fun sendEvent(eventName: String, isConnected: Boolean, type: String) {
    try {
      val params: WritableMap = Arguments.createMap()
      params.putBoolean("isConnected", isConnected)
      params.putString("type", type)
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
    } catch (e: Exception) {
      // Ignored
    }
  }

  override fun addListener(eventName: String) {
    // Required for RN built-in Event Emitter Calls
  }

  override fun removeListeners(count: Double) {
    // Required for RN built-in Event Emitter Calls
  }

  companion object {
    const val NAME = NativeReactNativeSmartNetinfoSpec.NAME
  }
}
