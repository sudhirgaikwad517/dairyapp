import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class MenuScreen extends ConsumerStatefulWidget {
  const MenuScreen({super.key});

  @override
  ConsumerState<MenuScreen> createState() => _MenuScreenConsumerState();
}

class _MenuScreenConsumerState extends ConsumerState<MenuScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      body: SafeArea(
        child: Column(
          children: [
            /// Header
            _buildHeader(context),

            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  children: [
                    /// Profile Section
                    _buildProfileSection(),

                    const SizedBox(height: 12),

                    /// Vacation Mode Section
                    _buildVacationModeSection(),

                    const SizedBox(height: 20),

                    /// Product & Subscription
                    _buildGridMenuSection(
                      title: "Product & Subscription",
                      items: [
                        _MenuItemData(icon: Icons.grid_view_outlined, title: "Categories"),
                        _MenuItemData(icon: Icons.inventory_2_outlined, title: "Products"),
                        _MenuItemData(icon: Icons.bookmark_border_rounded, title: "My Subscription"),
                      ],
                    ),

                    /// Orders
                    _buildGridMenuSection(
                      title: "Orders",
                      items: [
                        _MenuItemData(icon: Icons.inventory_2_outlined, title: "My Orders"),
                        _MenuItemData(icon: Icons.upcoming_outlined, title: "Upcoming Order"),
                        _MenuItemData(icon: Icons.history_rounded, title: "Order History"),
                      ],
                    ),

                    /// Cart & Wallet
                    _buildGridMenuSection(
                      title: "Cart & Wallet",
                      items: [
                        _MenuItemData(icon: Icons.shopping_bag_outlined, title: "My Cart"),
                        _MenuItemData(icon: Icons.account_balance_wallet_outlined, title: "My Wallet"),
                        _MenuItemData(icon: Icons.history_rounded, title: "Recharge History"),
                      ],
                    ),

                    /// Billing & Invoices
                    _buildGridMenuSection(
                      title: "Billing & Invoices",
                      items: [
                        _MenuItemData(icon: Icons.receipt_long_outlined, title: "Billing History"),
                        _MenuItemData(icon: Icons.description_outlined, title: "Invoice History"),
                      ],
                    ),

                    /// Referral & Coupons
                    _buildGridMenuSection(
                      title: "Referral & Coupons",
                      items: [
                        _MenuItemData(icon: Icons.emoji_events_outlined, title: "Refer & Earn"),
                        _MenuItemData(icon: Icons.confirmation_number_outlined, title: "Coupons"),
                      ],
                    ),

                    const SizedBox(height: 12),
                    const Divider(height: 1, color: AppColors.grayEAECF0),
                    const SizedBox(height: 12),

                    /// List Menu Items
                    _buildListMenuItem(icon: Icons.notifications_none_rounded, title: "Notifications"),
                    _buildListMenuItem(icon: Icons.delivery_dining_outlined, title: "Delivery Preferences"),
                    _buildListMenuItem(icon: Icons.info_outline_rounded, title: "About Us"),
                    _buildListMenuItem(icon: Icons.headset_mic_outlined, title: "Contact Us"),
                    _buildListMenuItem(icon: Icons.feedback_outlined, title: "Complaint"),
                    _buildListMenuItem(icon: Icons.policy_outlined, title: "Policies"),

                    const SizedBox(height: 32),

                    /// Bottom Action Buttons
                    _buildBottomActionButtons(),

                    const SizedBox(height: 32),

                    /// Footer
                    _buildFooter(),

                    const SizedBox(height: 40),
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
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          GestureDetector(
            onTap: () => Navigator.maybePop(context),
            child: Row(
              children: [
                CommonText(
                  data: "Back",
                  style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
                ),
                const SizedBox(width: 4),
                const CommonIcon(
                  icon: Icons.arrow_forward_ios_rounded,
                  size: 14,
                  color: AppColors.clr101828,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileSection() {
    return CommonContainer(
      color: AppColors.clrWhiteFFFFFF,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          const CommonIcon(
            icon: Icons.account_circle,
            size: 52,
            color: AppColors.clr101828,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CommonText(
                  data: "Bhushan Gandhakte",
                  style: TextStyles.bold.copyWith(fontSize: 17, color: AppColors.clr101828),
                ),
                const SizedBox(height: 4),
                CommonContainer(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  color: const Color(0xFFCDDC39), // Lime color from image
                  borderRadius: BorderRadius.circular(4),
                  child: CommonText(
                    data: "Prepaid",
                    style: TextStyles.bold.copyWith(fontSize: 10, color: AppColors.clr101828),
                  ),
                ),
              ],
            ),
          ),
          const CommonIcon(
            icon: Icons.arrow_forward_ios_rounded,
            size: 16,
            color: AppColors.clr101828,
          ),
        ],
      ),
    );
  }

  Widget _buildVacationModeSection() {
    return CommonContainer(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      borderRadius: BorderRadius.circular(14),
      color: AppColors.clrWhiteFFFFFF,
      child: Row(
        children: [
          const CommonIcon(
            icon: Icons.beach_access_rounded,
            size: 26,
            color: AppColors.clr101828,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: CommonText(
              data: "Vacation Mode",
              style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
            ),
          ),
          CommonContainer(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.grayEAECF0),
            child: Row(
              children: [
                const CommonIcon(
                  icon: Icons.beach_access_rounded,
                  size: 16,
                  color: AppColors.clr6156F1,
                ),
                const SizedBox(width: 6),
                CommonText(
                  data: "Manage",
                  style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr101828),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGridMenuSection({required String title, required List<_MenuItemData> items}) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CommonText(
            data: title,
            style: TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clr101828),
          ),
          const SizedBox(height: 14),
          Row(
            children: items.map((item) {
              return Expanded(
                child: CommonContainer(
                  margin: EdgeInsets.only(
                    right: items.indexOf(item) == items.length - 1 ? 0 : 10,
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 22),
                  borderRadius: BorderRadius.circular(14),
                  color: AppColors.clrWhiteFFFFFF,
                  child: Column(
                    children: [
                      CommonIcon(icon: item.icon, size: 26, color: AppColors.clr101828),
                      const SizedBox(height: 12),
                      CommonText(
                        data: item.title,
                        textAlign: TextAlign.center,
                        style: TextStyles.medium.copyWith(fontSize: 12, color: AppColors.clr101828),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildListMenuItem({required IconData icon, required String title}) {
    return CommonContainer(
      color: AppColors.clrWhiteFFFFFF,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      margin: const EdgeInsets.only(bottom: 1),
      child: Row(
        children: [
          CommonIcon(icon: icon, size: 22, color: AppColors.clr101828),
          const SizedBox(width: 16),
          Expanded(
            child: CommonText(
              data: title,
              style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
            ),
          ),
          const CommonIcon(
            icon: Icons.arrow_forward_ios_rounded,
            size: 16,
            color: AppColors.clr101828,
          ),
        ],
      ),
    );
  }

  Widget _buildBottomActionButtons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: CommonContainer(
              padding: const EdgeInsets.symmetric(vertical: 16),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.clr101828),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CommonIcon(icon: Icons.delete_outline_rounded, size: 20, color: AppColors.clr101828),
                  const SizedBox(width: 8),
                  CommonText(
                    data: "Delete Account",
                    style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: CommonContainer(
              padding: const EdgeInsets.symmetric(vertical: 16),
              borderRadius: BorderRadius.circular(10),
              color: AppColors.clr101828,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CommonIcon(icon: Icons.logout_rounded, size: 20, color: AppColors.clrWhiteFFFFFF),
                  const SizedBox(width: 8),
                  CommonText(
                    data: "Logout",
                    style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clrWhiteFFFFFF),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return Column(
      children: [
        CommonText(
          data: "Sonu Ka Doodh",
          style: TextStyles.extraBold.copyWith(fontSize: 26, color: AppColors.clrD9D9D9),
        ),
        const SizedBox(height: 10),
        CommonText(
          data: "Version 1.0.0",
          style: TextStyles.medium.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
        ),
      ],
    );
  }
}

class _MenuItemData {
  final IconData icon;
  final String title;

  _MenuItemData({required this.icon, required this.title});
}
