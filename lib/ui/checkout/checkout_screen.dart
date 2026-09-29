import 'package:dairy_app/framework/controller/address/address_controller.dart';
import 'package:dairy_app/framework/controller/base/base_controller.dart';
import 'package:dairy_app/framework/controller/cart/cart_controller.dart';
import 'package:dairy_app/framework/controller/checkout/checkout_controller.dart';
import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/provider/local_storage/hive/hive_client.dart';
import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dairy_app/ui/address/address_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_button.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  void _continueShopping() {
    ref.read(baseProvider).selectTabByTitle('Categories');
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  Future<void> _placeOrder() async {
    final controller = ref.read(checkoutProvider);
    final order = await controller.placeOrder();
    if (!mounted) return;

    if (order == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(controller.error ?? 'Unable to place order'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    // The server empties the cart as part of placing the order.
    await ref.read(cartProvider).loadCart();
    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            CommonContainer(
              height: 74,
              width: 74,
              borderRadius: BorderRadius.circular(37),
              color: AppColors.clr34C759.withValues(alpha: 0.12),
              alignment: Alignment.center,
              child: const CommonIcon(icon: Icons.check_rounded, color: AppColors.clr34C759, size: 40),
            ),
            const SizedBox(height: 18),
            CommonText(
              data: 'Order placed!',
              style: TextStyles.bold.copyWith(fontSize: 22, color: AppColors.clr101828),
            ),
            const SizedBox(height: 8),
            CommonText(
              data: order.invoiceNumber.isNotEmpty
                  ? 'Invoice ${order.invoiceNumber}'
                  : 'We have received your order.',
              textAlign: TextAlign.center,
              style: TextStyles.regular.copyWith(fontSize: 14, color: AppColors.clrGrey757575),
            ),
          ],
        ),
        actions: [
          if (order.invoiceNumber.isNotEmpty)
            TextButton(
              onPressed: () async {
                final sessionId = await getIt<HiveClient>().getSessionId();
                final url = Uri.parse('${ApiEndpoints.baseUrl}orders/${order.id}/invoice').replace(
                  queryParameters: {if (sessionId != null && sessionId.isNotEmpty) 'session': sessionId},
                );
                await launchUrl(url, mode: LaunchMode.externalApplication);
              },
              child: const Text('View invoice'),
            ),
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              // Orders is a bottom-nav tab with no Scaffold of its own, so
              // switch the shell to it and unwind back to the shell instead of
              // pushing it as a bare route.
              ref.read(baseProvider).selectTabByTitle('Orders');
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
            child: const Text('View my orders'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.watch(checkoutProvider);

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: AppBar(
        backgroundColor: AppColors.clrWhiteFFFFFF,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.clr101828, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: CommonText(
          data: 'Checkout',
          style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
        ),
      ),
      body: controller.isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildAddressSection(controller),
                  const SizedBox(height: 20),
                  if (controller.slots.isNotEmpty) ...[
                    _buildSlotSection(controller),
                    const SizedBox(height: 20),
                  ],
                  _buildPaymentSection(controller),
                  const SizedBox(height: 20),
                  _buildSummary(controller),
                  const SizedBox(height: 24),
                ],
              ),
            ),
      bottomNavigationBar: controller.isLoading ? null : _buildBottomBar(controller),
    );
  }

  Widget _sectionTitle(String title) => CommonText(
        data: title,
        style: TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clr101828),
      );

  Widget _buildAddressSection(CheckoutController controller) {
    final address = controller.address;
    final hasAddress = controller.hasAddress;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Delivery Address'),
        const SizedBox(height: 12),
        CommonContainer(
          padding: const EdgeInsets.all(16),
          borderRadius: BorderRadius.circular(16),
          color: AppColors.clrWhiteFFFFFF,
          child: Row(
            children: [
              const CommonIcon(icon: Icons.location_on_outlined, color: AppColors.clr6156F1, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: CommonText(
                  data: hasAddress ? address!.address : 'Add a delivery address to continue',
                  style: TextStyles.regular.copyWith(
                    fontSize: 13,
                    color: hasAddress ? AppColors.clr101828 : AppColors.clrRedD32F2F,
                  ),
                  maxLines: 3,
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () async {
                  await Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const AddressScreen()),
                  );
                  if (!mounted) return;
                  await ref.read(addressProvider).loadAddress();
                  await ref.read(checkoutProvider).load();
                },
                child: CommonText(
                  data: hasAddress ? 'Change' : 'Add',
                  style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr6156F1),
                ),
              ),
            ],
          ),
        ),
        if (controller.quote != null && !controller.quote!.zone.serviceable) ...[
          const SizedBox(height: 8),
          CommonText(
            data: controller.quote!.zone.message ?? 'We do not deliver to this pincode yet.',
            style: TextStyles.medium.copyWith(fontSize: 12, color: AppColors.clrRedD32F2F),
          ),
        ],
      ],
    );
  }

  Widget _buildSlotSection(CheckoutController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Delivery Slot'),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: controller.slots.map((slot) {
            final selected = controller.selectedSlot?.id == slot.id;
            return GestureDetector(
              onTap: () => controller.selectSlot(slot),
              child: CommonContainer(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                borderRadius: BorderRadius.circular(12),
                color: selected ? AppColors.clrD7D7FF : AppColors.clrWhiteFFFFFF,
                border: Border.all(color: selected ? AppColors.clr6156F1 : AppColors.grayEAECF0),
                child: CommonText(
                  data: slot.label,
                  style: TextStyles.bold.copyWith(
                    fontSize: 13,
                    color: selected ? AppColors.clr6156F1 : AppColors.clrGrey757575,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildPaymentSection(CheckoutController controller) {
    final walletShort = !controller.walletCoversOrder;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Payment Method'),
        const SizedBox(height: 12),
        _paymentTile(
          controller: controller,
          method: PaymentMethod.cod,
          icon: Icons.payments_outlined,
          title: 'Cash on Delivery',
          subtitle: 'Pay when your order arrives',
          enabled: true,
        ),
        const SizedBox(height: 10),
        _paymentTile(
          controller: controller,
          method: PaymentMethod.wallet,
          icon: Icons.account_balance_wallet_outlined,
          title: 'Pay from Wallet',
          subtitle: walletShort
              ? 'Balance ${AppConstants.currency}${controller.walletBalance.toStringAsFixed(0)} — not enough for this order'
              : 'Balance ${AppConstants.currency}${controller.walletBalance.toStringAsFixed(0)}',
          enabled: !walletShort,
        ),
        if (controller.onlinePaymentAvailable) ...[
          const SizedBox(height: 10),
          _paymentTile(
            controller: controller,
            method: PaymentMethod.online,
            icon: Icons.credit_card_rounded,
            title: 'Pay Online',
            subtitle: 'UPI, cards, net banking & wallets via Razorpay',
            enabled: true,
          ),
        ],
      ],
    );
  }

  Widget _paymentTile({
    required CheckoutController controller,
    required PaymentMethod method,
    required IconData icon,
    required String title,
    required String subtitle,
    required bool enabled,
  }) {
    final selected = controller.paymentMethod == method;
    return Opacity(
      opacity: enabled ? 1 : 0.5,
      child: GestureDetector(
        onTap: enabled ? () => controller.selectPaymentMethod(method) : null,
        child: CommonContainer(
          padding: const EdgeInsets.all(16),
          borderRadius: BorderRadius.circular(16),
          color: AppColors.clrWhiteFFFFFF,
          border: Border.all(color: selected ? AppColors.clr6156F1 : AppColors.grayEAECF0, width: selected ? 1.5 : 1),
          child: Row(
            children: [
              CommonIcon(icon: icon, color: selected ? AppColors.clr6156F1 : AppColors.clrGrey757575, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CommonText(
                      data: title,
                      style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828),
                    ),
                    const SizedBox(height: 2),
                    CommonText(
                      data: subtitle,
                      style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                    ),
                  ],
                ),
              ),
              CommonIcon(
                icon: selected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                color: selected ? AppColors.clr6156F1 : AppColors.clrGrey,
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummary(CheckoutController controller) {
    final quote = controller.quote;
    if (quote == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _sectionTitle('Bill Details'),
        const SizedBox(height: 12),
        CommonContainer(
          padding: const EdgeInsets.all(16),
          borderRadius: BorderRadius.circular(16),
          color: AppColors.clrWhiteFFFFFF,
          child: Column(
            children: [
              _row('Items (${quote.cart.itemCount})', '${AppConstants.currency}${quote.subtotal.toStringAsFixed(0)}'),
              if (quote.taxAmount > 0)
                _row('Tax', '${AppConstants.currency}${quote.taxAmount.toStringAsFixed(0)}'),
              _row(
                'Delivery Fee',
                quote.deliveryFee == 0 ? 'Free' : '${AppConstants.currency}${quote.deliveryFee.toStringAsFixed(0)}',
                highlight: quote.deliveryFee == 0,
              ),
              if (controller.walletAmountToUse > 0)
                _row('Paid from Wallet', '-${AppConstants.currency}${controller.walletAmountToUse.toStringAsFixed(0)}'),
              const Divider(height: 24),
              _row(
                controller.walletAmountToUse > 0 ? 'Payable Now' : 'Total Amount',
                '${AppConstants.currency}${controller.payableAfterWallet.toStringAsFixed(0)}',
                isTotal: true,
              ),
              if (!quote.meetsMinimum) ...[
                const SizedBox(height: 8),
                CommonText(
                  data:
                      'Minimum order for this area is ${AppConstants.currency}${quote.minOrderValue.toStringAsFixed(0)}. Add a little more to continue.',
                  style: TextStyles.medium.copyWith(fontSize: 12, color: AppColors.clrRedD32F2F),
                ),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: _continueShopping,
                  child: CommonContainer(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.clr6156F1),
                    alignment: Alignment.center,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const CommonIcon(icon: Icons.add_rounded, size: 18, color: AppColors.clr6156F1),
                        const SizedBox(width: 6),
                        CommonText(
                          data: 'Continue Shopping',
                          style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr6156F1),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _row(String label, String value, {bool isTotal = false, bool highlight = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            CommonText(
              data: label,
              style: isTotal
                  ? TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clr101828)
                  : TextStyles.medium.copyWith(fontSize: 14, color: AppColors.clrGrey757575),
            ),
            CommonText(
              data: value,
              style: isTotal
                  ? TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr6156F1)
                  : TextStyles.bold.copyWith(
                      fontSize: 14,
                      color: highlight ? AppColors.clr34C759 : AppColors.clr101828,
                    ),
            ),
          ],
        ),
      );

  Widget _buildBottomBar(CheckoutController controller) {
    return CommonContainer(
      padding: const EdgeInsets.all(20),
      color: AppColors.clrWhiteFFFFFF,
      borderRadius: const BorderRadius.only(
        topLeft: Radius.circular(24),
        topRight: Radius.circular(24),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CommonText(
                    data: controller.walletAmountToUse > 0 ? 'Payable Now' : 'Total Amount',
                    style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                  ),
                  CommonText(
                    data: '${AppConstants.currency}${controller.payableAfterWallet.toStringAsFixed(0)}',
                    style: TextStyles.bold.copyWith(fontSize: 20, color: AppColors.clr101828),
                  ),
                ],
              ),
            ),
            Opacity(
              opacity: controller.canPlaceOrder ? 1 : 0.5,
              child: CommonButton(
                onTap: controller.canPlaceOrder ? _placeOrder : () {},
                buttonText: controller.isPlacing ? 'Placing...' : 'Place Order',
                height: 54,
                width: 170,
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  colors: [AppColors.clr6156F1, AppColors.clr6B60FE],
                ),
                buttonTextStyle: TextStyles.bold.copyWith(color: AppColors.clrWhiteFFFFFF, fontSize: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
