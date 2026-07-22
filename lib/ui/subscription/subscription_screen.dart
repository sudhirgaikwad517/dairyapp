import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class SubscriptionScreen extends ConsumerStatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  ConsumerState<SubscriptionScreen> createState() => _SubscriptionScreenConsumerState();
}

class _SubscriptionScreenConsumerState extends ConsumerState<SubscriptionScreen> {
  int selectedStatusIndex = 0;
  final List<String> statusFilters = ["Active", "Paused", "Expired"];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        /// Top Bar
        _buildTopBar(context),

        Expanded(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  const SizedBox(height: 16),

                  /// Info Banner
                  _buildInfoBanner(),

                  const SizedBox(height: 24),

                  /// Status Filter Buttons
                  _buildStatusFilters(),

                  const SizedBox(height: 100),

                  /// No Subscription State
                  _buildEmptyState(),
                  
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return CommonContainer(
      color: AppColors.clrWhiteFFFFFF,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            CommonText(
              data: "My Subscription",
              style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
            ),
            const Spacer(),
            CommonContainer(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              color: AppColors.clr101828,
              borderRadius: BorderRadius.circular(8),
              child: Row(
                children: [
                  CommonText(
                    data: "Month",
                    style: TextStyles.medium.copyWith(fontSize: 14, color: AppColors.clrWhiteFFFFFF),
                  ),
                  const SizedBox(width: 4),
                  const CommonIcon(icon: Icons.arrow_drop_down, color: AppColors.clrWhiteFFFFFF, size: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoBanner() {
    return CommonContainer(
      padding: const EdgeInsets.all(16),
      borderRadius: BorderRadius.circular(12),
      color: AppColors.clrBlueE3F2FD,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CommonText(data: "ℹ️", style: TextStyle(fontSize: 18)),
          const SizedBox(width: 12),
          Expanded(
            child: CommonText(
              data: "Managing your subscriptions is easy. Pause or resume your daily essentials anytime.",
              style: TextStyles.medium.copyWith(
                fontSize: 14,
                color: AppColors.clr101828,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusFilters() {
    return Row(
      children: List.generate(statusFilters.length, (index) {
        bool isSelected = selectedStatusIndex == index;
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => selectedStatusIndex = index),
            child: CommonContainer(
              margin: EdgeInsets.only(right: index == statusFilters.length - 1 ? 0 : 8),
              padding: const EdgeInsets.symmetric(vertical: 12),
              borderRadius: BorderRadius.circular(10),
              color: isSelected ? AppColors.clr101828 : AppColors.clrWhiteFFFFFF,
              child: CommonText(
                data: statusFilters[index],
                textAlign: TextAlign.center,
                style: TextStyles.bold.copyWith(
                  fontSize: 12,
                  color: isSelected ? AppColors.clrWhiteFFFFFF : AppColors.clrGrey757575,
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildEmptyState() {
    return Column(
      children: [
        const CommonIcon(
          icon: Icons.subscriptions_outlined,
          size: 80,
          color: AppColors.clr101828,
        ),
        const SizedBox(height: 24),
        CommonText(
          data: "No subscription found!",
          style: TextStyles.bold.copyWith(fontSize: 20, color: AppColors.clr101828),
        ),
        const SizedBox(height: 12),
        CommonText(
          data: "You haven't subscribed to any products yet. Start your journey with our fresh dairy products.",
          textAlign: TextAlign.center,
          style: TextStyles.regular.copyWith(
            fontSize: 14,
            color: AppColors.clrGrey757575,
            height: 1.5,
          ),
        ),
      ],
    );
  }
}
