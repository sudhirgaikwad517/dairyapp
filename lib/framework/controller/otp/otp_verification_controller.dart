import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

final otpVerificationProvider = ChangeNotifierProvider.autoDispose((ref) => OtpVerificationController());

class OtpVerificationController extends ChangeNotifier {
  final otpController = TextEditingController();

  @override
  void dispose() {
    otpController.dispose();
    super.dispose();
  }
}
