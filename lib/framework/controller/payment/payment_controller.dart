import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:upi_india/upi_india.dart';

import '../../../ui/utils/app_constants/upi_config.dart';

final paymentProvider = ChangeNotifierProvider((ref) => PaymentController());

class PaymentController extends ChangeNotifier {
  final UpiIndia _upiIndia = UpiIndia();
  List<UpiApp>? apps;
  UpiResponse? lastResponse;

  Future<void> fetchAvailableApps() async {
    try {
      apps = await _upiIndia.getAllUpiApps(mandatoryTransactionId: false);
      notifyListeners();
    } catch (e) {
      apps = [];
      notifyListeners();
    }
  }

  Future<UpiResponse> initiateTransaction(UpiApp app, double amount) async {
    if (!UpiConfig.isConfigured) {
      throw StateError(
        'UPI is not configured. Supply UPI_RECEIVER_UPI_ID when building the app.',
      );
    }
    if (amount <= 0) {
      throw ArgumentError.value(amount, 'amount', 'must be greater than zero');
    }

    lastResponse = await _upiIndia.startTransaction(
      app: app,
      receiverUpiId: UpiConfig.receiverUpiId,
      receiverName: UpiConfig.receiverName,
      transactionRefId: 'DairyApp-${DateTime.now().millisecondsSinceEpoch}',
      transactionNote: 'Payment for Dairy Products',
      amount: amount,
    );
    notifyListeners();
    return lastResponse!;
  }
}
