import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/provider/payment/razorpay_service.dart';
import 'package:dairy_app/framework/repository/payment/payment_repository.dart';
import 'package:dairy_app/framework/repository/wallet/wallet_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

final walletProvider = ChangeNotifierProvider((ref) => WalletController()..loadWallet());

class WalletController extends ChangeNotifier {
  WalletModel _wallet = WalletModel();
  bool isLoading = false;
  bool isToppingUp = false;
  bool isRequestingCash = false;
  String? error;

  WalletRepository get _repository => getIt<WalletRepository>();
  PaymentRepository get _paymentRepository => getIt<PaymentRepository>();

  bool onlinePaymentAvailable = false;

  double get balance => _wallet.balance;
  double get reservedBalance => _wallet.reservedBalance;
  List<WalletTransactionModel> get transactions => _wallet.transactions;
  WalletLimits get limits => _wallet.limits;

  Future<void> loadWallet() async {
    isLoading = true;
    error = null;
    notifyListeners();

    final wallet = await _repository.getWallet();
    if (wallet != null) {
      _wallet = wallet;
    } else {
      error = 'Unable to load your wallet';
    }

    onlinePaymentAvailable = await _paymentRepository.isOnlinePaymentAvailable();

    isLoading = false;
    notifyListeners();
  }

  /// Pays for a top-up through Razorpay and credits the wallet only after the
  /// backend has verified the payment signature.
  /// Returns null on success, or the error message.
  Future<String?> topUp(double amount, {required String customerName, required String phone, String? email}) async {
    isToppingUp = true;
    error = null;
    notifyListeners();

    String? fail(String message) {
      isToppingUp = false;
      error = message;
      notifyListeners();
      return message;
    }

    final orderResult = await _paymentRepository.createOrderForWalletTopUp(amount);
    if (!orderResult.isSuccess) return fail(orderResult.error ?? 'Unable to start payment');

    final checkout = RazorpayCheckout();
    RazorpaySuccess payment;
    try {
      payment = await checkout.open(
        order: orderResult.data!,
        customerName: customerName,
        phone: phone,
        email: email,
        description: 'Wallet top-up',
      );
    } on RazorpayFailure catch (failure) {
      return fail(failure.message);
    } finally {
      checkout.dispose();
    }

    final failure = await _repository.topUp(
      amount,
      razorpayOrderId: payment.orderId,
      razorpayPaymentId: payment.paymentId,
      razorpaySignature: payment.signature,
    );

    if (failure == null) {
      await loadWallet();
    } else {
      error = failure;
    }

    isToppingUp = false;
    notifyListeners();
    return failure;
  }

  /// Submits a "Request Cash" top-up — no money moves until an admin approves
  /// it. Returns null on success, or the error message.
  Future<String?> requestCash({
    required double amount,
    required DateTime requestedDate,
    String? email,
  }) async {
    isRequestingCash = true;
    error = null;
    notifyListeners();

    final failure = await _repository.requestCash(
      amount: amount,
      requestedDate: requestedDate,
      email: email,
    );

    if (failure == null) {
      await loadWallet();
    } else {
      error = failure;
    }

    isRequestingCash = false;
    notifyListeners();
    return failure;
  }
}
