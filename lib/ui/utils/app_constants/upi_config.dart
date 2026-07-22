/// UPI payee details supplied at build time.
///
/// Do not put a private payment-gateway key in the mobile app. A UPI intent
/// only needs the public VPA and payee name; verify the completed payment on
/// the server before fulfilling an order.
class UpiConfig {
  const UpiConfig._();

  static const receiverUpiId = String.fromEnvironment('UPI_RECEIVER_UPI_ID');
  static const receiverName = String.fromEnvironment(
    'UPI_RECEIVER_NAME',
    defaultValue: 'Dairy App',
  );

  static bool get isConfigured => _upiIdPattern.hasMatch(receiverUpiId);

  static final RegExp _upiIdPattern = RegExp(r'^[A-Za-z0-9._-]{2,256}@[A-Za-z]{2,64}$');
}
