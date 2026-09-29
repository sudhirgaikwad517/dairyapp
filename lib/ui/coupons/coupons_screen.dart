import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/coupon/coupon_repository.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

class CouponsScreen extends StatefulWidget {
  const CouponsScreen({super.key});

  @override
  State<CouponsScreen> createState() => _CouponsScreenState();
}

class _CouponsScreenState extends State<CouponsScreen> {
  List<CouponModel> _coupons = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final coupons = await getIt<CouponRepository>().getCoupons();
    if (!mounted) return;
    setState(() {
      _coupons = coupons ?? [];
      _isLoading = false;
    });
  }

  void _copyCode(String code) {
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Coupon code $code copied'), duration: const Duration(seconds: 1)),
    );
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
        title: CommonText(data: 'All Coupons', style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828)),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _coupons.isEmpty
                ? ListView(
                    children: [
                      const SizedBox(height: 120),
                      Center(
                        child: Column(
                          children: [
                            const CommonIcon(icon: Icons.confirmation_number_outlined, size: 70, color: AppColors.clr101828),
                            const SizedBox(height: 18),
                            CommonText(data: 'No coupons available', style: TextStyles.bold.copyWith(fontSize: 17, color: AppColors.clr101828)),
                            const SizedBox(height: 8),
                            CommonText(
                              data: 'Check back later for new offers.',
                              style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _coupons.length,
                    itemBuilder: (context, index) {
                      final coupon = _coupons[index];
                      return CommonContainer(
                        margin: const EdgeInsets.only(bottom: 14),
                        borderRadius: BorderRadius.circular(14),
                        color: AppColors.clrWhiteFFFFFF,
                        border: Border.all(color: AppColors.grayEAECF0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        CommonText(data: coupon.discountLabel, style: TextStyles.extraBold.copyWith(fontSize: 18, color: AppColors.clr6156F1)),
                                        const SizedBox(height: 4),
                                        CommonText(data: coupon.title, style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828)),
                                        if (coupon.description != null && coupon.description!.isNotEmpty) ...[
                                          const SizedBox(height: 4),
                                          CommonText(
                                            data: coupon.description!,
                                            style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              margin: const EdgeInsets.symmetric(horizontal: 16),
                              padding: const EdgeInsets.symmetric(horizontal: 8),
                              child: const DottedDivider(),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Wrap(
                                      spacing: 8,
                                      runSpacing: 4,
                                      children: [
                                        if (coupon.minOrderAmount > 0)
                                          CommonText(
                                            data: 'Min order ₹${coupon.minOrderAmount}',
                                            style: TextStyles.regular.copyWith(fontSize: 11, color: AppColors.clrGrey757575),
                                          ),
                                        if (coupon.validTo != null)
                                          CommonText(
                                            data: 'Valid till ${DateFormat('dd MMM yyyy').format(coupon.validTo!)}',
                                            style: TextStyles.regular.copyWith(fontSize: 11, color: AppColors.clrGrey757575),
                                          ),
                                      ],
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () => _copyCode(coupon.code),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: AppColors.clr6156F1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        children: [
                                          CommonText(data: coupon.code, style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr6156F1)),
                                          const SizedBox(width: 6),
                                          const Icon(Icons.copy_rounded, size: 14, color: AppColors.clr6156F1),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}

class DottedDivider extends StatelessWidget {
  const DottedDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final dashCount = (constraints.maxWidth / 8).floor();
        return Row(
          children: List.generate(dashCount, (_) {
            return Expanded(
              child: Container(height: 1, color: AppColors.grayEAECF0, margin: const EdgeInsets.symmetric(horizontal: 2)),
            );
          }),
        );
      },
    );
  }
}
