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
import 'package:dairy_app/framework/repository/address/address_repository.dart'
    as _i704;
import 'package:dairy_app/framework/repository/app_assets/app_assets_cache.dart'
    as _i510;
import 'package:dairy_app/framework/repository/app_assets/app_assets_repository.dart'
    as _i982;
import 'package:dairy_app/framework/repository/auth/auth_repository.dart'
    as _i1057;
import 'package:dairy_app/framework/repository/banner/banner_repository.dart'
    as _i311;
import 'package:dairy_app/framework/repository/billing/billing_repository.dart'
    as _i654;
import 'package:dairy_app/framework/repository/cart/cart_repository.dart'
    as _i709;
import 'package:dairy_app/framework/repository/checkout/checkout_repository.dart'
    as _i10;
import 'package:dairy_app/framework/repository/content/content_page_repository.dart'
    as _i325;
import 'package:dairy_app/framework/repository/coupon/coupon_repository.dart'
    as _i105;
import 'package:dairy_app/framework/repository/cutoff/cutoff_repository.dart'
    as _i900;
import 'package:dairy_app/framework/repository/delivery_mode/delivery_mode_repository.dart'
    as _i627;
import 'package:dairy_app/framework/repository/feedback/feedback_repository.dart'
    as _i27;
import 'package:dairy_app/framework/repository/lead/lead_repository.dart'
    as _i827;
import 'package:dairy_app/framework/repository/notification/notification_repository.dart'
    as _i588;
import 'package:dairy_app/framework/repository/payment/payment_repository.dart'
    as _i741;
import 'package:dairy_app/framework/repository/product/product_repository.dart'
    as _i37;
import 'package:dairy_app/framework/repository/referral/referral_repository.dart'
    as _i383;
import 'package:dairy_app/framework/repository/subscription/subscription_repository.dart'
    as _i632;
import 'package:dairy_app/framework/repository/vacation/vacation_repository.dart'
    as _i991;
import 'package:dairy_app/framework/repository/wallet/wallet_repository.dart'
    as _i91;
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
    gh.singleton<_i510.AppAssetsCache>(() => _i510.AppAssetsCache());
    gh.lazySingleton<_i361.Dio>(() => dioApiClient.getDio());
    gh.lazySingleton<_i908.ObjectBoxClient>(() => _i908.ObjectBoxClient());
    gh.factory<_i982.AppAssetsRepository>(
      () => _i982.AppAssetsRepository(
        gh<_i361.Dio>(),
        gh<_i510.AppAssetsCache>(),
      ),
    );
    gh.singleton<_i726.DioInterceptors>(
      () => _i726.DioInterceptors(gh<_i216.HiveClient>()),
    );
    gh.lazySingleton<_i656.DioClient>(() => _i656.DioClient(gh<_i361.Dio>()));
    gh.factory<_i704.AddressRepository>(
      () => _i704.AddressRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i1057.AuthRepository>(
      () => _i1057.AuthRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i311.BannerRepository>(
      () => _i311.BannerRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i654.BillingRepository>(
      () => _i654.BillingRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i709.CartRepository>(
      () => _i709.CartRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i10.CheckoutRepository>(
      () => _i10.CheckoutRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i325.ContentPageRepository>(
      () => _i325.ContentPageRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i105.CouponRepository>(
      () => _i105.CouponRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i900.CutoffRepository>(
      () => _i900.CutoffRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i627.DeliveryModeRepository>(
      () => _i627.DeliveryModeRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i27.FeedbackRepository>(
      () => _i27.FeedbackRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i827.LeadRepository>(
      () => _i827.LeadRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i588.NotificationRepository>(
      () => _i588.NotificationRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i741.PaymentRepository>(
      () => _i741.PaymentRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i37.ProductRepository>(
      () => _i37.ProductRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i383.ReferralRepository>(
      () => _i383.ReferralRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i632.SubscriptionRepository>(
      () => _i632.SubscriptionRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i991.VacationRepository>(
      () => _i991.VacationRepository(gh<_i361.Dio>()),
    );
    gh.factory<_i91.WalletRepository>(
      () => _i91.WalletRepository(gh<_i361.Dio>()),
    );
    return this;
  }
}

class _$DioApiClient extends _i823.DioApiClient {}
