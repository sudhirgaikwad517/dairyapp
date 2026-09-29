import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

/// A Razorpay order created on our backend, ready to be handed to the
/// Razorpay checkout sheet.
class RazorpayOrderModel {
  final String keyId;
  final String orderId;
  final int amountPaise;
  final String currency;

  RazorpayOrderModel({
    required this.keyId,
    required this.orderId,
    required this.amountPaise,
    this.currency = 'INR',
  });

  factory RazorpayOrderModel.fromJson(Map<String, dynamic> json) => RazorpayOrderModel(
        keyId: json['keyId']?.toString() ?? '',
        orderId: json['orderId']?.toString() ?? '',
        amountPaise: (json['amount'] as num?)?.toInt() ?? 0,
        currency: json['currency']?.toString() ?? 'INR',
      );
}

class PaymentResult<T> {
  final T? data;
  final String? error;

  PaymentResult.success(this.data) : error = null;
  PaymentResult.failure(this.error) : data = null;

  bool get isSuccess => error == null;
}

@injectable
class PaymentRepository {
  final Dio _dio;

  PaymentRepository(this._dio);

  String _messageFrom(Object e, String fallback) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['message'] != null) return data['message'].toString();
    }
    return fallback;
  }

  /// Whether the backend has live Razorpay keys — the app hides online
  /// payment entirely when this is false.
  Future<bool> isOnlinePaymentAvailable() async {
    try {
      final response = await _dio.get(ApiEndpoints.razorpayStatus);
      return response.data['success'] == true && response.data['data']?['configured'] == true;
    } catch (_) {
      return false;
    }
  }

  Future<PaymentResult<RazorpayOrderModel>> createOrderForCart({
    required String pincode,
    double walletAmount = 0,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.razorpayOrder, data: {
        'pincode': pincode,
        'walletAmount': walletAmount,
      });
      if (response.data['success'] == true) {
        return PaymentResult.success(
          RazorpayOrderModel.fromJson(response.data['data']['razorpay'] as Map<String, dynamic>),
        );
      }
      return PaymentResult.failure(response.data['message']?.toString() ?? 'Unable to start payment');
    } catch (e) {
      return PaymentResult.failure(_messageFrom(e, 'Unable to start payment'));
    }
  }

  Future<PaymentResult<RazorpayOrderModel>> createOrderForWalletTopUp(double amount) async {
    try {
      final response = await _dio.post(ApiEndpoints.razorpayWalletOrder, data: {'amount': amount});
      if (response.data['success'] == true) {
        return PaymentResult.success(
          RazorpayOrderModel.fromJson(response.data['data'] as Map<String, dynamic>),
        );
      }
      return PaymentResult.failure(response.data['message']?.toString() ?? 'Unable to start payment');
    } catch (e) {
      return PaymentResult.failure(_messageFrom(e, 'Unable to start payment'));
    }
  }

  /// Creates a Razorpay order for a prepaid subscription's upfront total. The
  /// amount is computed and verified server-side from the plan details —
  /// never trust (or even send) a client-computed total here.
  Future<PaymentResult<RazorpayOrderModel>> createOrderForSubscription({
    required String productId,
    String? variantId,
    required String frequency,
    List<int>? dayWiseDays,
    required int quantity,
    required String startDate,
    required String toDate,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.razorpaySubscriptionOrder, data: {
        'productId': productId,
        if (variantId != null) 'variantId': variantId,
        'frequency': frequency,
        if (dayWiseDays != null && dayWiseDays.isNotEmpty) 'dayWiseDays': dayWiseDays,
        'quantity': quantity,
        'startDate': startDate,
        'toDate': toDate,
      });
      if (response.data['success'] == true) {
        return PaymentResult.success(
          RazorpayOrderModel.fromJson(response.data['data'] as Map<String, dynamic>),
        );
      }
      return PaymentResult.failure(response.data['message']?.toString() ?? 'Unable to start payment');
    } catch (e) {
      return PaymentResult.failure(_messageFrom(e, 'Unable to start payment'));
    }
  }
}
