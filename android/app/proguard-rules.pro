# Razorpay — required so the SDK survives R8/ProGuard in release builds.
# Without these, checkout crashes only in minified release builds.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** { *; }
-optimizations !method/inlining/*
-keepclasseswithmembers class * {
  public void onPayment*(...);
}

# Flutter / Play Core (referenced by the Flutter engine's deferred components)
-dontwarn com.google.android.play.core.**
