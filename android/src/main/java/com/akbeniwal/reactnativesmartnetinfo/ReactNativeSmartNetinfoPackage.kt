package com.akbeniwal.reactnativesmartnetinfo

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.HashMap

class ReactNativeSmartNetinfoPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == ReactNativeSmartNetinfoModule.NAME) {
      ReactNativeSmartNetinfoModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
    mapOf(
      ReactNativeSmartNetinfoModule.NAME to ReactModuleInfo(
        name = ReactNativeSmartNetinfoModule.NAME,
        className = ReactNativeSmartNetinfoModule.NAME,
        canOverrideExistingModule = false,
        needsEagerInit = false,
        hasConstants = false,
        isCxxModule = false,
        isTurboModule = true
      )
    )
  }
}
