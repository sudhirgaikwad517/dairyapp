import 'package:dairy_app/framework/provider/auth_provider.dart';
import 'package:dairy_app/framework/controller/wallet/wallet_controller.dart';
import 'package:dairy_app/framework/controller/vacation/vacation_controller.dart';
import 'package:dairy_app/ui/address/address_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:dairy_app/ui/vacation/vacation_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Opens the "My Profile" sheet — a near-fullscreen draggable sheet over
/// whatever screen the customer tapped their profile row from.
Future<void> showProfileSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const ProfileSheet(),
  );
}

class ProfileSheet extends ConsumerStatefulWidget {
  const ProfileSheet({super.key});

  @override
  ConsumerState<ProfileSheet> createState() => _ProfileSheetState();
}

class _ProfileSheetState extends ConsumerState<ProfileSheet> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(authNotifierProvider.notifier).refreshMe();
      ref.read(walletProvider).loadWallet();
    });
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1)).toUpperCase();
  }

  Future<void> _editField({
    required String title,
    required String hint,
    required String initialValue,
    required TextInputType keyboardType,
    required String field,
  }) async {
    final controller = TextEditingController(text: initialValue);
    final result = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          keyboardType: keyboardType,
          autofocus: true,
          decoration: InputDecoration(hintText: hint),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (result == null) return;
    final error = await ref.read(authNotifierProvider.notifier).updateProfileFields({field: result});
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(error ?? 'Saved'),
        backgroundColor: error == null ? AppColors.clr34C759 : AppColors.clrRedD32F2F,
      ),
    );
  }

  void _copyReferralCode(String code) {
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Referral code copied'), duration: Duration(seconds: 1)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authNotifierProvider);
    final wallet = ref.watch(walletProvider);
    final customer = auth.customer ?? const {};

    final name = (customer['name'] as String?)?.trim();
    final displayName = (name != null && name.isNotEmpty) ? name : 'Guest';
    final phone = customer['phone']?.toString() ?? '';
    final email = customer['email']?.toString();
    final gstNumber = customer['gstNumber']?.toString();
    final referralCode = customer['referralCode']?.toString();
    final address = customer['address']?.toString();
    final hubName = customer['hubName']?.toString();
    final area = customer['area']?.toString();
    final deliveryBoyName = customer['deliveryBoyName']?.toString();
    final isVerified = customer['isVerified'] == true;

    return DraggableScrollableSheet(
      initialChildSize: 0.92,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return CommonContainer(
          color: AppColors.clrF7F7F7,
          borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                height: 4,
                width: 44,
                decoration: BoxDecoration(color: AppColors.grayEAECF0, borderRadius: BorderRadius.circular(2)),
              ),
              const SizedBox(height: 14),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: const CommonIcon(icon: Icons.arrow_back_rounded, color: AppColors.clr101828),
                    ),
                    const SizedBox(width: 12),
                    CommonText(
                      data: "My Profile",
                      style: TextStyles.bold.copyWith(fontSize: 20, color: AppColors.clr101828),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                  children: [
                    _buildProfileCard(displayName, isVerified),
                    const SizedBox(height: 12),
                    _buildVacationRow(),
                    const SizedBox(height: 20),
                    _sectionTitle("Referral Code"),
                    const SizedBox(height: 10),
                    _buildReferralCode(referralCode),
                    const SizedBox(height: 20),
                    _sectionTitle("Registered details"),
                    const SizedBox(height: 10),
                    _buildInfoRow(
                      label: "Email Address",
                      value: (email != null && email.isNotEmpty) ? email : 'No data found',
                      onTap: () => _editField(
                        title: 'Email Address',
                        hint: 'name@example.com',
                        initialValue: email ?? '',
                        keyboardType: TextInputType.emailAddress,
                        field: 'email',
                      ),
                    ),
                    const SizedBox(height: 10),
                    _buildInfoRow(
                      label: "Mobile Number",
                      labelSuffix: "(Not editable)",
                      value: phone,
                    ),
                    const SizedBox(height: 10),
                    _buildInfoRow(
                      label: "GST/VAT Details",
                      value: (gstNumber != null && gstNumber.isNotEmpty) ? gstNumber : 'No data found',
                      actionLabel: (gstNumber == null || gstNumber.isEmpty) ? 'Add' : 'Edit',
                      onTap: () => _editField(
                        title: 'GST/VAT Details',
                        hint: 'GST or VAT number',
                        initialValue: gstNumber ?? '',
                        keyboardType: TextInputType.text,
                        field: 'gstNumber',
                      ),
                    ),
                    const SizedBox(height: 20),
                    _sectionTitle("Address Details"),
                    const SizedBox(height: 10),
                    _buildInfoRow(
                      label: "Registered Address",
                      value: (address != null && address.isNotEmpty) ? address : 'No data found',
                      actionLabel: 'Change Address',
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const AddressScreen()),
                      ),
                    ),
                    const SizedBox(height: 10),
                    _buildInfoRow(label: "Hub Name", value: hubName?.isNotEmpty == true ? hubName! : 'Not assigned yet'),
                    const SizedBox(height: 10),
                    _buildInfoRow(label: "Area Name", value: area?.isNotEmpty == true ? area! : 'Not assigned yet'),
                    const SizedBox(height: 20),
                    _buildIconValueCard(
                      icon: Icons.account_balance_wallet_outlined,
                      label: "Wallet Balance",
                      value: "${AppConstants.currency}${wallet.balance.toStringAsFixed(0)}",
                    ),
                    const SizedBox(height: 12),
                    _buildIconValueCard(
                      icon: Icons.credit_card_outlined,
                      label: "Reserved Balance",
                      value: "${AppConstants.currency}${wallet.reservedBalance.toStringAsFixed(0)}",
                    ),
                    const SizedBox(height: 12),
                    _buildIconValueCard(
                      icon: Icons.person_outline_rounded,
                      label: "Delivery Boy",
                      value: deliveryBoyName?.isNotEmpty == true ? deliveryBoyName! : 'Not assigned yet',
                      alignValueEnd: true,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _sectionTitle(String title) {
    return CommonText(data: title, style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828));
  }

  Widget _buildProfileCard(String name, bool isVerified) {
    return CommonContainer(
      padding: const EdgeInsets.all(16),
      borderRadius: BorderRadius.circular(16),
      color: AppColors.clrWhiteFFFFFF,
      child: Row(
        children: [
          CommonContainer(
            height: 56,
            width: 56,
            borderRadius: BorderRadius.circular(28),
            color: AppColors.clr101828,
            alignment: Alignment.center,
            child: CommonText(
              data: _initials(name),
              style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clrWhiteFFFFFF),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CommonText(data: name, style: TextStyles.bold.copyWith(fontSize: 17, color: AppColors.clr101828)),
                if (isVerified) ...[
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const CommonIcon(icon: Icons.verified_rounded, size: 15, color: AppColors.clr6156F1),
                      const SizedBox(width: 5),
                      CommonText(
                        data: "Verified by ${AppConstants.brandName}",
                        style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVacationRow() {
    return CommonContainer(
      padding: const EdgeInsets.all(16),
      borderRadius: BorderRadius.circular(14),
      color: AppColors.clrWhiteFFFFFF,
      child: Row(
        children: [
          const CommonIcon(icon: Icons.beach_access_rounded, size: 24, color: AppColors.clr101828),
          const SizedBox(width: 12),
          Expanded(
            child: CommonText(
              data: "Vacation Mode",
              style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
            ),
          ),
          OutlinedButton.icon(
            onPressed: () {
              // Ensures the badge/status is fresh by the time this screen opens.
              ref.read(vacationProvider).load();
              Navigator.push(context, MaterialPageRoute(builder: (_) => const VacationScreen()));
            },
            icon: const CommonIcon(icon: Icons.beach_access_rounded, size: 16, color: AppColors.clr6156F1),
            label: Text('Manage', style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr101828)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.grayEAECF0),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReferralCode(String? code) {
    final hasCode = code != null && code.isNotEmpty;
    return Row(
      children: [
        Expanded(
          child: CommonContainer(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            borderRadius: BorderRadius.circular(14),
            color: AppColors.clrWhiteFFFFFF,
            child: CommonText(
              data: hasCode ? code : 'Generating…',
              style: TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clrGrey757575, letterSpacing: 1.2),
            ),
          ),
        ),
        const SizedBox(width: 12),
        GestureDetector(
          onTap: hasCode ? () => _copyReferralCode(code) : null,
          child: CommonContainer(
            height: 52,
            width: 52,
            borderRadius: BorderRadius.circular(14),
            color: AppColors.clr101828,
            alignment: Alignment.center,
            child: const CommonIcon(icon: Icons.copy_rounded, size: 20, color: AppColors.clrWhiteFFFFFF),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow({
    required String label,
    required String value,
    String? labelSuffix,
    String? actionLabel,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: CommonContainer(
        padding: const EdgeInsets.all(16),
        borderRadius: BorderRadius.circular(14),
        color: AppColors.clrWhiteFFFFFF,
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CommonText(data: label, style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575)),
                      if (labelSuffix != null) ...[
                        const SizedBox(width: 4),
                        CommonText(
                          data: labelSuffix,
                          style: TextStyles.regular.copyWith(fontSize: 11, color: AppColors.clrRedE57373),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 6),
                  CommonText(
                    data: value,
                    style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
                  ),
                ],
              ),
            ),
            if (actionLabel != null)
              CommonContainer(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                borderRadius: BorderRadius.circular(10),
                color: AppColors.clrBlueE3F2FD,
                child: CommonText(
                  data: actionLabel,
                  style: TextStyles.bold.copyWith(fontSize: 12, color: AppColors.clrBlue1E88E5),
                ),
              )
            // A row with no explicit action label (Email) is still tappable —
            // give it a subtle pencil so that isn't invisible to the customer.
            else if (onTap != null)
              const CommonIcon(icon: Icons.edit_outlined, size: 18, color: AppColors.clrGrey757575),
          ],
        ),
      ),
    );
  }

  Widget _buildIconValueCard({
    required IconData icon,
    required String label,
    required String value,
    bool alignValueEnd = false,
  }) {
    return CommonContainer(
      padding: const EdgeInsets.all(18),
      borderRadius: BorderRadius.circular(16),
      color: AppColors.clrWhiteFFFFFF,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CommonContainer(
            height: 44,
            width: 44,
            borderRadius: BorderRadius.circular(22),
            color: AppColors.clrF7F7F7,
            alignment: Alignment.center,
            child: CommonIcon(icon: icon, size: 20, color: AppColors.clr101828),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              CommonText(data: label, style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828)),
              CommonText(
                data: value,
                style: TextStyles.bold.copyWith(fontSize: alignValueEnd ? 15 : 18, color: AppColors.clr101828),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
