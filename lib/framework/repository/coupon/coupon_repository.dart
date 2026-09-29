import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

class CouponModel {
  final String id;
  final String code;
  final String title;
  final String? description;
  final String discountType;
  final int discountValue;
  final int minOrderAmount;
  final int? maxDiscountAmount;
  final DateTime? validTo;

  CouponModel({
    required this.id,
    required this.code,
    required this.title,
    this.description,
    required this.discountType,
    required this.discountValue,
    required this.minOrderAmount,
    this.maxDiscountAmount,
    this.validTo,
  });

  String get discountLabel => discountType == 'percent' ? '$discountValue% OFF' : '₹$discountValue OFF';

  factory CouponModel.fromJson(Map<String, dynamic> json) => CouponModel(
        id: json['id']?.toString() ?? '',
        code: json['code']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        description: json['description']?.toString(),
        discountType: json['discountType']?.toString() ?? 'percent',
        discountValue: (json['discountValue'] as num?)?.toInt() ?? 0,
        minOrderAmount: (json['minOrderAmount'] as num?)?.toInt() ?? 0,
        maxDiscountAmount: (json['maxDiscountAmount'] as num?)?.toInt(),
        validTo: json['validTo'] != null ? DateTime.tryParse(json['validTo'].toString()) : null,
      );
}

@injectable
class CouponRepository {
  final Dio _dio;

  CouponRepository(this._dio);

  Future<List<CouponModel>?> getCoupons() async {
    try {
      final response = await _dio.get(ApiEndpoints.coupons);
      if (response.data['success'] == true) {
        return (response.data['data'] as List)
            .map((e) => CouponModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
