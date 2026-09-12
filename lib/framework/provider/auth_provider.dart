import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/auth/auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AuthState {
  final bool isLoading;
  final String? error;
  final String? debugOtp;
  final String? phone;
  final String? sessionId;
  
  AuthState({
    this.isLoading = false,
    this.error,
    this.debugOtp,
    this.phone,
    this.sessionId,
  });
  
  AuthState copyWith({
    bool? isLoading,
    String? error,
    String? debugOtp,
    String? phone,
    String? sessionId,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      debugOtp: debugOtp ?? this.debugOtp,
      phone: phone ?? this.phone,
      sessionId: sessionId ?? this.sessionId,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    return AuthState();
  }

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
    
    // Generate a temporary session ID for this login attempt
    final tempSessionId = DateTime.now().millisecondsSinceEpoch.toString();
    
    final repository = ref.read(authRepositoryProvider);
    state = state.copyWith(isLoading: true, error: null);
    final response = await repository.verifyOtp(state.phone!, otp, tempSessionId);
    
    if (response['success'] == true) {
      state = state.copyWith(isLoading: false, sessionId: tempSessionId);
      return true;
    } else {
      state = state.copyWith(isLoading: false, error: response['message']?.toString() ?? 'Invalid OTP');
      return false;
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return getIt<AuthRepository>();
});

final authNotifierProvider = NotifierProvider<AuthNotifier, AuthState>(() {
  return AuthNotifier();
});
