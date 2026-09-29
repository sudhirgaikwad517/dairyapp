import 'package:dairy_app/framework/controller/subscription/subscription_controller.dart';
import 'package:dairy_app/framework/repository/subscription/subscription_repository.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class SubscriptionScreen extends ConsumerStatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  ConsumerState<SubscriptionScreen> createState() => _SubscriptionScreenConsumerState();
}

class _SubscriptionScreenConsumerState extends ConsumerState<SubscriptionScreen> {
  int selectedStatusIndex = 0;
  final List<String> statusFilters = ["Active", "Paused", "Cancelled"];

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(subscriptionProvider).loadSubscriptions());
  }

  List<SubscriptionModel> _visible(SubscriptionController controller) {
    switch (selectedStatusIndex) {
      case 1:
        return controller.paused;
      case 2:
        return controller.cancelled;
      default:
        return controller.active;
    }
  }

  Future<void> _confirmAndRun({
    required String title,
    required String message,
    required String confirmLabel,
    required Future<String?> Function() action,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Not now')),
          TextButton(onPressed: () => Navigator.pop(dialogContext, true), child: Text(confirmLabel)),
        ],
      ),
    );

    if (confirmed != true) return;
    final failure = await action();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(failure ?? 'Done'),
        backgroundColor: failure == null ? AppColors.clr34C759 : Colors.redAccent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.watch(subscriptionProvider);
    final subscriptions = _visible(controller);

    return Column(
      children: [
        _buildTopBar(context),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.read(subscriptionProvider).loadSubscriptions(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    const SizedBox(height: 16),
                    _buildInfoBanner(),
                    const SizedBox(height: 24),
                    _buildStatusFilters(),
                    const SizedBox(height: 20),
                    if (controller.isLoading && controller.subscriptions.isEmpty)
                      const Padding(padding: EdgeInsets.only(top: 60), child: CircularProgressIndicator())
                    else if (subscriptions.isEmpty)
                      Padding(padding: const EdgeInsets.only(top: 40), child: _buildEmptyState(controller.error))
                    else
                      ...subscriptions.map((s) => _buildSubscriptionCard(s, controller)),
                    const SizedBox(height: 30),
                  ],
                ),
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
              data: "My Subscriptions",
              style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
            ),
            const Spacer(),
            IconButton(
              onPressed: () => ref.read(subscriptionProvider).loadSubscriptions(),
              icon: const CommonIcon(icon: Icons.refresh_rounded, color: AppColors.clr101828, size: 22),
              tooltip: 'Refresh',
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
      color: const Color(0xFFE8F5E9),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CommonIcon(icon: Icons.autorenew_rounded, color: AppColors.clr34C759, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: CommonText(
              data: "Changes to a subscription apply from the next delivery, as per the cut-off time.",
              style: TextStyles.medium.copyWith(fontSize: 14, color: AppColors.clr101828, height: 1.4),
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

  Widget _buildSubscriptionCard(SubscriptionModel subscription, SubscriptionController controller) {
    return CommonContainer(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      borderRadius: BorderRadius.circular(16),
      color: AppColors.clrWhiteFFFFFF,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CommonContainer(
                height: 56,
                width: 56,
                borderRadius: BorderRadius.circular(12),
                color: AppColors.clrF7F7F7,
                alignment: Alignment.center,
                child: (subscription.imageUrl == null || subscription.imageUrl!.isEmpty)
                    ? const CommonIcon(icon: Icons.local_drink, color: AppColors.clr6156F1, size: 26)
                    : ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          subscription.imageUrl!,
                          height: 56,
                          width: 56,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              const CommonIcon(icon: Icons.local_drink, color: AppColors.clr6156F1, size: 26),
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CommonText(
                      data: subscription.productName,
                      style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
                    ),
                    const SizedBox(height: 3),
                    CommonText(
                      data: '${subscription.size} · Qty ${subscription.quantity} · ${subscription.frequencyLabel}',
                      style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                    ),
                    if (subscription.deliverySlotLabel != null) ...[
                      const SizedBox(height: 3),
                      CommonText(
                        data: subscription.deliverySlotLabel!,
                        style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (subscription.nextDeliveryDate != null && subscription.isActive) ...[
            const SizedBox(height: 12),
            CommonText(
              data: 'Next delivery: ${DateFormat('dd MMM yyyy').format(subscription.nextDeliveryDate!.toLocal())}',
              style: TextStyles.medium.copyWith(fontSize: 12, color: AppColors.clr6156F1),
            ),
          ],
          if (subscription.isPaused && subscription.pausedUntil != null) ...[
            const SizedBox(height: 12),
            CommonText(
              data: 'Paused until ${DateFormat('dd MMM yyyy').format(subscription.pausedUntil!.toLocal())}',
              style: TextStyles.medium.copyWith(fontSize: 12, color: AppColors.clrYellowFBC02D),
            ),
          ],
          if (subscription.hasPendingChange) ...[
            const SizedBox(height: 8),
            CommonText(
              data: 'A change request is pending on this subscription.',
              style: TextStyles.regular.copyWith(fontSize: 11, color: AppColors.clrGrey757575),
            ),
          ],
          if (!subscription.isCancelled) ...[
            const SizedBox(height: 14),
            Row(
              children: [
                if (subscription.isActive)
                  Expanded(
                    child: _actionButton(
                      label: 'Pause',
                      icon: Icons.pause_rounded,
                      onTap: controller.isUpdating
                          ? null
                          : () => _confirmAndRun(
                                title: 'Pause subscription?',
                                message: 'Deliveries will stop until you resume it.',
                                confirmLabel: 'Pause',
                                action: () => controller.pause(subscription.id),
                              ),
                    ),
                  ),
                if (subscription.isPaused)
                  Expanded(
                    child: _actionButton(
                      label: 'Resume',
                      icon: Icons.play_arrow_rounded,
                      onTap: controller.isUpdating
                          ? null
                          : () => _confirmAndRun(
                                title: 'Resume subscription?',
                                message: 'Deliveries will start again from the next cycle.',
                                confirmLabel: 'Resume',
                                action: () => controller.resume(subscription.id),
                              ),
                    ),
                  ),
                const SizedBox(width: 10),
                Expanded(
                  child: _actionButton(
                    label: 'Cancel',
                    icon: Icons.close_rounded,
                    destructive: true,
                    onTap: controller.isUpdating
                        ? null
                        : () => _confirmAndRun(
                              title: 'Cancel subscription?',
                              message: 'This cannot be undone. You can always subscribe again later.',
                              confirmLabel: 'Cancel it',
                              action: () => controller.cancel(subscription.id),
                            ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _actionButton({
    required String label,
    required IconData icon,
    required VoidCallback? onTap,
    bool destructive = false,
  }) {
    final color = destructive ? AppColors.clrRedD32F2F : AppColors.clr6156F1;
    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: onTap == null ? 0.5 : 1,
        child: CommonContainer(
          padding: const EdgeInsets.symmetric(vertical: 10),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CommonIcon(icon: icon, size: 16, color: color),
              const SizedBox(width: 6),
              CommonText(
                data: label,
                style: TextStyles.bold.copyWith(fontSize: 13, color: color),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(String? error) {
    return Column(
      children: [
        CommonIcon(
          icon: error == null ? Icons.subscriptions_outlined : Icons.error_outline_rounded,
          size: 80,
          color: error == null ? AppColors.clr101828 : AppColors.clrRedD32F2F,
        ),
        const SizedBox(height: 24),
        CommonText(
          data: error == null ? "No subscription found!" : "Couldn't load subscriptions",
          style: TextStyles.bold.copyWith(fontSize: 20, color: AppColors.clr101828),
        ),
        const SizedBox(height: 12),
        CommonText(
          data: error ?? "Subscribe to a product to get it delivered automatically.",
          textAlign: TextAlign.center,
          style: TextStyles.regular.copyWith(fontSize: 14, color: AppColors.clrGrey757575, height: 1.5),
        ),
      ],
    );
  }
}
