import 'package:dairy_app/framework/controller/orders/orders_controller.dart';
import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/provider/local_storage/hive/hive_client.dart';
import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

/// Reuses the same order data already loaded for "My Orders" — every order
/// that has an invoice number, most recent first.
class InvoiceHistoryScreen extends ConsumerWidget {
  const InvoiceHistoryScreen({super.key});

  Future<void> _openInvoice(BuildContext context, String orderId) async {
    final sessionId = await getIt<HiveClient>().getSessionId();
    final url = Uri.parse('${ApiEndpoints.baseUrl}orders/$orderId/invoice').replace(
      queryParameters: {if (sessionId != null && sessionId.isNotEmpty) 'session': sessionId},
    );
    final opened = await launchUrl(url, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open invoice')),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.watch(ordersProvider);
    final invoiced = controller.orders.where((o) => o.invoiceNumber.isNotEmpty).toList();

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: AppBar(
        backgroundColor: AppColors.clrWhiteFFFFFF,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.clr101828, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: CommonText(data: 'Invoice History', style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828)),
      ),
      body: controller.isLoading && controller.orders.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : invoiced.isEmpty
              ? ListView(
                  children: [
                    const SizedBox(height: 120),
                    Center(
                      child: Column(
                        children: [
                          const CommonIcon(icon: Icons.description_outlined, size: 70, color: AppColors.clr101828),
                          const SizedBox(height: 18),
                          CommonText(data: 'No invoices yet', style: TextStyles.bold.copyWith(fontSize: 17, color: AppColors.clr101828)),
                        ],
                      ),
                    ),
                  ],
                )
              : RefreshIndicator(
                  onRefresh: () => ref.read(ordersProvider).loadOrders(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: invoiced.length,
                    itemBuilder: (context, index) {
                      final order = invoiced[index];
                      return GestureDetector(
                        onTap: () => _openInvoice(context, order.id),
                        child: CommonContainer(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          borderRadius: BorderRadius.circular(12),
                          color: AppColors.clrWhiteFFFFFF,
                          child: Row(
                            children: [
                              const CommonIcon(icon: Icons.receipt_outlined, size: 22, color: AppColors.clr101828),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    CommonText(data: 'Invoice ${order.invoiceNumber}', style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828)),
                                    if (order.createdAt != null) ...[
                                      const SizedBox(height: 2),
                                      CommonText(
                                        data: DateFormat('dd MMM yyyy').format(order.createdAt!.toLocal()),
                                        style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              CommonText(
                                data: '₹${order.orderValue.toStringAsFixed(0)}',
                                style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828),
                              ),
                              const SizedBox(width: 10),
                              const CommonIcon(icon: Icons.download_outlined, size: 18, color: AppColors.clr6156F1),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
