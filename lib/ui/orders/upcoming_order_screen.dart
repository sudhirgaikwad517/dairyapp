import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/subscription/subscription_repository.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class UpcomingOrderScreen extends StatefulWidget {
  const UpcomingOrderScreen({super.key});

  @override
  State<UpcomingOrderScreen> createState() => _UpcomingOrderScreenState();
}

class _UpcomingOrderScreenState extends State<UpcomingOrderScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  List<UpcomingDeliveryDay> _upcoming = [];
  List<DeliveryHistoryEntry> _history = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final repository = getIt<SubscriptionRepository>();
    final results = await Future.wait([repository.getUpcoming(), repository.getHistory()]);
    if (!mounted) return;
    setState(() {
      _upcoming = (results[0] as List<UpcomingDeliveryDay>?) ?? [];
      _history = (results[1] as List<DeliveryHistoryEntry>?) ?? [];
      _isLoading = false;
    });
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
        title: CommonText(data: 'Upcoming Order', style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.clr6156F1,
          unselectedLabelColor: AppColors.clrGrey757575,
          indicatorColor: AppColors.clr6156F1,
          labelStyle: TextStyles.bold.copyWith(fontSize: 13),
          tabs: const [Tab(text: 'Upcoming Order'), Tab(text: 'Order History')],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [_buildUpcoming(), _buildHistory()],
            ),
    );
  }

  Widget _buildUpcoming() {
    if (_upcoming.isEmpty) {
      return _emptyState(icon: Icons.upcoming_outlined, message: 'No upcoming deliveries scheduled.');
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _upcoming.length,
        itemBuilder: (context, index) {
          final day = _upcoming[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CommonText(
                  data: DateFormat('EEEE, dd MMM yyyy').format(day.date),
                  style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr101828),
                ),
                const SizedBox(height: 8),
                ...day.items.map((item) => CommonContainer(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      borderRadius: BorderRadius.circular(12),
                      color: AppColors.clrWhiteFFFFFF,
                      child: Row(
                        children: [
                          const CommonIcon(icon: Icons.local_drink_outlined, size: 22, color: AppColors.clr101828),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CommonText(data: item.productName, style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828)),
                                if (item.size.isNotEmpty)
                                  CommonText(data: item.size, style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575)),
                              ],
                            ),
                          ),
                          CommonText(data: 'x${item.quantity}', style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr101828)),
                        ],
                      ),
                    )),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHistory() {
    if (_history.isEmpty) {
      return _emptyState(icon: Icons.history_rounded, message: 'No delivery history yet.');
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _history.length,
        itemBuilder: (context, index) {
          final entry = _history[index];
          final delivered = entry.status == 'delivered';
          return CommonContainer(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            borderRadius: BorderRadius.circular(12),
            color: AppColors.clrWhiteFFFFFF,
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CommonText(data: entry.productName, style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828)),
                      const SizedBox(height: 2),
                      CommonText(
                        data: DateFormat('dd MMM yyyy').format(entry.date),
                        style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    CommonText(
                      data: '${entry.quantityDelivered.toStringAsFixed(entry.quantityDelivered % 1 == 0 ? 0 : 1)} delivered',
                      style: TextStyles.bold.copyWith(fontSize: 12, color: delivered ? AppColors.clr34C759 : AppColors.clrGrey757575),
                    ),
                    const SizedBox(height: 2),
                    CommonText(
                      data: entry.status[0].toUpperCase() + entry.status.substring(1),
                      style: TextStyles.regular.copyWith(fontSize: 11, color: AppColors.clrGrey757575),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _emptyState({required IconData icon, required String message}) {
    return ListView(
      children: [
        const SizedBox(height: 120),
        Center(
          child: Column(
            children: [
              CommonIcon(icon: icon, size: 70, color: AppColors.clr101828),
              const SizedBox(height: 18),
              CommonText(data: message, textAlign: TextAlign.center, style: TextStyles.medium.copyWith(fontSize: 14, color: AppColors.clrGrey757575)),
            ],
          ),
        ),
      ],
    );
  }
}
