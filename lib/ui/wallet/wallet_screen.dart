import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_button.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenConsumerState();
}

class _WalletScreenConsumerState extends ConsumerState<WalletScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      body: SafeArea(
        child: Column(
          children: [
            /// Header Section
            _buildHeader(context),

            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                child: Column(
                  children: [
                    /// Wallet Balance & Add Button Container
                    _buildBalanceSection(),

                    const SizedBox(height: 120),

                    /// Empty State recharge history
                    _buildEmptyRechargeHistory(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return CommonContainer(
      color: AppColors.clrWhiteFFFFFF,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.maybePop(context),
            child: const CommonIcon(
              icon: Icons.arrow_back_ios_new_rounded,
              size: 20,
              color: AppColors.clr101828,
            ),
          ),
          const SizedBox(width: 12),
          CommonText(
            data: "My Wallet",
            style: TextStyles.bold.copyWith(
              fontSize: 18,
              color: AppColors.clr101828,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBalanceSection() {
    return CommonContainer(
      padding: const EdgeInsets.all(16),
      borderRadius: BorderRadius.circular(16),
      color: AppColors.clrWhiteFFFFFF,
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _buildBalanceInfo(
                  title: "Wallet Balance",
                  amount: "0",
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildBalanceInfo(
                  title: "Reserved Balance",
                  amount: "0",
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          CommonButton(
            onTap: () {
              // Add amount logic
            },
            buttonText: "Add Amount",
            height: 52,
            width: double.infinity,
            borderRadius: BorderRadius.circular(12),
            buttonColor: AppColors.clr101828,
            showIcon: true,
            icon: Icons.add,
            buttonTextStyle: TextStyles.bold.copyWith(
              color: AppColors.clrWhiteFFFFFF,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBalanceInfo({required String title, required String amount}) {
    return CommonContainer(
      padding: const EdgeInsets.all(16),
      borderRadius: BorderRadius.circular(12),
      color: const Color(0xFFF1F4F8), // Light blue-grey background from reference
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CommonText(
            data: title,
            style: TextStyles.bold.copyWith(
              fontSize: 13,
              color: AppColors.clr101828,
            ),
          ),
          const SizedBox(height: 14),
          CommonText(
            data: "${AppConstants.currency}$amount",
            style: TextStyles.bold.copyWith(
              fontSize: 20,
              color: AppColors.clr101828,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyRechargeHistory() {
    return Column(
      children: [
        const CommonIcon(
          icon: Icons.shopping_bag_outlined,
          size: 80,
          color: AppColors.clr101828,
        ),
        const SizedBox(height: 24),
        CommonText(
          data: "No Recharge History Found",
          style: TextStyles.bold.copyWith(
            fontSize: 17,
            color: AppColors.clr101828,
          ),
        ),
        const SizedBox(height: 10),
        CommonText(
          data: "No transaction history yet. Check back after making a transaction.",
          textAlign: TextAlign.center,
          style: TextStyles.regular.copyWith(
            fontSize: 14,
            color: AppColors.clrGrey757575,
            height: 1.4,
          ),
        ),
      ],
    );
  }
}
