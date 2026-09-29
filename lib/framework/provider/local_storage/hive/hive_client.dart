import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_ce/hive.dart';
import 'package:injectable/injectable.dart';

/// Keeps the customer's session (their OTP-login session id + a light profile
/// cache) on-device, so the app doesn't force a fresh login every launch.
/// Uses a plain dynamic Hive box — no generated adapters needed.
///
/// The box is encrypted at rest with a key held in the platform keystore
/// (via [FlutterSecureStorage]) rather than plain Hive storage — the session
/// id is a bearer credential, so it shouldn't be readable straight off disk
/// on a rooted device or from a file-system backup.
@singleton
class HiveClient {
  static const String _boxName = 'authBox';
  static const String _secureKeyName = 'hive_auth_box_key';

  static const String _keyPhone = 'phone';
  static const String _keySessionId = 'sessionId';
  static const String _keyCustomerId = 'customerId';
  static const String _keyCode = 'code';
  static const String _keyName = 'name';

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  Box? _box;

  Future<List<int>> _getOrCreateEncryptionKey() async {
    final existing = await _secureStorage.read(key: _secureKeyName);
    if (existing != null) {
      return existing.split(',').map(int.parse).toList();
    }
    final key = Hive.generateSecureKey();
    await _secureStorage.write(key: _secureKeyName, value: key.join(','));
    return key;
  }

  Future<Box> _getBox() async {
    if (_box != null) return _box!;
    if (Hive.isBoxOpen(_boxName)) {
      _box = Hive.box(_boxName);
      return _box!;
    }

    final key = await _getOrCreateEncryptionKey();
    final cipher = HiveAesCipher(key);
    try {
      _box = await Hive.openBox(_boxName, encryptionCipher: cipher);
    } catch (_) {
      // Pre-existing unencrypted box from before this box was encrypted (or
      // any other corruption) — there's nothing in it worth preserving over
      // a fresh login, so start clean rather than leaving the app unable to
      // open its own session storage.
      await Hive.deleteBoxFromDisk(_boxName);
      _box = await Hive.openBox(_boxName, encryptionCipher: cipher);
    }
    return _box!;
  }

  Future<void> saveSession({
    required String phone,
    required String sessionId,
    String? customerId,
    String? code,
    String? name,
  }) async {
    final box = await _getBox();
    await box.putAll({
      _keyPhone: phone,
      _keySessionId: sessionId,
      if (customerId != null) _keyCustomerId: customerId,
      if (code != null) _keyCode: code,
      if (name != null) _keyName: name,
    });
  }

  Future<void> saveName(String name) async {
    final box = await _getBox();
    await box.put(_keyName, name);
  }

  Future<String?> getSessionId() async {
    final box = await _getBox();
    return box.get(_keySessionId) as String?;
  }

  Future<String?> getPhone() async {
    final box = await _getBox();
    return box.get(_keyPhone) as String?;
  }

  Future<String?> getName() async {
    final box = await _getBox();
    return box.get(_keyName) as String?;
  }

  Future<bool> hasSession() async {
    final sessionId = await getSessionId();
    return sessionId != null && sessionId.isNotEmpty;
  }

  Future<void> clearSession() async {
    final box = await _getBox();
    await box.clear();
  }
}
