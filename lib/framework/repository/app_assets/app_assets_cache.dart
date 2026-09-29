import 'package:hive_ce/hive.dart';
import 'package:injectable/injectable.dart';

/// Caches the admin-configurable splash/login images on-device so the
/// splash screen can show the right one on its very first frame — reading a
/// value out of network on that frame would either delay the splash or
/// flash the default image before swapping, neither of which is worth it for
/// an asset that only changes when an admin uploads a new one.
///
/// [splashImageUrl]/[loginImageUrl] are populated once, synchronously
/// available after [preload] is awaited during app startup; [refreshFromNetwork]
/// (called in the background by the screens themselves) updates the cache
/// for the *next* launch.
@singleton
class AppAssetsCache {
  static const String _boxName = 'appAssetsBox';
  static const String _keySplash = 'splashImageUrl';
  static const String _keyLogin = 'loginImageUrl';

  Box? _box;
  String? splashImageUrl;
  String? loginImageUrl;

  Future<void> preload() async {
    _box = Hive.isBoxOpen(_boxName) ? Hive.box(_boxName) : await Hive.openBox(_boxName);
    splashImageUrl = _box?.get(_keySplash) as String?;
    loginImageUrl = _box?.get(_keyLogin) as String?;
  }

  Future<void> save({String? splashImageUrl, String? loginImageUrl}) async {
    final box = _box;
    if (box == null) return;
    await box.put(_keySplash, splashImageUrl);
    await box.put(_keyLogin, loginImageUrl);
    this.splashImageUrl = splashImageUrl;
    this.loginImageUrl = loginImageUrl;
  }
}
