import 'dart:async';
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'package:dairy_app/framework/repository/payment/payment_repository.dart';

import 'razorpay_types.dart';

/// Razorpay's checkout.js (loaded in web/index.html).
@JS('Razorpay')
extension type _Razorpay._(JSObject _) implements JSObject {
  external _Razorpay(JSObject options);
  external void open();
  external void on(String event, JSFunction handler);
}

/// The same awaitable checkout as on the phone, using Razorpay's web checkout in the browser.
class RazorpayCheckout {
  Completer<RazorpaySuccess>? _completer;

  void _fail(RazorpayFailure failure) {
    final completer = _completer;
    if (completer == null || completer.isCompleted) return;
    completer.completeError(failure);
  }

  /// Opens the Razorpay checkout and resolves once the payment succeeds,
  /// or throws [RazorpayFailure] if it fails / is cancelled.
  Future<RazorpaySuccess> open({
    required RazorpayOrderModel order,
    required String customerName,
    required String phone,
    String? email,
    String description = 'Shrishti Dairy Farm',
  }) {
    final completer = Completer<RazorpaySuccess>();
    _completer = completer;

    if (!globalContext.has('Razorpay')) {
      _fail(RazorpayFailure('Payment could not start. Check your internet and try again.'));
      return completer.future;
    }

    final options = {
      'key': order.keyId,
      'order_id': order.orderId,
      'amount': order.amountPaise,
      'currency': order.currency,
      'name': 'Shrishti Dairy Farm',
      'description': description,
      'timeout': 300,
      'prefill': {
        'contact': phone,
        if (email != null && email.isNotEmpty) 'email': email,
        'name': customerName,
      },
      'theme': {'color': '#6156F1'},
      'modal': <String, Object?>{},
    }.jsify() as JSObject;

    options.setProperty('handler'.toJS, ((JSObject response) {
      if (completer.isCompleted) return;
      final orderId = (response.getProperty('razorpay_order_id'.toJS) as JSString?)?.toDart;
      final paymentId = (response.getProperty('razorpay_payment_id'.toJS) as JSString?)?.toDart;
      final signature = (response.getProperty('razorpay_signature'.toJS) as JSString?)?.toDart;
      if (orderId == null || paymentId == null || signature == null) {
        completer.completeError(RazorpayFailure('Payment could not be confirmed'));
        return;
      }
      completer.complete(RazorpaySuccess(orderId: orderId, paymentId: paymentId, signature: signature));
    }).toJS);
    (options.getProperty('modal'.toJS) as JSObject).setProperty('ondismiss'.toJS, (() {
      _fail(RazorpayFailure('Payment cancelled', cancelledByUser: true));
    }).toJS);

    final checkout = _Razorpay(options);
    checkout.on('payment.failed', ((JSObject response) {
      final error = response.getProperty('error'.toJS) as JSObject?;
      final message = (error?.getProperty('description'.toJS) as JSString?)?.toDart;
      _fail(RazorpayFailure(message ?? 'Payment failed'));
    }).toJS);
    checkout.open();

    return completer.future;
  }

  void dispose() {}
}
