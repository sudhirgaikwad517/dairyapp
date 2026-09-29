import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

@injectable
class LeadRepository {
  final Dio _dio;

  LeadRepository(this._dio);

  /// Used for the "Contact Us" form — every lead shows up in the admin
  /// panel's existing Leads screen, tagged by [source].
  Future<String?> submitLead({
    required String name,
    required String phone,
    required String source,
    String? message,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.leads, data: {
        'name': name,
        'phone': phone,
        'source': source,
        if (message != null && message.isNotEmpty) 'message': message,
      });
      if (response.data['success'] == true) return null;
      return response.data['message']?.toString() ?? 'Unable to submit';
    } catch (e) {
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map && data['message'] != null) return data['message'].toString();
      }
      return 'Unable to submit — please try again';
    }
  }
}
