import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/provider/payment/razorpay_service.dart';
import 'package:dairy_app/framework/repository/address/address_model.dart';
import 'package:dairy_app/framework/repository/address/address_repository.dart';
import 'package:dairy_app/framework/repository/auth/auth_repository.dart';
import 'package:dairy_app/framework/repository/checkout/checkout_models.dart';
import 'package:dairy_app/framework/repository/checkout/checkout_repository.dart';
import 'package:dairy_app/framework/repository/payment/payment_repository.dart';
import 'package:dairy_app/framework/repository/wallet/wallet_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

enum PaymentMethod { cod, wallet, online }

final checkoutProvider = ChangeNotifierProvider.autoDispose((ref) => CheckoutController()..load());

class CheckoutController extends ChangeNotifier {
  CheckoutRepository get _checkoutRepository => getIt<CheckoutRepository>();
  AuthRepository get _authRepository => getIt<AuthRepository>();
  AddressRepository get _addressRepository => getIt<AddressRepository>();
  WalletRepository get _walletRepository => getIt<WalletRepository>();
  PaymentRepository get _paymentRepository => getIt<PaymentRepository>();

  bool isLoading = false;
  bool isPlacing = false;
  bool onlinePaymentAvailable = false;
  String? error;

  Map<String, dynamic>? customer;
  AddressModel? address;
  CheckoutQuoteModel? quote;
  List<DeliverySlotModel> slots = const [];
  DeliverySlotModel? selectedSlot;
  double walletBalance = 0;
  PaymentMethod paymentMethod = PaymentMethod.cod;

  bool get hasAddress => address != null && address!.pincode.trim().isNotEmpty;

  /// How much of the wallet this order would consume.
  double get walletAmountToUse {
    if (paymentMethod != PaymentMethod.wallet || quote == null) return 0;
    final total = quote!.totalAmount;
    return walletBalance >= total ? total : walletBalance;
  }

  double get payableAfterWallet => (quote?.totalAmount ?? 0) - walletAmountToUse;

  bool get walletCoversOrder =>
      quote != null && walletBalance >= quote!.totalAmount;

  bool get canPlaceOrder =>
      !isPlacing &&
      hasAddress &&
      quote != null &&
      quote!.zone.serviceable &&
      quote!.meetsMinimum &&
      quote!.cart.items.isNotEmpty &&
      (paymentMethod == PaymentMethod.cod ||
          (paymentMethod == PaymentMethod.wallet && walletCoversOrder) ||
          (paymentMethod == PaymentMethod.online && onlinePaymentAvailable));

  Future<void> load() async {
    isLoading = true;
    error = null;
    notifyListeners();

    final meResponse = await _authRepository.me();
    if (meResponse['success'] == true) {
      customer = meResponse['data']?['customer'] as Map<String, dynamic>?;
    }

    final addresses = await _addressRepository.getAddresses();
    if (addresses != null && addresses.isNotEmpty) {
      address = addresses.firstWhere((a) => a.isDefault, orElse: () => addresses.first);
    }

    slots = await _checkoutRepository.deliverySlots();
    selectedSlot = slots.isNotEmpty ? slots.first : null;

    final wallet = await _walletRepository.getWallet();
    walletBalance = wallet?.balance ?? 0;

    onlinePaymentAvailable = await _paymentRepository.isOnlinePaymentAvailable();

    if (hasAddress) {
      final result = await _checkoutRepository.quote(address!.pincode);
      if (result.isSuccess) {
        quote = result.data;
      } else {
        error = result.error;
      }
    }

    isLoading = false;
    notifyListeners();
  }

  void selectSlot(DeliverySlotModel slot) {
    selectedSlot = slot;
    notifyListeners();
  }

  void selectPaymentMethod(PaymentMethod method) {
    paymentMethod = method;
    notifyListeners();
  }

  String get _customerName => (customer?['name'] as String?)?.trim().isNotEmpty == true
      ? customer!['name'] as String
      : 'Customer';

  /// Returns the placed order on success, or null (with [error] set) on failure.
  ///
  /// For online payments the Razorpay sheet is opened first; the order is only
  /// created after Razorpay signs the payment, and the backend re-verifies that
  /// signature before marking the order paid.
  Future<PlacedOrderModel?> placeOrder() async {
    if (quote == null || address == null) return null;

    isPlacing = true;
    error = null;
    notifyListeners();

    RazorpaySuccess? payment;
    if (paymentMethod == PaymentMethod.online) {
      final orderResult = await _paymentRepository.createOrderForCart(
        pincode: address!.pincode,
        walletAmount: 0,
      );

      if (!orderResult.isSuccess) {
        isPlacing = false;
        error = orderResult.error;
        notifyListeners();
        return null;
      }

      final checkout = RazorpayCheckout();
      try {
        payment = await checkout.open(
          order: orderResult.data!,
          customerName: _customerName,
          phone: customer?['phone']?.toString() ?? '',
          email: customer?['email']?.toString(),
          description: 'Order payment',
        );
      } on RazorpayFailure catch (failure) {
        isPlacing = false;
        error = failure.message;
        notifyListeners();
        return null;
      } finally {
        checkout.dispose();
      }
    }

    final result = await _checkoutRepository.placeOrder(
      customerName: _customerName,
      phone: customer?['phone']?.toString() ?? '',
      address: address!.address.trim().isNotEmpty ? address!.address : _composeAddress(address!),
      pincode: address!.pincode,
      paymentMethod: switch (paymentMethod) {
        PaymentMethod.wallet => 'wallet',
        PaymentMethod.online => 'razorpay',
        PaymentMethod.cod => 'cod',
      },
      walletAmount: walletAmountToUse,
      deliverySlotId: selectedSlot?.id,
      razorpayOrderId: payment?.orderId,
      razorpayPaymentId: payment?.paymentId,
      razorpaySignature: payment?.signature,
    );

    isPlacing = false;
    if (!result.isSuccess) {
      error = result.error;
      notifyListeners();
      return null;
    }

    notifyListeners();
    return result.data;
  }

  String _composeAddress(AddressModel address) => [
        address.flatNo,
        address.societyName,
        address.streetName,
        address.landmark,
        address.city,
        address.state,
        address.pincode,
      ].where((part) => part.trim().isNotEmpty).join(', ');
}
