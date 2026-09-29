import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

class AppNotificationModel {
  final String id;
  final String title;
  final String message;
  final bool isRead;
  final DateTime? createdAt;

  AppNotificationModel({
    required this.id,
    required this.title,
    required this.message,
    this.isRead = false,
    this.createdAt,
  });

  factory AppNotificationModel.fromJson(Map<String, dynamic> json) => AppNotificationModel(
        id: json['id']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        message: json['message']?.toString() ?? '',
        isRead: json['isRead'] == true,
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      );
}

@injectable
class NotificationRepository {
  final Dio _dio;

  NotificationRepository(this._dio);

  Future<List<AppNotificationModel>?> getNotifications() async {
    try {
      final response = await _dio.get(ApiEndpoints.notifications);
      if (response.data['success'] == true) {
        final list = (response.data['data'] as List?) ?? [];
        return list.map((e) => AppNotificationModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<int> unreadCount() async {
    try {
      final response = await _dio.get('${ApiEndpoints.notifications}/unread-count');
      if (response.data['success'] == true) {
        return (response.data['data']?['count'] as num?)?.toInt() ?? 0;
      }
      return 0;
    } catch (_) {
      return 0;
    }
  }

  Future<void> markRead(String id) async {
    try {
      await _dio.patch('${ApiEndpoints.notifications}/$id/read');
    } catch (_) {
      // Non-critical.
    }
  }

  Future<void> markAllRead() async {
    try {
      await _dio.patch('${ApiEndpoints.notifications}/read-all');
    } catch (_) {
      // Non-critical.
    }
  }
}
