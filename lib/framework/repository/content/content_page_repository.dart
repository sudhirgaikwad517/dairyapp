import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

class ContentPageSummary {
  final String id;
  final String slug;
  final String title;

  ContentPageSummary({required this.id, required this.slug, required this.title});

  factory ContentPageSummary.fromJson(Map<String, dynamic> json) => ContentPageSummary(
        id: json['id']?.toString() ?? '',
        slug: json['slug']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
      );
}

class ContentPageDetail {
  final String slug;
  final String title;
  final String content;

  ContentPageDetail({required this.slug, required this.title, required this.content});

  factory ContentPageDetail.fromJson(Map<String, dynamic> json) => ContentPageDetail(
        slug: json['slug']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        content: json['content']?.toString() ?? '',
      );
}

@injectable
class ContentPageRepository {
  final Dio _dio;

  ContentPageRepository(this._dio);

  /// "Policies" list screen — every active page except About Us, which is
  /// linked directly from the menu.
  Future<List<ContentPageSummary>?> listPages({String? exclude}) async {
    try {
      final response = await _dio.get(
        ApiEndpoints.contentPages,
        queryParameters: exclude != null ? {'exclude': exclude} : null,
      );
      if (response.data['success'] == true) {
        return (response.data['data'] as List)
            .map((e) => ContentPageSummary.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<ContentPageDetail?> getPage(String slug) async {
    try {
      final response = await _dio.get(ApiEndpoints.contentPage(slug));
      if (response.data['success'] == true) {
        return ContentPageDetail.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
