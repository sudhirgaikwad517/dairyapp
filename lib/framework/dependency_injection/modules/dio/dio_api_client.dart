import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

@module
abstract class DioApiClient {
  @lazySingleton
  Dio getDio(){
    final dio = Dio(
        BaseOptions(
          baseUrl: ApiEndpoints.baseUrl,
          connectTimeout: Duration(seconds: 30),
          receiveTimeout: Duration(seconds: 30),
          headers: {
            'Accept' : 'application/json',
            'Content-Type' : 'application/json',
          }
        )
    );
    return dio;
  }
}