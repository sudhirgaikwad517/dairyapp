import 'package:dairy_app/framework/provider/local_storage/hive/hive_client.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';


@singleton
class DioInterceptors extends Interceptor {
  final HiveClient _hiveClient;

  const DioInterceptors(this._hiveClient);

  @override
  Future<void> onRequest(
      RequestOptions options,
      RequestInterceptorHandler handler,
      ) async {
    //final tokenData = _hiveClient.getData();

    // if (tokenData != null) {
    //   options.headers['X-Auth-Token'] = tokenData.token;
    // }

    handler.next(options);
  }
}
