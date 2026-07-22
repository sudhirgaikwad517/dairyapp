import 'package:dairy_app/framework/controller/cart/cart_controller.dart';
import 'package:dairy_app/framework/controller/payment/payment_controller.dart';
import 'package:dairy_app/ui/utils/app_constants/upi_config.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:upi_india/upi_india.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenConsumerState();
}

class _PaymentScreenConsumerState extends ConsumerState<PaymentScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(paymentProvider).fetchAvailableApps();
    });
  }

  @override
  Widget build(BuildContext context) {
    final paymentWatch = ref.watch(paymentProvider);
    final cartWatch = ref.watch(cartProvider);

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: _buildAppBar(context),
      body: Column(
        children: [
          _buildPaymentSummary(cartWatch.totalAmount),
          const SizedBox(height: 20),
          Expanded(
            child: !UpiConfig.isConfigured
                ? _buildConfigurationRequired()
                : paymentWatch.apps == null
                ? const Center(child: CircularProgressIndicator())
                : paymentWatch.apps!.isEmpty
                ? _buildNoAppsFound()
                : _buildAppList(paymentWatch.apps!, cartWatch.totalAmount),
          ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.clrWhiteFFFFFF,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(
          Icons.arrow_back_ios,
          color: AppColors.clr101828,
          size: 20,
        ),
        onPressed: () => Navigator.pop(context),
      ),
      title: CommonText(
        data: "Select Payment Method",
        style: TextStyles.bold.copyWith(
          fontSize: 18,
          color: AppColors.clr101828,
        ),
      ),
    );
  }

  Widget _buildPaymentSummary(double amount) {
    return CommonContainer(
      width: double.infinity,
      color: AppColors.clrWhiteFFFFFF,
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          CommonText(
            data: "Amount to Pay",
            style: TextStyles.regular.copyWith(
              color: AppColors.clrGrey757575,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 8),
          CommonText(
            data: "₹${amount.toStringAsFixed(2)}",
            style: TextStyles.bold.copyWith(
              fontSize: 32,
              color: AppColors.clr6156F1,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoAppsFound() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CommonIcon(
            icon: Icons.error_outline,
            size: 60,
            color: AppColors.clrGrey,
          ),
          const SizedBox(height: 16),
          CommonText(
            data: "No UPI apps found on your device",
            style: TextStyles.medium.copyWith(color: AppColors.clrGrey757575),
          ),
        ],
      ),
    );
  }

  Widget _buildAppList(List<UpiApp> apps, double amount) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: apps.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final app = apps[index];
        return GestureDetector(
          onTap: () async {
            try {
              final response = await ref
                  .read(paymentProvider)
                  .initiateTransaction(app, amount);
              _handlePaymentResponse(response);
            } catch (e) {
              _showSnackBar("Transaction failed: $e");
            }
          },
          child: CommonContainer(
            padding: const EdgeInsets.all(16),
            borderRadius: BorderRadius.circular(16),
            color: AppColors.clrWhiteFFFFFF,
            child: Row(
              children: [
                Image.memory(app.icon, height: 40, width: 40),
                const SizedBox(width: 16),
                Expanded(
                  child: CommonText(
                    data: app.name,
                    style: TextStyles.bold.copyWith(fontSize: 16),
                  ),
                ),
                const CommonIcon(
                  icon: Icons.arrow_forward_ios,
                  size: 16,
                  color: AppColors.clrGrey,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildConfigurationRequired() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CommonIcon(
              icon: Icons.settings_outlined,
              size: 60,
              color: AppColors.clrGrey,
            ),
            const SizedBox(height: 16),
            CommonText(
              data: 'UPI payments are not configured',
              style: TextStyles.bold.copyWith(
                fontSize: 16,
                color: AppColors.clr101828,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            CommonText(
              data:
                  'Set UPI_RECEIVER_UPI_ID to your business UPI ID when building the app.',
              style: TextStyles.regular.copyWith(
                color: AppColors.clrGrey757575,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  void _handlePaymentResponse(UpiResponse response) {
    String status = "";
    switch (response.status) {
      case UpiPaymentStatus.SUCCESS:
        status = "Transaction Successful";
        break;
      case UpiPaymentStatus.SUBMITTED:
        status = "Transaction Submitted";
        break;
      case UpiPaymentStatus.FAILURE:
        status = "Transaction Failed";
        break;
      default:
        status = "Transaction Cancelled";
    }
    _showSnackBar(
      response.transactionId == null || response.transactionId!.isEmpty
          ? status
          : '$status (Ref: ${response.transactionId})',
    );
    if (response.status == UpiPaymentStatus.SUCCESS) {
      // Logic for successful order placement
      Navigator.popUntil(context, (route) => route.isFirst);
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }
}
