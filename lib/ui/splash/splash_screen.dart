import 'package:cached_network_image/cached_network_image.dart';
import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/provider/auth_provider.dart';
import 'package:dairy_app/framework/repository/app_assets/app_assets_cache.dart';
import 'package:dairy_app/framework/repository/app_assets/app_assets_repository.dart';
import 'package:dairy_app/ui/base/base_screen.dart';
import 'package:dairy_app/ui/login/login_screen.dart';
import 'package:dairy_app/ui/registration/registration_screen.dart';
import 'package:dairy_app/ui/utils/theme/assets.gen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The website's opening loader: a circle that fills with milk behind the logo.
/// The logo is the admin's "Splash Screen Image" when one is uploaded.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenConsumerState();
}

class _SplashScreenConsumerState extends ConsumerState<SplashScreen> with TickerProviderStateMixin {
  static const _brandBlue = Color(0xFF1A3D72);
  static const _circleSize = 152.0;
  static const _minDuration = Duration(milliseconds: 1400);

  late final AnimationController _fill = AnimationController(vsync: this);
  late final AnimationController _wave =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..repeat(reverse: true);

  @override
  void initState(){
    super.initState();
    _resolveStartDestination();
    // Fire-and-forget: refreshes the cached image URLs for next launch —
    // never worth delaying (or re-flashing) this launch's splash for.
    getIt<AppAssetsRepository>().refreshFromNetwork();
  }

  @override
  void dispose() {
    _fill.dispose();
    _wave.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment(-0.27, -1),
            end: Alignment(0.27, 1),
            colors: [Color(0xFFFFFBF7), Color(0xFFF3F7FC), Color(0xFFE8F0FA)],
            stops: [0, 0.55, 1],
          ),
        ),
        alignment: Alignment.center,
        child: Container(
          width: _circleSize,
          height: _circleSize,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white,
            border: Border.all(color: _brandBlue, width: 3),
            boxShadow: [
              BoxShadow(color: _brandBlue.withValues(alpha: 0.12), spreadRadius: 6),
              BoxShadow(color: _brandBlue.withValues(alpha: 0.22), blurRadius: 40, offset: const Offset(0, 18)),
            ],
          ),
          child: ClipOval(
            child: Stack(
              children: [
                Positioned.fill(child: _milk()),
                Positioned.fill(
                  child: FractionallySizedBox(widthFactor: 0.72, heightFactor: 0.72, child: _logo()),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _milk() {
    return AnimatedBuilder(
      animation: Listenable.merge([_fill, _wave]),
      builder: (context, _) {
        final height = _circleSize * _fill.value;
        final wave = Curves.easeInOut.transform(_wave.value);
        return Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: height,
              child: const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0xFFFFFEF9), Color(0xFFF8F3EA), Color(0xFFEFE6D8), Color(0xFFE5D9C8)],
                    stops: [0, 0.35, 0.7, 1],
                  ),
                ),
              ),
            ),
            // The soft crest riding on top of the milk
            if (height > 0)
              Positioned(
                left: -_circleSize * 0.15 + _circleSize * 1.3 * 0.04 * wave,
                width: _circleSize * 1.3,
                bottom: height - 9,
                height: 18,
                child: Transform.scale(
                  scaleY: 1 + 0.08 * wave,
                  child: const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: RadialGradient(
                        colors: [Color(0xF2FFFEF9), Color(0xF2FFFEF9), Color(0x00FFFEF9)],
                        stops: [0, 0.5, 1],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _logo() {
    final bundled = Image.asset(Assets.images.shrishtiLogo.path, fit: BoxFit.contain);
    final customSplashUrl = getIt<AppAssetsCache>().splashImageUrl;
    if (customSplashUrl == null || customSplashUrl.isEmpty) return bundled;

    return CachedNetworkImage(
      imageUrl: customSplashUrl,
      fit: BoxFit.contain,
      fadeInDuration: Duration.zero,
      fadeOutDuration: Duration.zero,
      placeholder: (context, _) => const SizedBox(),
      errorWidget: (context, _, __) => bundled,
    );
  }

  Future<void> _resolveStartDestination() async {
    // Fill to 88% while the session is checked, then top up once it is
    final minSplash = _fill.animateTo(0.88, duration: _minDuration);
    final status = await ref.read(authNotifierProvider.notifier).restoreSession();
    await minSplash;
    if (!mounted) return;
    await _fill.animateTo(1, duration: const Duration(milliseconds: 250));
    if (!mounted) return;

    final Widget next = switch (status) {
      SessionStatus.loggedIn => const BaseScreen(),
      SessionStatus.needsProfile => const RegistrationScreen(),
      SessionStatus.loggedOut || SessionStatus.unknown => const LoginScreen(),
    };

    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 450),
        pageBuilder: (_, __, ___) => next,
        transitionsBuilder: (_, animation, __, child) => FadeTransition(opacity: animation, child: child),
      ),
    );
  }
}
