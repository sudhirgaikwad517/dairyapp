import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

@injectable
class BannerRepository {
  final Dio _dio;

  BannerRepository() : _dio = Dio() {
    _dio.options.baseUrl = ApiEndpoints.baseUrl;
  }

  Future<Map<String, dynamic>> fetchBanners() async {
    try {
      final response = await _dio.get('banners');
      if (response.data['success'] == true) {
        return response.data['data'];
      }
      return {'topBanners': [], 'secondBannerVideo': ''};
    } catch (e) {
      if (e is DioException) {
        print('Error fetching banners: ${e.response?.data}');
      } else {
        print('Error fetching banners: $e');
      }
      return {'topBanners': [], 'secondBannerVideo': ''};
    }
  }
}
