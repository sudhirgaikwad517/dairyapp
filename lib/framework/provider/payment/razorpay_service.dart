import 'dart:async';

import 'package:dairy_app/framework/repository/payment/payment_repository.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

/// What Razorpay hands back after a successful payment — exactly the three
/// values the backend needs to verify the signature.
class RazorpaySuccess {
  final String orderId;
  final String paymentId;
  final String signature;

  RazorpaySuccess({
    required this.orderId,
    required this.paymentId,
    required this.signature,
  });
}

class RazorpayFailure implements Exception {
  final String message;
  final bool cancelledByUser;

  RazorpayFailure(this.message, {this.cancelledByUser = false});

  @override
  String toString() => message;
}

/// Thin wrapper that turns Razorpay's callback API into a single awaitable call.
class RazorpayCheckout {
  final Razorpay _razorpay = Razorpay();
  Completer<RazorpaySuccess>? _completer;

  RazorpayCheckout() {
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _onSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _onError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _onExternalWallet);
  }

  void _onSuccess(PaymentSuccessResponse response) {
    final completer = _completer;
    if (completer == null || completer.isCompleted) return;

    if (response.orderId == null || response.paymentId == null || response.signature == null) {
      completer.completeError(RazorpayFailure('Payment could not be confirmed'));
      return;
    }

    completer.complete(RazorpaySuccess(
      orderId: response.orderId!,
      paymentId: response.paymentId!,
      signature: response.signature!,
    ));
  }

  void _onError(PaymentFailureResponse response) {
    final completer = _completer;
    if (completer == null || completer.isCompleted) return;

    final cancelled = response.code == Razorpay.PAYMENT_CANCELLED;
    completer.completeError(
      RazorpayFailure(
        cancelled ? 'Payment cancelled' : (response.message ?? 'Payment failed'),
        cancelledByUser: cancelled,
      ),
    );
  }

  void _onExternalWallet(ExternalWalletResponse response) {
    final completer = _completer;
    if (completer == null || completer.isCompleted) return;
    completer.completeError(
      RazorpayFailure('Complete the payment in ${response.walletName ?? 'your wallet app'} and try again'),
    );
  }

  /// Opens the Razorpay sheet and resolves once the payment succeeds,
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

    _razorpay.open({
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
    });

    return completer.future;
  }

  void dispose() {
    _razorpay.clear();
  }
}
