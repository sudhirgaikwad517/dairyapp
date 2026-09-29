import 'package:dairy_app/framework/controller/orders/orders_controller.dart';
import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/cutoff/cutoff_repository.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({super.key});

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenConsumerState();
}

class _OrdersScreenConsumerState extends ConsumerState<OrdersScreen> {
  int selectedStatusIndex = 0;
  CutoffInfo? _cutoffInfo;

  final List<String> statusFilters = ["To be delivered", "Delivered", "Cancelled"];

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(ordersProvider).loadOrders());
    _loadCutoffInfo();
  }

  Future<void> _loadCutoffInfo() async {
    final info = await getIt<CutoffRepository>().fetchCutoffInfo();
    if (!mounted) return;
    setState(() => _cutoffInfo = info);
  }

  /// "22:00" -> "10:00 PM"
  String _formatCutoffTime(String cutoffTime) {
    final parts = cutoffTime.split(':');
    if (parts.length != 2) return cutoffTime;
    final hour = int.tryParse(parts[0]) ?? 0;
    final minute = int.tryParse(parts[1]) ?? 0;
    final time = TimeOfDay(hour: hour, minute: minute);
    final now = DateTime.now();
    final asDate = DateTime(now.year, now.month, now.day, time.hour, time.minute);
    return DateFormat('h:mm a').format(asDate);
  }

  String _cutoffBannerText() {
    final info = _cutoffInfo;
    if (info == null) return 'Loading delivery cut-off details...';

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final effective = DateTime(info.earliestEffectiveDate.year, info.earliestEffectiveDate.month, info.earliestEffectiveDate.day);
    final dayLabel = effective == today
        ? 'today'
        : effective == today.add(const Duration(days: 1))
            ? 'tomorrow'
            : DateFormat('dd MMM').format(effective);

    return "Order before ${_formatCutoffTime(info.cutoffTime)} for $dayLabel's delivery.";
  }

  List<OrderSummaryModel> _visibleOrders(OrdersController controller) {
    switch (selectedStatusIndex) {
      case 1:
        return controller.delivered;
      case 2:
        return controller.cancelled;
      default:
        return controller.upcoming;
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.watch(ordersProvider);
    final orders = _visibleOrders(controller);

    return Column(
      children: [
        _buildTopBar(context),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.read(ordersProvider).loadOrders(),
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
                    if (controller.isLoading && controller.orders.isEmpty)
                      const Padding(
                        padding: EdgeInsets.only(top: 60),
                        child: CircularProgressIndicator(),
                      )
                    else if (orders.isEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 40),
                        child: _buildEmptyState(controller.error),
                      )
                    else
                      ...orders.map(_buildOrderCard),
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
              data: "My Orders",
              style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
            ),
            const Spacer(),
            IconButton(
              onPressed: () => ref.read(ordersProvider).loadOrders(),
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
      color: const Color(0xFFE1F5FE),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CommonIcon(icon: Icons.notifications, color: AppColors.clrYellowFBC02D, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: CommonText(
              data: _cutoffBannerText(),
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

  Color _statusColor(String status) {
    switch (status) {
      case 'DELIVERED':
        return AppColors.clr34C759;
      case 'CANCELLED':
        return AppColors.clrRedD32F2F;
      case 'SHIPPED':
      case 'IN_PROCESS':
        return AppColors.clr6156F1;
      default:
        return AppColors.clrYellowFBC02D;
    }
  }

  String _statusLabel(String status) =>
      status.replaceAll('_', ' ').toLowerCase().split(' ').map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}').join(' ');

  Widget _buildOrderCard(OrderSummaryModel order) {
    final date = order.createdAt;
    return CommonContainer(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      borderRadius: BorderRadius.circular(16),
      color: AppColors.clrWhiteFFFFFF,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: CommonText(
                  data: '${order.itemCount} item${order.itemCount == 1 ? '' : 's'}',
                  style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
                ),
              ),
              CommonContainer(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                borderRadius: BorderRadius.circular(20),
                color: _statusColor(order.status).withValues(alpha: 0.12),
                child: CommonText(
                  data: _statusLabel(order.status),
                  style: TextStyles.bold.copyWith(fontSize: 11, color: _statusColor(order.status)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (date != null)
            CommonText(
              data: DateFormat('dd MMM yyyy, hh:mm a').format(date.toLocal()),
              style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              CommonText(
                data: '${AppConstants.currency}${order.orderValue.toStringAsFixed(0)}',
                style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr6156F1),
              ),
              const SizedBox(width: 10),
              CommonContainer(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                borderRadius: BorderRadius.circular(6),
                color: order.paymentStatus == 'paid'
                    ? AppColors.clr34C759.withValues(alpha: 0.12)
                    : AppColors.clrYellowFBC02D.withValues(alpha: 0.16),
                child: CommonText(
                  data: order.paymentStatus == 'paid' ? 'Paid' : 'Payment pending',
                  style: TextStyles.bold.copyWith(
                    fontSize: 10,
                    color: order.paymentStatus == 'paid' ? AppColors.clr34C759 : AppColors.clrYellowFBC02D,
                  ),
                ),
              ),
            ],
          ),
          if (order.paidFromWallet) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const CommonIcon(
                  icon: Icons.account_balance_wallet_outlined,
                  size: 14,
                  color: AppColors.clr6156F1,
                ),
                const SizedBox(width: 6),
                CommonText(
                  data: '${AppConstants.currency}${order.walletAmountUsed.toStringAsFixed(0)} deducted from wallet',
                  style: TextStyles.medium.copyWith(fontSize: 12, color: AppColors.clr6156F1),
                ),
              ],
            ),
            if (order.totalAmount > 0)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: CommonText(
                  data: '${AppConstants.currency}${order.totalAmount.toStringAsFixed(0)} payable on delivery',
                  style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildEmptyState(String? error) {
    return Column(
      children: [
        CommonIcon(
          icon: error == null ? Icons.inventory_2_outlined : Icons.error_outline_rounded,
          size: 80,
          color: error == null ? AppColors.clr101828 : AppColors.clrRedD32F2F,
        ),
        const SizedBox(height: 24),
        CommonText(
          data: error == null ? "No order found!" : "Couldn't load orders",
          style: TextStyles.bold.copyWith(fontSize: 20, color: AppColors.clr101828),
        ),
        const SizedBox(height: 12),
        CommonText(
          data: error ?? "No orders in this category yet. Check back after placing an order.",
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
