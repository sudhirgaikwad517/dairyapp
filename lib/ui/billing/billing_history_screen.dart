import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/billing/billing_repository.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class BillingHistoryScreen extends StatefulWidget {
  const BillingHistoryScreen({super.key});

  @override
  State<BillingHistoryScreen> createState() => _BillingHistoryScreenState();
}

class _BillingHistoryScreenState extends State<BillingHistoryScreen> {
  List<BillingModel> _bills = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final bills = await getIt<BillingRepository>().getBills();
    if (!mounted) return;
    setState(() {
      _bills = bills ?? [];
      _isLoading = false;
    });
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'paid':
        return AppColors.clr34C759;
      case 'partial':
        return Colors.orange;
      default:
        return Colors.redAccent;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: AppBar(
        backgroundColor: AppColors.clrWhiteFFFFFF,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.clr101828, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: CommonText(data: 'Billing History', style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _bills.isEmpty
              ? ListView(
                  children: [
                    const SizedBox(height: 120),
                    Center(
                      child: Column(
                        children: [
                          const CommonIcon(icon: Icons.receipt_long_outlined, size: 70, color: AppColors.clr101828),
                          const SizedBox(height: 18),
                          CommonText(data: 'No bills yet', style: TextStyles.bold.copyWith(fontSize: 17, color: AppColors.clr101828)),
                          const SizedBox(height: 8),
                          CommonText(
                            data: 'Postpaid billing periods will appear here.',
                            style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
                          ),
                        ],
                      ),
                    ),
                  ],
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _bills.length,
                    itemBuilder: (context, index) {
                      final bill = _bills[index];
                      return CommonContainer(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        borderRadius: BorderRadius.circular(14),
                        color: AppColors.clrWhiteFFFFFF,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: CommonText(
                                    data: bill.fromDate != null && bill.toDate != null
                                        ? '${DateFormat('dd MMM').format(bill.fromDate!)} - ${DateFormat('dd MMM yyyy').format(bill.toDate!)}'
                                        : 'Billing period',
                                    style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: _statusColor(bill.status).withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: CommonText(
                                    data: bill.status[0].toUpperCase() + bill.status.substring(1),
                                    style: TextStyles.bold.copyWith(fontSize: 11, color: _statusColor(bill.status)),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _amountColumn('Bill Amount', bill.billAmount),
                                _amountColumn('Paid', bill.paidAmount),
                                _amountColumn('Remaining', bill.remainingAmount),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  Widget _amountColumn(String label, int amount) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CommonText(data: label, style: TextStyles.regular.copyWith(fontSize: 11, color: AppColors.clrGrey757575)),
        const SizedBox(height: 2),
        CommonText(data: '₹$amount', style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828)),
      ],
    );
  }
}
