import 'package:dairy_app/framework/repository/cart/cart_item_model.dart';

class DeliverySlotModel {
  final String id;
  final String label;

  DeliverySlotModel({required this.id, required this.label});

  factory DeliverySlotModel.fromJson(Map<String, dynamic> json) => DeliverySlotModel(
        id: json['id']?.toString() ?? '',
        label: json['label']?.toString() ?? '',
      );
}

class PincodeZoneModel {
  final bool serviceable;
  final String pincode;
  final String city;
  final String areaName;
  final double deliveryFee;
  final double minOrderValue;
  final String? message;

  PincodeZoneModel({
    required this.serviceable,
    this.pincode = '',
    this.city = '',
    this.areaName = '',
    this.deliveryFee = 0,
    this.minOrderValue = 0,
    this.message,
  });

  factory PincodeZoneModel.fromJson(Map<String, dynamic> json) => PincodeZoneModel(
        serviceable: json['serviceable'] == true,
        pincode: json['pincode']?.toString() ?? '',
        city: json['city']?.toString() ?? '',
        areaName: json['areaName']?.toString() ?? '',
        deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0,
        minOrderValue: (json['minOrderValue'] as num?)?.toDouble() ?? 0,
        message: json['message']?.toString(),
      );
}

class CheckoutQuoteModel {
  final CartModel cart;
  final PincodeZoneModel zone;
  final double subtotal;
  final double taxAmount;
  final double deliveryFee;
  final double totalAmount;
  final double minOrderValue;
  final bool meetsMinimum;
  final bool walletEnabled;

  CheckoutQuoteModel({
    required this.cart,
    required this.zone,
    required this.subtotal,
    required this.taxAmount,
    required this.deliveryFee,
    required this.totalAmount,
    required this.minOrderValue,
    required this.meetsMinimum,
    required this.walletEnabled,
  });

  factory CheckoutQuoteModel.fromJson(Map<String, dynamic> json) => CheckoutQuoteModel(
        cart: CartModel.fromJson((json['cart'] as Map<String, dynamic>?) ?? {}),
        zone: PincodeZoneModel.fromJson((json['pincode'] as Map<String, dynamic>?) ?? {}),
        subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
        taxAmount: (json['taxAmount'] as num?)?.toDouble() ?? 0,
        deliveryFee: (json['deliveryFee'] as num?)?.toDouble() ?? 0,
        totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0,
        minOrderValue: (json['minOrderValue'] as num?)?.toDouble() ?? 0,
        meetsMinimum: json['meetsMinimum'] == true,
        walletEnabled: json['walletEnabled'] == true,
      );
}

class PlacedOrderModel {
  final String id;
  final String invoiceNumber;
  final String status;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus;

  PlacedOrderModel({
    required this.id,
    this.invoiceNumber = '',
    this.status = '',
    this.totalAmount = 0,
    this.paymentMethod = '',
    this.paymentStatus = '',
  });

  factory PlacedOrderModel.fromJson(Map<String, dynamic> json) => PlacedOrderModel(
        id: json['id']?.toString() ?? '',
        invoiceNumber: json['invoiceNumber']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0,
        paymentMethod: json['paymentMethod']?.toString() ?? '',
        paymentStatus: json['paymentStatus']?.toString() ?? '',
      );
}
