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
