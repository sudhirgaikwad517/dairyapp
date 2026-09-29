import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dairy_app/framework/repository/vacation/vacation_model.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

class VacationListResult {
  final List<VacationModel> vacations;
  final VacationModel? active;
  final List<VacationModel> upcoming;

  const VacationListResult({
    this.vacations = const [],
    this.active,
    this.upcoming = const [],
  });
}

/// Wraps a failed create/cancel with the server's own message — a cutoff-time
/// rejection carries the actual earliest date so the UI can explain it rather
/// than just saying "failed".
class VacationFailure {
  final String message;
  final DateTime? earliestEffectiveDate;

  const VacationFailure(this.message, {this.earliestEffectiveDate});
}

@injectable
class VacationRepository {
  final Dio _dio;

  VacationRepository(this._dio);

  Future<VacationListResult?> fetchVacations() async {
    try {
      final response = await _dio.get(ApiEndpoints.vacations);
      if (response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        return VacationListResult(
          vacations: ((data['vacations'] as List?) ?? [])
              .map((e) => VacationModel.fromJson(e as Map<String, dynamic>))
              .toList(),
          active: data['active'] != null
              ? VacationModel.fromJson(data['active'] as Map<String, dynamic>)
              : null,
          upcoming: ((data['upcoming'] as List?) ?? [])
              .map((e) => VacationModel.fromJson(e as Map<String, dynamic>))
              .toList(),
        );
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Returns null on success, or the failure reason.
  Future<VacationFailure?> create({
    required DateTime fromDate,
    required DateTime toDate,
    String? remark,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.vacations, data: {
        'fromDate': _dateOnly(fromDate),
        'toDate': _dateOnly(toDate),
        if (remark != null && remark.trim().isNotEmpty) 'remark': remark.trim(),
      });
      if (response.data['success'] == true) return null;
      return VacationFailure(response.data['message']?.toString() ?? 'Unable to schedule your vacation');
    } on DioException catch (e) {
      final data = e.response?.data;
      final message = data is Map ? data['message']?.toString() : null;
      final earliest = data is Map
          ? DateTime.tryParse((data['data'] as Map?)?['earliestEffectiveDate']?.toString() ?? '')
          : null;
      return VacationFailure(message ?? 'Unable to schedule your vacation', earliestEffectiveDate: earliest);
    } catch (_) {
      return const VacationFailure('Unable to schedule your vacation');
    }
  }

  /// Returns null on success, or the failure reason.
  Future<String?> cancel(String id) async {
    try {
      final response = await _dio.post(ApiEndpoints.cancelVacation(id));
      if (response.data['success'] == true) return null;
      return response.data['message']?.toString() ?? 'Unable to update this vacation';
    } catch (e) {
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map && data['message'] != null) return data['message'].toString();
      }
      return 'Unable to update this vacation';
    }
  }

  String _dateOnly(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}
