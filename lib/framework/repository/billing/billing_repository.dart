import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

class BillingModel {
  final String id;
  final int billAmount;
  final int paidAmount;
  final int remainingAmount;
  final DateTime? fromDate;
  final DateTime? toDate;
  final String status;

  BillingModel({
    required this.id,
    required this.billAmount,
    required this.paidAmount,
    required this.remainingAmount,
    this.fromDate,
    this.toDate,
    required this.status,
  });

  factory BillingModel.fromJson(Map<String, dynamic> json) => BillingModel(
        id: json['id']?.toString() ?? '',
        billAmount: (json['billAmount'] as num?)?.toInt() ?? 0,
        paidAmount: (json['paidAmount'] as num?)?.toInt() ?? 0,
        remainingAmount: (json['remainingAmount'] as num?)?.toInt() ?? 0,
        fromDate: json['fromDate'] != null ? DateTime.tryParse(json['fromDate'].toString()) : null,
        toDate: json['toDate'] != null ? DateTime.tryParse(json['toDate'].toString()) : null,
        status: json['status']?.toString() ?? 'unpaid',
      );
}

@injectable
class BillingRepository {
  final Dio _dio;

  BillingRepository(this._dio);

  Future<List<BillingModel>?> getBills() async {
    try {
      final response = await _dio.get(ApiEndpoints.billing);
      if (response.data['success'] == true) {
        return (response.data['data'] as List)
            .map((e) => BillingModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
