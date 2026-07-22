// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format width=80

// **************************************************************************
// InjectableConfigGenerator
// **************************************************************************

// ignore_for_file: type=lint
// coverage:ignore-file

// ignore_for_file: no_leading_underscores_for_library_prefixes
import 'package:dairy_app/framework/dependency_injection/modules/dio/dio_api_client.dart'
    as _i823;
import 'package:dairy_app/framework/provider/local_storage/hive/hive_client.dart'
    as _i216;
import 'package:dairy_app/framework/provider/local_storage/object_box/object_box_client.dart'
    as _i908;
import 'package:dairy_app/framework/provider/network/dio/dio_client.dart'
    as _i656;
import 'package:dairy_app/framework/provider/network/dio/dio_interceptors.dart'
    as _i726;
import 'package:dio/dio.dart' as _i361;
import 'package:get_it/get_it.dart' as _i174;
import 'package:injectable/injectable.dart' as _i526;

extension GetItInjectableX on _i174.GetIt {
  // initializes the registration of main-scope dependencies inside of GetIt
  _i174.GetIt init({
    String? environment,
    _i526.EnvironmentFilter? environmentFilter,
  }) {
    final gh = _i526.GetItHelper(this, environment, environmentFilter);
    final dioApiClient = _$DioApiClient();
    gh.singleton<_i216.HiveClient>(() => _i216.HiveClient());
    gh.lazySingleton<_i361.Dio>(() => dioApiClient.getDio());
    gh.lazySingleton<_i908.ObjectBoxClient>(() => _i908.ObjectBoxClient());
    gh.singleton<_i726.DioInterceptors>(
      () => _i726.DioInterceptors(gh<_i216.HiveClient>()),
    );
    gh.lazySingleton<_i656.DioClient>(() => _i656.DioClient(gh<_i361.Dio>()));
    return this;
  }
}

class _$DioApiClient extends _i823.DioApiClient {}
