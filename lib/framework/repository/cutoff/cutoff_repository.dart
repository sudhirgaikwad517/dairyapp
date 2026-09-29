import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

/// The earliest calendar date a subscription-affecting change (vacation,
/// pause, quantity change…) can actually take effect, given the dairy's
/// cut-off time. Falls back to "tomorrow" if the server can't be reached, so
/// a date picker never opens with no minimum at all.
class CutoffInfo {
  final String cutoffTime;
  final DateTime earliestEffectiveDate;

  const CutoffInfo({required this.cutoffTime, required this.earliestEffectiveDate});

  factory CutoffInfo.fromJson(Map<String, dynamic> json) {
    final parsed = DateTime.tryParse(json['earliestEffectiveDate']?.toString() ?? '');
    return CutoffInfo(
      cutoffTime: json['cutoffTime']?.toString() ?? '22:00',
      earliestEffectiveDate: parsed ?? DateTime.now().add(const Duration(days: 1)),
    );
  }

  factory CutoffInfo.fallback() => CutoffInfo(
        cutoffTime: '22:00',
        earliestEffectiveDate: DateTime.now().add(const Duration(days: 1)),
      );
}

@injectable
class CutoffRepository {
  final Dio _dio;

  CutoffRepository(this._dio);

  Future<CutoffInfo> fetchCutoffInfo() async {
    try {
      final response = await _dio.get(ApiEndpoints.cutoffInfo);
      if (response.data['success'] == true) {
        return CutoffInfo.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return CutoffInfo.fallback();
    } catch (_) {
      return CutoffInfo.fallback();
    }
  }
}
