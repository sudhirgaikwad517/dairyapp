import 'dart:async';

import 'package:dairy_app/ui/login/login_screen.dart';
import 'package:dairy_app/ui/splash/splash_screen.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_ce_flutter/hive_flutter.dart';

import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/provider/network/dio/dio_interceptors.dart';
import 'package:dairy_app/framework/repository/app_assets/app_assets_cache.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await configureDependencies();
  // Synchronously available afterwards, so the splash screen's very first
  // frame can already show an admin-uploaded image if one was cached from a
  // previous launch.
  await getIt<AppAssetsCache>().preload();

  // The Dio instance is built inside the DI module without its interceptor
  // attached (injectable module providers can't easily depend on another
  // singleton at construction time), so wire it here once DI is ready.
  getIt<Dio>().interceptors.add(getIt<DioInterceptors>());

  runApp(ProviderScope(child: const MyApp()));
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  StreamSubscription<void>? _sessionExpiredSubscription;
  bool _redirecting = false;

  @override
  void initState() {
    super.initState();
    // If the backend ever rejects our session (expired, or the session was
    // wiped server-side), drop the customer back on the login screen once
    // rather than letting every screen fail with "not logged in".
    _sessionExpiredSubscription = SessionExpiredNotifier.stream.listen((_) {
      if (_redirecting) return;
      final navigator = appNavigatorKey.currentState;
      if (navigator == null) return;

      _redirecting = true;
      navigator.pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );

      final messenger = ScaffoldMessenger.maybeOf(appNavigatorKey.currentContext!);
      messenger?.showSnackBar(
        const SnackBar(content: Text('Your session expired. Please log in again.')),
      );

      Future.delayed(const Duration(seconds: 2), () => _redirecting = false);
    });
  }

  @override
  void dispose() {
    _sessionExpiredSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      navigatorKey: appNavigatorKey,
      home: const SplashScreen(),
    );
  }
}
