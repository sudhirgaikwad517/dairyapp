import 'package:dairy_app/ui/login/login_screen.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/assets.gen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenConsumerState();
}

class _SplashScreenConsumerState extends ConsumerState<SplashScreen> {

  @override
  void initState(){
    super.initState();
    _navigateToHome();
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.clr6B60FE,
      body: Center(
        child: Image.asset(
          Assets.images.dairyAppLogo.path,
          height: 300,
          width: 300,
        ),
      ),
    );
  }

  Future<void> _navigateToHome() async {
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => const LoginScreen(),
      ),
    );
  }
}
