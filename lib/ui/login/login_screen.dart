import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/app_assets/app_assets_cache.dart';
import 'package:dairy_app/ui/base/base_screen.dart';
import 'package:dairy_app/ui/otp/otp_verification_screen.dart';
import 'package:dairy_app/ui/registration/registration_screen.dart';
import 'package:dairy_app/ui/login/signup_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/assets.gen.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_asset_image.dart';
import 'package:dairy_app/ui/utils/widgets/common_button.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:dairy_app/ui/utils/widgets/common_text_form_field.dart';
import 'package:dairy_app/ui/utils/widgets/remote_or_asset_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dairy_app/framework/provider/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenConsumerState();
}

class _LoginScreenConsumerState extends ConsumerState<LoginScreen> {

  final GlobalKey _loginButtonKey = GlobalKey();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  // Customers log in with mobile number and password; OTP login is not offered
  final bool _isPasswordLogin = true;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return GestureDetector(
      onTap: (){
        FocusScope.of(context).unfocus();
      },
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        backgroundColor: AppColors.clrWhiteFFFFFF,
        body: SingleChildScrollView(
          child: Column(
            children: [
              /// Top Image Section, with the form's rounded top and the logo laid over its bottom edge.
              /// Real layout (no Transform offsets), so no empty gap is left under the logo and the
              /// image leaves room for the whole form on a phone screen.
              Stack(
                clipBehavior: Clip.none,
                children: [
                  RemoteOrAssetImage(
                    remoteUrl: getIt<AppAssetsCache>().loginImageUrl,
                    assetPath: Assets.images.loginPageBackground.path,
                    height: (size.height * 0.34).clamp(190.0, 320.0),
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: -1,
                    child: Container(
                      height: 36,
                      decoration: const BoxDecoration(
                        color: AppColors.clrWhiteFFFFFF,
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(35),
                          topRight: Radius.circular(35),
                        ),
                      ),
                    ),
                  ),
                  /// Logo/Icon Container, centred on the form's top edge
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: Center(
                      child: CommonContainer(
                        height: 70,
                        width: 70,
                        borderRadius: BorderRadius.circular(35),
                        gradient: const LinearGradient(
                          colors: [
                            AppColors.clr6156F1,
                            AppColors.clr6B60FE,
                          ],
                        ),
                        blurRadius: 12,
                        shadowColor: AppColors.clrBlack000000.withValues(alpha: 0.12),
                        alignment: Alignment.center,
                        child:  CommonAssetImage(
                          path: Assets.images.loginPageLogo.path,

                        ),
                      ),
                    ),
                  ),
                ],
              ),

              /// Login Form Section
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppConstants.largePadding,
                  20,
                  AppConstants.largePadding,
                  AppConstants.largePadding,
                ),
                child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      /// Title
                      CommonText(
                        data: "Login with Mobile Number",
                        textAlign: TextAlign.center,
                        style: TextStyles.bold.copyWith(
                          fontSize: 24,
                          color: AppColors.clr1C1C1C,
                        ),
                      ),
                      const SizedBox(height: 12),

                      /// Subtitle
                      CommonText(
                        data: _isPasswordLogin 
                            ? "Enter your credentials to login" 
                            : "We will send a confirmation code\n to your phone",
                        textAlign: TextAlign.center,
                        style: TextStyles.regular.copyWith(
                          color: AppColors.clrGrey757575,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 28),

                      /// Mobile Number Input
                      CommonTextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        hintText: "9876543210",
                        prefixIcon: SizedBox(
                          width: 100,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.phone,
                                color: AppColors.clr6156F1,
                                size: 22,
                              ),
                              const SizedBox(width: 10),
                              const Text(
                                "+91",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                width: 1,
                                height: 20,
                                color: Colors.grey,
                              ),
                            ],
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 15),
                        borderRadius: 18,
                        enabledBorderColor: AppColors.grayEAECF0,
                        focusedBorderColor: AppColors.clr6156F1,
                        onTap: (){
                          Future.delayed(const Duration(milliseconds: 300), () {
                            Scrollable.ensureVisible(
                              _loginButtonKey.currentContext!,
                              duration: const Duration(milliseconds: 300),
                              curve: Curves.easeInOut,
                            );
                          });
                        },
                      ),
                      
                      if (_isPasswordLogin) ...[
                        const SizedBox(height: 16),
                        CommonTextFormField(
                          controller: _passwordController,
                          hintText: "Password",
                          obscureText: _obscurePassword,
                          prefixIcon: const Icon(Icons.lock_outline, color: AppColors.clr6156F1),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_off : Icons.visibility,
                              color: AppColors.clrGrey757575,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscurePassword = !_obscurePassword;
                              });
                            },
                          ),
                          contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 15),
                          borderRadius: 18,
                          enabledBorderColor: AppColors.grayEAECF0,
                          focusedBorderColor: AppColors.clr6156F1,
                        ),
                      ],
                      const SizedBox(height: 32),

                      /// Login Button
                      Consumer(builder: (context, ref, child) {
                        final authState = ref.watch(authNotifierProvider);
                        return CommonButton(
                          onTap: authState.isLoading ? () {} : () async {
                            if (_isPasswordLogin) {
                              if (_phoneController.text.isEmpty || _passwordController.text.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: const Text("Enter phone and password"),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                                return;
                              }
                              final success = await ref.read(authNotifierProvider.notifier).loginWithPassword(_phoneController.text, _passwordController.text);
                              if (success && mounted) {
                                // Logged in: open the app (or the profile form for a new customer), as after OTP
                                final isNewUser = ref.read(authNotifierProvider).isNewUser;
                                Navigator.pushAndRemoveUntil(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => isNewUser ? const RegistrationScreen() : const BaseScreen(),
                                  ),
                                  (route) => false,
                                );
                              } else if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(ref.read(authNotifierProvider).error ?? "Failed to login"),
                                    behavior: SnackBarBehavior.floating,
                                    backgroundColor: Colors.redAccent,
                                  ),
                                );
                              }
                            } else {
                              if (_phoneController.text.length < 10) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: const Text("Enter a valid 10-digit number"),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                                return;
                              }
                              final success = await ref.read(authNotifierProvider.notifier).sendOtp(_phoneController.text);
                              if (success && mounted) {
                                Navigator.of(context).push(MaterialPageRoute(builder: (context)=> OtpVerificationScreen()));
                              } else if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(ref.read(authNotifierProvider).error ?? "Failed to send OTP"),
                                    behavior: SnackBarBehavior.floating,
                                    backgroundColor: Colors.redAccent,
                                  ),
                                );
                              }
                            }
                          },
                          key: _loginButtonKey,
                          buttonText: authState.isLoading ? "Please wait..." : AppConstants.strLogin,
                          height: 58,
                          width: double.infinity,
                          borderRadius: BorderRadius.circular(18),
                          gradient: const LinearGradient(
                            colors: [
                              AppColors.clr6156F1,
                              AppColors.clr6B60FE,
                            ],
                          ),
                          buttonTextStyle: TextStyles.bold.copyWith(
                            fontSize: 18,
                            color: AppColors.clrWhiteFFFFFF,
                          ),
                        );
                      }),
                      
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            "Don't have an account? ",
                            style: TextStyles.regular.copyWith(
                              color: AppColors.clrGrey757575,
                              fontSize: 16,
                            ),
                          ),
                          GestureDetector(
                            onTap: () {
                              Navigator.of(context).push(MaterialPageRoute(builder: (context) => const SignupScreen()));
                            },
                            child: Text(
                              "Sign Up",
                              style: TextStyles.semiBold.copyWith(
                                color: AppColors.clr6156F1,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                    ],
                  ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
