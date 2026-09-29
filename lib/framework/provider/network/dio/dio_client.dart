import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

/// Unused leftover from the project's original boilerplate template — the app's
/// repositories talk to the shared injected [Dio] instance directly (see
/// [DioApiClient] + [DioInterceptors]) instead of going through this wrapper.
/// Kept only so the existing DI registration doesn't need regenerating.
@lazySingleton
class DioClient {
  final Dio dio;

  DioClient(this.dio);

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    return dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data, Map<String, dynamic>? queryParameters}) async {
    return dio.post(path, data: data, queryParameters: queryParameters);
  }
}
