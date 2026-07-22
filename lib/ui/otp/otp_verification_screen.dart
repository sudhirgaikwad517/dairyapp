import 'package:dairy_app/framework/controller/otp/otp_verification_controller.dart';
import 'package:dairy_app/ui/base/base_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_button.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_dialog.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pinput/pinput.dart';

class OtpVerificationScreen extends ConsumerStatefulWidget {
  const OtpVerificationScreen({super.key});

  @override
  ConsumerState<OtpVerificationScreen> createState() => _OtpVerificationScreenConsumerState();
}

class _OtpVerificationScreenConsumerState extends ConsumerState<OtpVerificationScreen> {
  @override
  Widget build(BuildContext context) {
    final watchOtpVerificationProvider = ref.watch(otpVerificationProvider);
    final size = MediaQuery.of(context).size;

    final defaultPinTheme = PinTheme(
      width: 70,
      height: 70,
      textStyle: TextStyles.bold.copyWith(
        fontSize: 24,
        color: AppColors.clr1C1C1C,
      ),
      decoration: BoxDecoration(
        color: AppColors.clrD7D7FF.withValues(alpha: .45),
        borderRadius: BorderRadius.circular(18),
      ),
    );

    return GestureDetector(
      onTap: () {
        FocusScope.of(context).unfocus();
      },
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        backgroundColor: AppColors.clr6156F1,
        body: SafeArea(
          child: Column(
            children: [
              /// Purple Header Section
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                child: Row(
                  children: [
                    InkWell(
                      onTap: () => Navigator.pop(context),
                      child: CommonContainer(
                        height: 45,
                        width: 45,
                        color: AppColors.clrWhiteFFFFFF,
                        borderRadius: BorderRadius.circular(22.5),
                        alignment: Alignment.center,
                        child: const CommonIcon(
                          icon: Icons.arrow_back,
                          color: AppColors.clrBlack000000,
                          size: 24,
                        ),
                      ),
                    ),
                    Expanded(
                      child: CommonText(
                        data: "Verify your\nPhone Number",
                        textAlign: TextAlign.center,
                        style: TextStyles.bold.copyWith(
                          color: AppColors.clrWhiteFFFFFF,
                          fontSize: 28,
                        ),
                      ),
                    ),
                    const SizedBox(width: 45), // To balance the back button
                  ],
                ),
              ),

              const SizedBox(height: 40),

              /// White Form Card
              Expanded(
                child: CommonContainer(
                  width: double.infinity,
                  color: AppColors.clrWhiteFFFFFF,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(40),
                    topRight: Radius.circular(40),
                  ),
                  padding: const EdgeInsets.all(AppConstants.largePadding),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return SingleChildScrollView(
                        child: ConstrainedBox(
                          constraints: BoxConstraints(
                            minHeight: constraints.maxHeight,
                          ),
                          child: IntrinsicHeight(
                            child: Column(
                              children: [
                                const SizedBox(height: 25),
                                CommonText(
                                  data: "Enter your OTP code here",
                                  style: TextStyles.regular.copyWith(
                                    color: AppColors.clrGrey757575,
                                    fontSize: 18,
                                  ),
                                ),
                                const SizedBox(height: 45),

                                /// OTP Input
                                Pinput(
                                  autofocus: true,
                                  controller: watchOtpVerificationProvider.otpController,
                                  length: 4,
                                  defaultPinTheme: defaultPinTheme,
                                  focusedPinTheme: defaultPinTheme.copyDecorationWith(
                                    border: Border.all(
                                      color: AppColors.clr6156F1,
                                      width: 2,
                                    ),
                                  ),
                                  submittedPinTheme: defaultPinTheme.copyDecorationWith(
                                    color: AppColors.clr6156F1,
                                    border: Border.all(color: AppColors.clr6156F1),
                                  ),
                                ),

                                const SizedBox(height: 60),

                                CommonText(
                                  data: "Didn't you receive any code?",
                                  style: TextStyles.regular.copyWith(
                                    color: AppColors.clrGrey757575,
                                    fontSize: 18,
                                  ),
                                ),
                                const SizedBox(height: 10),

                                /// Resend Button
                                GestureDetector(
                                  onTap: () {
                                    // Handle resend
                                  },
                                  child: CommonText(
                                    data: "RESEND NEW CODE",
                                    style: TextStyles.bold.copyWith(
                                      color: AppColors.clr6156F1,
                                      fontSize: 18,
                                    ),
                                  ),
                                ),

                                const Spacer(),

                                /// Verify Button
                                CommonButton(
                                  onTap: () {
                                    CommonDialog.showConfirmDialog(
                                      context,
                                      body: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const SizedBox(height: 10),
                                          CommonContainer(
                                            height: 85,
                                            width: 85,
                                            borderRadius: BorderRadius.circular(42.5),
                                            color: AppColors.clr6156F1.withValues(alpha: 0.1),
                                            alignment: Alignment.center,
                                            child: const CommonIcon(
                                              icon: Icons.check,
                                              color: AppColors.clr6156F1,
                                              size: 45,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(height: 24),
                                          CommonText(
                                            data: "Verified",
                                            style: TextStyles.bold.copyWith(
                                              fontSize: 24,
                                              color: AppColors.clr6156F1,
                                            ),
                                          ),
                                          const SizedBox(height: 12),
                                          CommonText(
                                            data: "You have successfully verified\nthe account.",
                                            textAlign: TextAlign.center,
                                            style: TextStyles.regular.copyWith(
                                              fontSize: 16,
                                              color: AppColors.clrGrey757575,
                                            ),
                                          ),
                                          const SizedBox(height: 32),
                                          CommonButton(
                                            onTap: () {
                                              Navigator.pushAndRemoveUntil(
                                                context,
                                                MaterialPageRoute(builder: (context) => const BaseScreen()),
                                                ModalRoute.withName('/'),
                                              );
                                            },
                                            buttonText: "Done",
                                            height: 54,
                                            width: double.infinity,
                                            borderRadius: BorderRadius.circular(15),
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
                                          ),
                                          const SizedBox(height: 10),
                                        ],
                                      ),
                                    );
                                  },
                                  buttonText: "Verify",
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
                                    fontSize: 20,
                                    color: AppColors.clrWhiteFFFFFF,
                                  ),
                                ),
                                const SizedBox(height: 20),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}
