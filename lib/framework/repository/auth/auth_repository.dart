import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

@injectable
class AuthRepository {
  final Dio _dio;

  AuthRepository(this._dio);

  Future<Map<String, dynamic>> sendOtp(String phone) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.sendOtp,
        data: {'phone': phone},
      );
      return response.data;
    } catch (e) {
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map<String, dynamic>) {
          return data;
        }
        return {'success': false, 'message': 'Network Error'};
      }
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String otp, String sessionId) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.verifyOtp,
        data: {'phone': phone, 'otp': otp},
        options: Options(headers: {'session-id': sessionId}),
      );
      return response.data;
    } catch (e) {
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map<String, dynamic>) {
          return data;
        }
        return {'success': false, 'message': 'Network Error'};
      }
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> loginWithPassword(String phoneOrEmail, String password) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.login,
        data: {'phoneOrEmail': phoneOrEmail, 'password': password},
      );
      return response.data;
    } catch (e) {
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map<String, dynamic>) {
          return data;
        }
        return {'success': false, 'message': 'Network Error'};
      }
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> me({String? sessionId}) async {
    try {
      final response = await _dio.get(
        ApiEndpoints.me,
        options: sessionId != null ? Options(headers: {'session-id': sessionId}) : null,
      );
      return response.data;
    } catch (e) {
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map<String, dynamic>) return data;
        return {'success': false, 'message': 'Network Error'};
      }
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> fields) async {
    try {
      final response = await _dio.patch(ApiEndpoints.updateProfile, data: fields);
      return response.data;
    } catch (e) {
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map<String, dynamic>) return data;
        return {'success': false, 'message': 'Network Error'};
      }
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post(ApiEndpoints.logout);
    } catch (_) {
      // Best-effort — the local session is cleared regardless.
    }
  }
}
