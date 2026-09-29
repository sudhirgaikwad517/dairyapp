import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dairy_app/framework/repository/app_assets/app_assets_cache.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

@injectable
class AppAssetsRepository {
  final Dio _dio;
  final AppAssetsCache _cache;

  AppAssetsRepository(this._dio, this._cache);

  /// Fetches the current admin-configured images and updates the on-device
  /// cache for next launch. Best-effort — failures are swallowed since the
  /// splash/login screens already have a sensible bundled-asset fallback.
  Future<void> refreshFromNetwork() async {
    try {
      final response = await _dio.get(ApiEndpoints.appAssets);
      if (response.data['success'] == true) {
        final data = response.data['data'] as Map<String, dynamic>;
        await _cache.save(
          splashImageUrl: data['splashImageUrl']?.toString(),
          loginImageUrl: data['loginImageUrl']?.toString(),
        );
      }
    } catch (_) {
      // Keep whatever was cached from the last successful fetch.
    }
  }
}
