# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ─── React Native core ────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# ─── Native modules used by this app ─────────────────────────────────────────
# react-native-geolocation-service
-keep class com.agontuk.** { *; }
# @voximplant/react-native-foreground-service
-keep class com.voximplant.foregroundservice.** { *; }
# react-native-device-info
-keep class com.learnium.RNDeviceInfo.** { *; }
# react-native-permissions
-keep class com.zoontek.rnpermissions.** { *; }
