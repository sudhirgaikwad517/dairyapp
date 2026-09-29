import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dairy_app/framework/repository/checkout/checkout_models.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

class CheckoutResult<T> {
  final T? data;
  final String? error;

  CheckoutResult.success(this.data) : error = null;
  CheckoutResult.failure(this.error) : data = null;

  bool get isSuccess => error == null;
}

@injectable
class CheckoutRepository {
  final Dio _dio;

  CheckoutRepository(this._dio);

  String _messageFrom(Object e, String fallback) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['message'] != null) return data['message'].toString();
    }
    return fallback;
  }

  Future<List<DeliverySlotModel>> deliverySlots() async {
    try {
      final response = await _dio.get(ApiEndpoints.checkoutOptions);
      if (response.data['success'] == true) {
        final slots = (response.data['data']?['deliverySlots'] as List?) ?? [];
        return slots.map((e) => DeliverySlotModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<CheckoutResult<CheckoutQuoteModel>> quote(String pincode) async {
    try {
      final response = await _dio.post(ApiEndpoints.checkoutQuote, data: {'pincode': pincode});
      if (response.data['success'] == true) {
        return CheckoutResult.success(
          CheckoutQuoteModel.fromJson(response.data['data'] as Map<String, dynamic>),
        );
      }
      return CheckoutResult.failure(response.data['message']?.toString() ?? 'Unable to load order summary');
    } catch (e) {
      return CheckoutResult.failure(_messageFrom(e, 'Unable to load order summary'));
    }
  }

  Future<CheckoutResult<PlacedOrderModel>> placeOrder({
    required String customerName,
    required String phone,
    required String address,
    required String pincode,
    required String paymentMethod,
    double walletAmount = 0,
    String? deliverySlotId,
    String? deliveryDate,
    String? razorpayOrderId,
    String? razorpayPaymentId,
    String? razorpaySignature,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.checkoutPlace, data: {
        'customerName': customerName,
        'phone': phone,
        'address': address,
        'pincode': pincode,
        'paymentMethod': paymentMethod,
        'walletAmount': walletAmount,
        if (deliverySlotId != null) 'deliverySlotId': deliverySlotId,
        if (deliveryDate != null) 'deliveryDate': deliveryDate,
        if (razorpayOrderId != null) 'razorpayOrderId': razorpayOrderId,
        if (razorpayPaymentId != null) 'razorpayPaymentId': razorpayPaymentId,
        if (razorpaySignature != null) 'razorpaySignature': razorpaySignature,
      });
      if (response.data['success'] == true) {
        return CheckoutResult.success(
          PlacedOrderModel.fromJson(response.data['data'] as Map<String, dynamic>),
        );
      }
      return CheckoutResult.failure(response.data['message']?.toString() ?? 'Unable to place order');
    } catch (e) {
      return CheckoutResult.failure(_messageFrom(e, 'Unable to place order'));
    }
  }
}
