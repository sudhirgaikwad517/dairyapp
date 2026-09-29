import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/provider/local_storage/hive/hive_client.dart';
import 'package:dairy_app/framework/repository/auth/auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum SessionStatus { unknown, loggedOut, needsProfile, loggedIn }

class AuthState {
  final bool isLoading;
  final String? error;
  final String? debugOtp;
  final String? phone;
  final String? sessionId;
  final bool isNewUser;
  final SessionStatus status;
  final Map<String, dynamic>? customer;
  final List<dynamic> orders;

  AuthState({
    this.isLoading = false,
    this.error,
    this.debugOtp,
    this.phone,
    this.sessionId,
    this.isNewUser = false,
    this.status = SessionStatus.unknown,
    this.customer,
    this.orders = const [],
  });

  String get displayName => (customer?['name'] as String?)?.trim().isNotEmpty == true
      ? customer!['name'] as String
      : 'Guest';

  AuthState copyWith({
    bool? isLoading,
    String? error,
    String? debugOtp,
    String? phone,
    String? sessionId,
    bool? isNewUser,
    SessionStatus? status,
    Map<String, dynamic>? customer,
    List<dynamic>? orders,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      debugOtp: debugOtp ?? this.debugOtp,
      phone: phone ?? this.phone,
      sessionId: sessionId ?? this.sessionId,
      isNewUser: isNewUser ?? this.isNewUser,
      status: status ?? this.status,
      customer: customer ?? this.customer,
      orders: orders ?? this.orders,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    return AuthState();
  }

  HiveClient get _hive => getIt<HiveClient>();

  Future<bool> sendOtp(String phone) async {
    final repository = ref.read(authRepositoryProvider);
    state = state.copyWith(isLoading: true, error: null, phone: phone);
    final response = await repository.sendOtp(phone);

    if (response['success'] == true) {
      final debugOtp = response['data']?['debugOtp']?.toString();
      state = state.copyWith(isLoading: false, debugOtp: debugOtp);
      return true;
    } else {
      state = state.copyWith(isLoading: false, error: response['message']?.toString() ?? 'Failed to send OTP');
      return false;
    }
  }

  Future<bool> verifyOtp(String otp) async {
    if (state.phone == null) return false;

    // A stable per-device+login-attempt id; the backend maps it to the phone number for the OTP_TTL window.
    final tempSessionId = DateTime.now().millisecondsSinceEpoch.toString();

    final repository = ref.read(authRepositoryProvider);
    state = state.copyWith(isLoading: true, error: null);
    final response = await repository.verifyOtp(state.phone!, otp, tempSessionId);

    if (response['success'] == true) {
      final data = response['data'] as Map<String, dynamic>?;
      final customer = data?['customer'] as Map<String, dynamic>?;
      final isNewUser = data?['isNewUser'] == true;

      await _hive.saveSession(
        phone: state.phone!,
        sessionId: tempSessionId,
        customerId: customer?['id']?.toString(),
        code: customer?['code']?.toString(),
        name: customer?['name']?.toString(),
      );

      state = state.copyWith(
        isLoading: false,
        sessionId: tempSessionId,
        isNewUser: isNewUser,
        status: isNewUser ? SessionStatus.needsProfile : SessionStatus.loggedIn,
        customer: customer,
      );
      return true;
    } else {
      state = state.copyWith(isLoading: false, error: response['message']?.toString() ?? 'Invalid OTP');
      return false;
    }
  }

  Future<bool> loginWithPassword(String phoneOrEmail, String password) async {
    final repository = ref.read(authRepositoryProvider);
    state = state.copyWith(isLoading: true, error: null);
    
    final response = await repository.loginWithPassword(phoneOrEmail, password);

    if (response['success'] == true) {
      final data = response['data'] as Map<String, dynamic>?;
      final customer = data?['customer'] as Map<String, dynamic>?;
      final isNewUser = data?['isNewUser'] == true;
      final sessionId = data?['sessionId']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString();

      await _hive.saveSession(
        phone: customer?['phone']?.toString() ?? phoneOrEmail,
        sessionId: sessionId,
        customerId: customer?['id']?.toString(),
        code: customer?['code']?.toString(),
        name: customer?['name']?.toString(),
      );

      state = state.copyWith(
        isLoading: false,
        sessionId: sessionId,
        phone: customer?['phone']?.toString() ?? phoneOrEmail,
        isNewUser: isNewUser,
        status: isNewUser ? SessionStatus.needsProfile : SessionStatus.loggedIn,
        customer: customer,
      );
      return true;
    } else {
      state = state.copyWith(isLoading: false, error: response['message']?.toString() ?? 'Invalid Credentials');
      return false;
    }
  }

  /// Called once at splash. Checks for a session id saved on-device and
  /// confirms with the backend that it's still valid (the server keeps
  /// sessions in memory, so they don't survive a server restart).
  Future<SessionStatus> restoreSession() async {
    final sessionId = await _hive.getSessionId();
    final phone = await _hive.getPhone();
    if (sessionId == null || phone == null) {
      state = state.copyWith(status: SessionStatus.loggedOut);
      return SessionStatus.loggedOut;
    }

    final repository = ref.read(authRepositoryProvider);
    final response = await repository.me(sessionId: sessionId);

    if (response['success'] == true) {
      final data = response['data'] as Map<String, dynamic>?;
      final customer = data?['customer'] as Map<String, dynamic>?;
      final orders = (data?['orders'] as List?) ?? const [];
      final hasName = (customer?['name'] as String?)?.trim().isNotEmpty == true;

      final status = hasName ? SessionStatus.loggedIn : SessionStatus.needsProfile;
      state = state.copyWith(
        phone: phone,
        sessionId: sessionId,
        customer: customer,
        orders: orders,
        isNewUser: !hasName,
        status: status,
      );
      return status;
    }

    // Session no longer valid server-side (expired, or backend restarted) — start fresh.
    await _hive.clearSession();
    state = state.copyWith(status: SessionStatus.loggedOut);
    return SessionStatus.loggedOut;
  }

  Future<bool> completeProfile({required String name, String? email}) async {
    final repository = ref.read(authRepositoryProvider);
    state = state.copyWith(isLoading: true, error: null);
    final response = await repository.updateProfile({
      'name': name,
      if (email != null && email.isNotEmpty) 'email': email,
    });

    if (response['success'] == true) {
      final customer = response['data']?['customer'] as Map<String, dynamic>?;
      await _hive.saveName(name);
      state = state.copyWith(
        isLoading: false,
        isNewUser: false,
        status: SessionStatus.loggedIn,
        customer: customer ?? {...?state.customer, 'name': name},
      );
      return true;
    } else {
      state = state.copyWith(isLoading: false, error: response['message']?.toString() ?? 'Unable to save profile');
      return false;
    }
  }

  /// Generic partial profile update (email, GST number, address fields…) for
  /// the My Profile screen — unlike [completeProfile] this doesn't assume
  /// "name" is being set and doesn't touch [SessionStatus].
  /// Returns null on success, or an error message.
  Future<String?> updateProfileFields(Map<String, dynamic> fields) async {
    final repository = ref.read(authRepositoryProvider);
    final response = await repository.updateProfile(fields);

    if (response['success'] == true) {
      final customer = response['data']?['customer'] as Map<String, dynamic>?;
      state = state.copyWith(customer: customer ?? {...?state.customer, ...fields});
      return null;
    }
    return response['message']?.toString() ?? 'Unable to save changes';
  }

  Future<void> refreshMe() async {
    final sessionId = state.sessionId;
    if (sessionId == null) return;
    final repository = ref.read(authRepositoryProvider);
    final response = await repository.me(sessionId: sessionId);
    if (response['success'] == true) {
      final data = response['data'] as Map<String, dynamic>?;
      state = state.copyWith(
        customer: data?['customer'] as Map<String, dynamic>?,
        orders: (data?['orders'] as List?) ?? const [],
      );
    }
  }

  Future<void> logout() async {
    final repository = ref.read(authRepositoryProvider);
    await repository.logout();
    await _hive.clearSession();
    state = AuthState(status: SessionStatus.loggedOut);
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return getIt<AuthRepository>();
});

final authNotifierProvider = NotifierProvider<AuthNotifier, AuthState>(() {
  return AuthNotifier();
});
