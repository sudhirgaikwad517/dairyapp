import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

@injectable
class FeedbackRepository {
  final Dio _dio;

  FeedbackRepository(this._dio);

  /// Shared by the star-rating Feedback flow and the Complaint form — the
  /// backend stores both in the same table, distinguished by [type].
  Future<String?> submit({
    int? rating,
    String? comment,
    String type = 'feedback',
    String? subject,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.feedback, data: {
        if (rating != null) 'rating': rating,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
        'type': type,
        if (subject != null && subject.isNotEmpty) 'subject': subject,
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
