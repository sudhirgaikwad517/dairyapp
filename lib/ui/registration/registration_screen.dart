import 'package:dairy_app/framework/provider/auth_provider.dart';
import 'package:dairy_app/ui/base/base_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/app_constants/app_regex.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_button.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:dairy_app/ui/utils/widgets/common_text_form_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Shown once, right after OTP verification, only for a customer who has
/// never completed their profile (no name on file yet).
class RegistrationScreen extends ConsumerStatefulWidget {
  const RegistrationScreen({super.key});

  @override
  ConsumerState<RegistrationScreen> createState() => _RegistrationScreenConsumerState();
}

class _RegistrationScreenConsumerState extends ConsumerState<RegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    FocusScope.of(context).unfocus();

    final success = await ref.read(authNotifierProvider.notifier).completeProfile(
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
        );

    if (!mounted) return;
    if (success) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const BaseScreen()),
        (route) => false,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ref.read(authNotifierProvider).error ?? 'Unable to save your details'),
          behavior: SnackBarBehavior.floating,
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        backgroundColor: AppColors.clr6156F1,
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                child: Column(
                  children: [
                    CommonContainer(
                      height: 70,
                      width: 70,
                      borderRadius: BorderRadius.circular(35),
                      color: AppColors.clrWhiteFFFFFF,
                      alignment: Alignment.center,
                      child: const CommonIcon(
                        icon: Icons.person_outline_rounded,
                        color: AppColors.clr6156F1,
                        size: 34,
                      ),
                    ),
                    const SizedBox(height: 16),
                    CommonText(
                      data: 'Tell us about you',
                      textAlign: TextAlign.center,
                      style: TextStyles.bold.copyWith(color: AppColors.clrWhiteFFFFFF, fontSize: 26),
                    ),
                    const SizedBox(height: 8),
                    CommonText(
                      data: 'Just one last step before you start ordering',
                      textAlign: TextAlign.center,
                      style: TextStyles.regular.copyWith(
                        color: AppColors.clrWhiteFFFFFF.withValues(alpha: 0.85),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Expanded(
                child: CommonContainer(
                  width: double.infinity,
                  color: AppColors.clrWhiteFFFFFF,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(40),
                    topRight: Radius.circular(40),
                  ),
                  padding: const EdgeInsets.all(AppConstants.largePadding),
                  child: SingleChildScrollView(
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 10),
                          CommonText(
                            data: 'Full Name',
                            style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr1C1C1C),
                          ),
                          const SizedBox(height: 8),
                          CommonTextFormField(
                            controller: _nameController,
                            hintText: 'e.g. Priya Sharma',
                            keyboardType: TextInputType.name,
                            borderRadius: 14,
                            enabledBorderColor: AppColors.grayEAECF0,
                            focusedBorderColor: AppColors.clr6156F1,
                            contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) return 'Name is required';
                              if (!AppRegex.name.hasMatch(value.trim())) return 'Enter a valid name';
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),
                          CommonText(
                            data: 'Email (optional)',
                            style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr1C1C1C),
                          ),
                          const SizedBox(height: 8),
                          CommonTextFormField(
                            controller: _emailController,
                            hintText: 'you@example.com',
                            keyboardType: TextInputType.emailAddress,
                            borderRadius: 14,
                            enabledBorderColor: AppColors.grayEAECF0,
                            focusedBorderColor: AppColors.clr6156F1,
                            contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) return null;
                              if (!AppRegex.email.hasMatch(value.trim())) return 'Enter a valid email';
                              return null;
                            },
                          ),
                          const SizedBox(height: 36),
                          CommonButton(
                            onTap: authState.isLoading ? () {} : _submit,
                            buttonText: authState.isLoading ? 'Please wait...' : 'Continue',
                            height: 56,
                            width: double.infinity,
                            borderRadius: BorderRadius.circular(18),
                            gradient: const LinearGradient(
                              colors: [AppColors.clr6156F1, AppColors.clr6B60FE],
                            ),
                            buttonTextStyle: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clrWhiteFFFFFF),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
