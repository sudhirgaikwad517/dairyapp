import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_button.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:dairy_app/ui/utils/widgets/common_text_form_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dairy_app/framework/provider/auth_provider.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        backgroundColor: AppColors.clrWhiteFFFFFF,
        appBar: AppBar(
          backgroundColor: AppColors.clrWhiteFFFFFF,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: AppColors.clr1C1C1C),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppConstants.largePadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),
              CommonText(
                data: "Create Account",
                style: TextStyles.bold.copyWith(fontSize: 28, color: AppColors.clr1C1C1C),
              ),
              const SizedBox(height: 8),
              CommonText(
                data: "Sign up to get started",
                style: TextStyles.regular.copyWith(color: AppColors.clrGrey757575, fontSize: 16),
              ),
              const SizedBox(height: 40),

              CommonTextFormField(
                controller: _nameController,
                hintText: "Full Name",
                prefixIcon: const Icon(Icons.person_outline, color: AppColors.clr6156F1),
                contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 15),
                borderRadius: 18,
                enabledBorderColor: AppColors.grayEAECF0,
                focusedBorderColor: AppColors.clr6156F1,
              ),
              const SizedBox(height: 16),

              CommonTextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                hintText: "Mobile Number",
                prefixIcon: const Icon(Icons.phone_android, color: AppColors.clr6156F1),
                contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 15),
                borderRadius: 18,
                enabledBorderColor: AppColors.grayEAECF0,
                focusedBorderColor: AppColors.clr6156F1,
              ),
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
              const SizedBox(height: 40),

              Consumer(builder: (context, ref, child) {
                final authState = ref.watch(authNotifierProvider);
                return CommonButton(
                  onTap: authState.isLoading ? () {} : () async {
                    if (_nameController.text.isEmpty || _phoneController.text.isEmpty || _passwordController.text.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("All fields are required"), behavior: SnackBarBehavior.floating),
                      );
                      return;
                    }
                    if (_phoneController.text.length < 10) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Enter a valid 10-digit mobile number"), behavior: SnackBarBehavior.floating),
                      );
                      return;
                    }
                    if (_passwordController.text.length < 6) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Password must be at least 6 characters"), behavior: SnackBarBehavior.floating),
                      );
                      return;
                    }

                    // For now, since signup logic might not exist in AuthProvider,
                    // we'll need to call the API directly or add a signup method to AuthProvider.
                    // Wait, let's see if AuthProvider has signup.
                    final success = await ref.read(authNotifierProvider.notifier).signUpWithPassword(
                      _nameController.text, 
                      _phoneController.text, 
                      _passwordController.text
                    );

                    if (success && mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Account created successfully!"), backgroundColor: Colors.green),
                      );
                      Navigator.pop(context); // Go back to login
                    } else if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(ref.read(authNotifierProvider).error ?? "Signup failed"),
                          backgroundColor: Colors.redAccent,
                        ),
                      );
                    }
                  },
                  buttonText: authState.isLoading ? "Please wait..." : "Sign Up",
                  height: 58,
                  width: double.infinity,
                  borderRadius: BorderRadius.circular(18),
                  gradient: const LinearGradient(
                    colors: [AppColors.clr6156F1, AppColors.clr6B60FE],
                  ),
                  buttonTextStyle: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clrWhiteFFFFFF),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}
