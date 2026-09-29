import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/auth/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

final ordersProvider = ChangeNotifierProvider((ref) => OrdersController()..loadOrders());

class OrderSummaryModel {
  final String id;
  final String invoiceNumber;
  final String status;

  /// What the order was worth, before anything was taken from the wallet.
  final double orderValue;

  /// Still payable (0 when the wallet covered the whole order).
  final double totalAmount;

  final double walletAmountUsed;
  final String paymentMethod;
  final String paymentStatus;
  final DateTime? createdAt;
  final int itemCount;

  OrderSummaryModel({
    required this.id,
    this.invoiceNumber = '',
    required this.status,
    required this.orderValue,
    required this.totalAmount,
    this.walletAmountUsed = 0,
    this.paymentMethod = 'cod',
    required this.paymentStatus,
    this.createdAt,
    this.itemCount = 0,
  });

  bool get paidFromWallet => walletAmountUsed > 0;

  factory OrderSummaryModel.fromJson(Map<String, dynamic> json) {
    final payable = (json['totalAmount'] as num?)?.toDouble() ?? 0;
    final wallet = (json['walletAmountUsed'] as num?)?.toDouble() ?? 0;

    return OrderSummaryModel(
      id: json['id']?.toString() ?? '',
      invoiceNumber: json['invoiceNumber']?.toString() ?? '',
      status: (json['status']?.toString() ?? 'PENDING').toUpperCase(),
      orderValue: (json['orderValue'] as num?)?.toDouble() ?? (payable + wallet),
      totalAmount: payable,
      walletAmountUsed: wallet,
      paymentMethod: json['paymentMethod']?.toString() ?? 'cod',
      paymentStatus: json['paymentStatus']?.toString() ?? 'pending',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
    );
  }

  bool get isActive => status == 'PENDING' || status == 'IN_PROCESS' || status == 'SHIPPED';
  bool get isDelivered => status == 'DELIVERED';
  bool get isCancelled => status == 'CANCELLED';
}

class OrdersController extends ChangeNotifier {
  List<OrderSummaryModel> _orders = [];
  bool isLoading = false;
  String? error;

  AuthRepository get _repository => getIt<AuthRepository>();

  List<OrderSummaryModel> get orders => _orders;

  List<OrderSummaryModel> get upcoming => _orders.where((o) => o.isActive).toList();
  List<OrderSummaryModel> get delivered => _orders.where((o) => o.isDelivered).toList();
  List<OrderSummaryModel> get cancelled => _orders.where((o) => o.isCancelled).toList();

  Future<void> loadOrders() async {
    isLoading = true;
    error = null;
    notifyListeners();

    final response = await _repository.me();
    if (response['success'] == true) {
      final list = (response['data']?['orders'] as List?) ?? [];
      _orders = list.map((e) => OrderSummaryModel.fromJson(e as Map<String, dynamic>)).toList();
    } else {
      error = response['message']?.toString() ?? 'Unable to load your orders';
    }

    isLoading = false;
    notifyListeners();
  }
}
