import 'dart:async';

import 'package:dairy_app/framework/provider/local_storage/hive/hive_client.dart';
import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

/// Broadcasts when the backend rejects our session, so the app can send the
/// customer back to login instead of showing a confusing error mid-action.
class SessionExpiredNotifier {
  static final StreamController<void> _controller = StreamController<void>.broadcast();

  static Stream<void> get stream => _controller.stream;

  static void notify() {
    if (!_controller.isClosed) _controller.add(null);
  }
}

@singleton
class DioInterceptors extends Interceptor {
  final HiveClient _hiveClient;

  const DioInterceptors(this._hiveClient);

  @override
  Future<void> onRequest(
      RequestOptions options,
      RequestInterceptorHandler handler,
      ) async {
    final sessionId = await _hiveClient.getSessionId();
    if (sessionId != null && sessionId.isNotEmpty) {
      options.headers['session-id'] = sessionId;
    }

    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    // Only a request that carried a session can mean "session expired"; a 401 from
    // login itself (wrong phone or password) is for the login screen to show.
    final hadSession = err.requestOptions.headers['session-id'] != null;
    final path = err.requestOptions.path;
    final isSignIn = [ApiEndpoints.login, ApiEndpoints.signup, ApiEndpoints.sendOtp, ApiEndpoints.verifyOtp].any(path.endsWith);
    if (err.response?.statusCode == 401 && hadSession && !isSignIn) {
      await _hiveClient.clearSession();
      SessionExpiredNotifier.notify();
    }
    handler.next(err);
  }
}
