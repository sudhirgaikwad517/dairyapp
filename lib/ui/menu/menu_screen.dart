import 'package:dairy_app/framework/controller/base/base_controller.dart';
import 'package:dairy_app/framework/controller/vacation/vacation_controller.dart';
import 'package:dairy_app/framework/provider/auth_provider.dart';
import 'package:dairy_app/ui/billing/billing_history_screen.dart';
import 'package:dairy_app/ui/billing/invoice_history_screen.dart';
import 'package:dairy_app/ui/content/content_page_screen.dart';
import 'package:dairy_app/ui/content/policies_screen.dart';
import 'package:dairy_app/ui/coupons/coupons_screen.dart';
import 'package:dairy_app/ui/login/login_screen.dart';
import 'package:dairy_app/ui/notifications/notifications_screen.dart';
import 'package:dairy_app/ui/orders/upcoming_order_screen.dart';
import 'package:dairy_app/ui/preferences/delivery_preferences_screen.dart';
import 'package:dairy_app/ui/profile/profile_screen.dart';
import 'package:dairy_app/ui/referral/refer_earn_screen.dart';
import 'package:dairy_app/ui/support/complaint_screen.dart';
import 'package:dairy_app/ui/support/contact_us_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:dairy_app/ui/vacation/vacation_screen.dart';
import 'package:dairy_app/ui/wallet/wallet_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class MenuScreen extends ConsumerStatefulWidget {
  const MenuScreen({super.key});

  @override
  ConsumerState<MenuScreen> createState() => _MenuScreenConsumerState();
}

class _MenuScreenConsumerState extends ConsumerState<MenuScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(authNotifierProvider.notifier).refreshMe());
  }

  void _openScreen(Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  /// Tab screens have no Scaffold of their own (the bottom-nav shell provides
  /// it), so switch the shell to that tab and unwind back to it rather than
  /// pushing the screen as a standalone route.
  void _openTab(String tabTitle) {
    ref.read(baseProvider).selectTabByTitle(tabTitle);
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  void _notAvailableYet(String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label is coming soon'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('You will need to verify your number again to log back in.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Stay')),
          TextButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Log out')),
        ],
      ),
    );

    if (confirmed != true) return;
    await ref.read(authNotifierProvider.notifier).logout();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

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
                        _MenuItemData(
                          icon: Icons.grid_view_outlined,
                          title: "Categories",
                          onTap: () => _openTab('Categories'),
                        ),
                        _MenuItemData(
                          icon: Icons.inventory_2_outlined,
                          title: "Products",
                          onTap: () => _openTab('Categories'),
                        ),
                        _MenuItemData(
                          icon: Icons.bookmark_border_rounded,
                          title: "My Subscription",
                          onTap: () => _openTab('Subscription'),
                        ),
                      ],
                    ),

                    /// Orders
                    _buildGridMenuSection(
                      title: "Orders",
                      items: [
                        _MenuItemData(
                          icon: Icons.inventory_2_outlined,
                          title: "My Orders",
                          onTap: () => _openTab('Orders'),
                        ),
                        _MenuItemData(
                          icon: Icons.upcoming_outlined,
                          title: "Upcoming Order",
                          onTap: () => _openScreen(const UpcomingOrderScreen()),
                        ),
                        _MenuItemData(
                          icon: Icons.history_rounded,
                          title: "Order History",
                          onTap: () => _openTab('Orders'),
                        ),
                      ],
                    ),

                    /// Cart & Wallet
                    _buildGridMenuSection(
                      title: "Cart & Wallet",
                      items: [
                        _MenuItemData(
                          icon: Icons.shopping_bag_outlined,
                          title: "My Cart",
                          onTap: () => _openTab('Cart'),
                        ),
                        _MenuItemData(
                          icon: Icons.account_balance_wallet_outlined,
                          title: "My Wallet",
                          onTap: () => _openScreen(const WalletScreen()),
                        ),
                        _MenuItemData(
                          icon: Icons.history_rounded,
                          title: "Recharge History",
                          onTap: () => _openScreen(const WalletScreen()),
                        ),
                      ],
                    ),

                    /// Billing & Invoices
                    _buildGridMenuSection(
                      title: "Billing & Invoices",
                      items: [
                        _MenuItemData(
                          icon: Icons.receipt_long_outlined,
                          title: "Billing History",
                          onTap: () => _openScreen(const BillingHistoryScreen()),
                        ),
                        _MenuItemData(
                          icon: Icons.description_outlined,
                          title: "Invoice History",
                          onTap: () => _openScreen(const InvoiceHistoryScreen()),
                        ),
                      ],
                    ),

                    /// Referral & Coupons
                    _buildGridMenuSection(
                      title: "Referral & Coupons",
                      items: [
                        _MenuItemData(
                          icon: Icons.emoji_events_outlined,
                          title: "Refer & Earn",
                          onTap: () => _openScreen(const ReferEarnScreen()),
                        ),
                        _MenuItemData(
                          icon: Icons.confirmation_number_outlined,
                          title: "Coupons",
                          onTap: () => _openScreen(const CouponsScreen()),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),
                    const Divider(height: 1, color: AppColors.grayEAECF0),
                    const SizedBox(height: 12),

                    /// List Menu Items
                    _buildListMenuItem(
                      icon: Icons.notifications_none_rounded,
                      title: "Notifications",
                      onTap: () => _openScreen(const NotificationsScreen()),
                    ),
                    _buildListMenuItem(
                      icon: Icons.tune_rounded,
                      title: "Delivery Preferences",
                      onTap: () => _openScreen(const DeliveryPreferencesScreen()),
                    ),
                    _buildListMenuItem(
                      icon: Icons.info_outline_rounded,
                      title: "About Us",
                      onTap: () => _openScreen(const ContentPageScreen(slug: 'about_us', fallbackTitle: 'About Us')),
                    ),
                    _buildListMenuItem(
                      icon: Icons.headset_mic_outlined,
                      title: "Contact Us",
                      onTap: () => _openScreen(const ContactUsScreen()),
                    ),
                    _buildListMenuItem(
                      icon: Icons.feedback_outlined,
                      title: "Complaint",
                      onTap: () => _openScreen(const ComplaintScreen()),
                    ),
                    _buildListMenuItem(
                      icon: Icons.policy_outlined,
                      title: "Policies",
                      onTap: () => _openScreen(const PoliciesScreen()),
                    ),

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
    final authState = ref.watch(authNotifierProvider);
    final customer = authState.customer;
    final name = (customer?['name'] as String?)?.trim();
    final phone = customer?['phone']?.toString() ?? '';
    final customerType = customer?['customerType']?.toString();
    final typeLabel = (customerType == null || customerType.isEmpty)
        ? null
        : customerType[0].toUpperCase() + customerType.substring(1);

    return GestureDetector(
      onTap: () => showProfileSheet(context),
      child: CommonContainer(
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
                    data: (name != null && name.isNotEmpty) ? name : 'Guest',
                    style: TextStyles.bold.copyWith(fontSize: 17, color: AppColors.clr101828),
                  ),
                  const SizedBox(height: 4),
                  if (phone.isNotEmpty)
                    CommonText(
                      data: phone,
                      style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                    ),
                  if (typeLabel != null) ...[
                    const SizedBox(height: 6),
                    CommonContainer(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      color: const Color(0xFFCDDC39),
                      borderRadius: BorderRadius.circular(4),
                      child: CommonText(
                        data: typeLabel,
                        style: TextStyles.bold.copyWith(fontSize: 10, color: AppColors.clr101828),
                      ),
                    ),
                  ],
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
          GestureDetector(
            onTap: () {
              // Ensures the badge/status is fresh by the time this screen opens.
              ref.read(vacationProvider).load();
              _openScreen(const VacationScreen());
            },
            child: CommonContainer(
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
                child: GestureDetector(
                  onTap: item.onTap,
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
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildListMenuItem({required IconData icon, required String title, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: CommonContainer(
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
      ),
    );
  }

  Widget _buildBottomActionButtons() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => _notAvailableYet('Delete Account'),
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
          ),
          const SizedBox(width: 14),
          Expanded(
            child: GestureDetector(
              onTap: _logout,
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
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return Column(
      children: [
        CommonText(
          data: AppConstants.brandName,
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
  final VoidCallback? onTap;

  _MenuItemData({required this.icon, required this.title, this.onTap});
}
