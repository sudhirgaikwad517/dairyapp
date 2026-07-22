import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenConsumerState();
}

class _OrdersScreenConsumerState extends ConsumerState<OrdersScreen> {
  int selectedDateIndex = 2; // "12 Sun"
  int selectedStatusIndex = 0; // "To be delivered"

  final List<String> statusFilters = ["To be delivered", "Delivered", "Refund"];
  final List<Map<String, String>> dateList = [
    {"date": "10", "day": "Fri"},
    {"date": "11", "day": "Sat"},
    {"date": "12", "day": "Sun"},
    {"date": "13", "day": "Mon"},
    {"date": "14", "day": "Tue"},
  ];

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

                  /// Horizontal Date Selector
                  _buildDateSelector(),

                  const SizedBox(height: 24),

                  /// Status Filter Buttons
                  _buildStatusFilters(),

                  const SizedBox(height: 80),

                  /// No Order State
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
              data: "My Orders",
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
                    data: "12 Jul",
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
      color: const Color(0xFFE1F5FE), // Light sky blue
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CommonIcon(
            icon: Icons.notifications, 
            color: AppColors.clrYellowFBC02D, 
            size: 24
          ),
          const SizedBox(width: 12),
          Expanded(
            child: CommonText(
              data: "Order before 9:00PM the day after tomorrow Morning delivery.",
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

  Widget _buildDateSelector() {
    return SizedBox(
      height: 90,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: dateList.length,
        separatorBuilder: (context, index) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          bool isSelected = selectedDateIndex == index;
          return GestureDetector(
            onTap: () => setState(() => selectedDateIndex = index),
            child: CommonContainer(
              width: 70,
              borderRadius: BorderRadius.circular(12),
              color: isSelected ? AppColors.clr101828 : AppColors.clrWhiteFFFFFF,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shadowColor: isSelected ? AppColors.clrBlack000000.withOpacity(0.1) : null,
              blurRadius: isSelected ? 8 : 0,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CommonText(
                    data: dateList[index]["date"]!,
                    style: TextStyles.bold.copyWith(
                      fontSize: 18,
                      color: isSelected ? AppColors.clrWhiteFFFFFF : AppColors.clr101828,
                    ),
                  ),
                  const SizedBox(height: 6),
                  CommonText(
                    data: dateList[index]["day"]!,
                    style: TextStyles.medium.copyWith(
                      fontSize: 14,
                      color: isSelected ? AppColors.clrWhiteFFFFFF : AppColors.clrGrey757575,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
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
              border: isSelected ? null : Border.all(color: AppColors.grayEAECF0),
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
          icon: Icons.inventory_2_outlined,
          size: 80,
          color: AppColors.clr101828,
        ),
        const SizedBox(height: 24),
        CommonText(
          data: "No order found!",
          style: TextStyles.bold.copyWith(fontSize: 20, color: AppColors.clr101828),
        ),
        const SizedBox(height: 12),
        CommonText(
          data: "No orders yet for this date or status. Check back after placing an order.",
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
