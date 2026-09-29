import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/subscription/subscription_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

final subscriptionProvider = ChangeNotifierProvider((ref) => SubscriptionController()..loadSubscriptions());

class SubscriptionController extends ChangeNotifier {
  List<SubscriptionModel> _subscriptions = [];
  bool isLoading = false;
  bool isUpdating = false;
  String? error;

  SubscriptionRepository get _repository => getIt<SubscriptionRepository>();

  List<SubscriptionModel> get subscriptions => _subscriptions;
  List<SubscriptionModel> get active => _subscriptions.where((s) => s.isActive).toList();
  List<SubscriptionModel> get paused => _subscriptions.where((s) => s.isPaused).toList();
  List<SubscriptionModel> get cancelled => _subscriptions.where((s) => s.isCancelled).toList();

  Future<void> loadSubscriptions() async {
    isLoading = true;
    error = null;
    notifyListeners();

    final list = await _repository.getSubscriptions();
    if (list != null) {
      _subscriptions = list;
    } else {
      error = 'Unable to load your subscriptions';
    }

    isLoading = false;
    notifyListeners();
  }

  /// Live cost preview — call whenever quantity/frequency/dates change.
  Future<SubscriptionQuoteResult> quote({
    required String productId,
    String? variantId,
    required String frequency,
    List<int>? dayWiseDays,
    required int quantity,
    required String startDate,
    String? toDate,
  }) =>
      _repository.quote(
        productId: productId,
        variantId: variantId,
        frequency: frequency,
        dayWiseDays: dayWiseDays,
        quantity: quantity,
        startDate: startDate,
        toDate: toDate,
      );

  Future<String?> create({
    required String productId,
    String? variantId,
    required String frequency,
    List<int>? dayWiseDays,
    required int quantity,
    String? deliverySlotId,
    required String startDate,
    String? toDate,
    String? paymentMethod,
    String? razorpayOrderId,
    String? razorpayPaymentId,
    String? razorpaySignature,
  }) =>
      _run(() => _repository.create(
            productId: productId,
            variantId: variantId,
            frequency: frequency,
            dayWiseDays: dayWiseDays,
            quantity: quantity,
            deliverySlotId: deliverySlotId,
            startDate: startDate,
            toDate: toDate,
            paymentMethod: paymentMethod,
            razorpayOrderId: razorpayOrderId,
            razorpayPaymentId: razorpayPaymentId,
            razorpaySignature: razorpaySignature,
          ));

  Future<String?> pause(String id) => _run(() => _repository.pause(id));

  Future<String?> resume(String id) => _run(() => _repository.resume(id));

  Future<String?> cancel(String id, {String? reason}) => _run(() => _repository.cancel(id, reason: reason));

  Future<String?> _run(Future<String?> Function() action) async {
    isUpdating = true;
    notifyListeners();

    final failure = await action();
    if (failure == null) {
      await loadSubscriptions();
    } else {
      error = failure;
    }

    isUpdating = false;
    notifyListeners();
    return failure;
  }
}
