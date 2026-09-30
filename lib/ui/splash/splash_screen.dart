import 'package:cached_network_image/cached_network_image.dart';
import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/provider/auth_provider.dart';
import 'package:dairy_app/framework/repository/app_assets/app_assets_cache.dart';
import 'package:dairy_app/framework/repository/app_assets/app_assets_repository.dart';
import 'package:dairy_app/ui/base/base_screen.dart';
import 'package:dairy_app/ui/login/login_screen.dart';
import 'package:dairy_app/ui/registration/registration_screen.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/assets.gen.dart';
import 'package:dairy_app/ui/utils/widgets/remote_or_asset_image.dart';
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
    _resolveStartDestination();
    // Fire-and-forget: refreshes the cached image URLs for next launch —
    // never worth delaying (or re-flashing) this launch's splash for.
    getIt<AppAssetsRepository>().refreshFromNetwork();
  }
  @override
  Widget build(BuildContext context) {
    final customSplashUrl = getIt<AppAssetsCache>().splashImageUrl;

    return Scaffold(
      backgroundColor: customSplashUrl != null && customSplashUrl.isNotEmpty
          ? Colors.white
          : AppColors.clr6B60FE,
      body: customSplashUrl != null && customSplashUrl.isNotEmpty
          ? SizedBox.expand(
              child: CachedNetworkImage(
                imageUrl: customSplashUrl,
                fit: BoxFit.cover,
                fadeInDuration: Duration.zero,
                fadeOutDuration: Duration.zero,
                placeholder: (context, _) => const SizedBox(),
                errorWidget: (context, _, __) => Center(
                  child: Image.asset(
                    Assets.images.dairyAppLogo.path,
                    height: 300,
                    width: 300,
                  ),
                ),
              ),
            )
          : Center(
              child: Image.asset(
                Assets.images.dairyAppLogo.path,
                height: 300,
                width: 300,
              ),
            ),
    );
  }

  Future<void> _resolveStartDestination() async {
    final minSplash = Future.delayed(const Duration(seconds: 2));
    final status = await ref.read(authNotifierProvider.notifier).restoreSession();
    await minSplash;
    if (!mounted) return;

    final Widget next = switch (status) {
      SessionStatus.loggedIn => const BaseScreen(),
      SessionStatus.needsProfile => const RegistrationScreen(),
      SessionStatus.loggedOut || SessionStatus.unknown => const LoginScreen(),
    };

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => next),
    );
  }
}
