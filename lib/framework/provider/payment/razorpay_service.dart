/// Razorpay checkout: the Android / iOS sheet on phones, Razorpay's own web checkout in the browser.
library;

export 'razorpay_types.dart';
export 'razorpay_checkout_mobile.dart' if (dart.library.js_interop) 'razorpay_checkout_web.dart';
