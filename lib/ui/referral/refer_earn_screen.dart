import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/referral/referral_repository.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

class ReferEarnScreen extends StatefulWidget {
  const ReferEarnScreen({super.key});

  @override
  State<ReferEarnScreen> createState() => _ReferEarnScreenState();
}

class _ReferEarnScreenState extends State<ReferEarnScreen> {
  ReferralSummary? _summary;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final summary = await getIt<ReferralRepository>().getSummary();
    if (!mounted) return;
    setState(() {
      _summary = summary;
      _isLoading = false;
    });
  }

  void _copyCode(String code) {
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Referral code copied'), duration: Duration(seconds: 1)),
    );
  }

  void _shareApp(String? code) {
    final message = code != null && code.isNotEmpty
        ? 'Join me on ${AppConstants.brandName}! Use my referral code $code to get started with farm-fresh dairy delivered to your door.'
        : 'Join me on ${AppConstants.brandName} for farm-fresh dairy delivered to your door!';
    Share.share(message);
  }

  @override
  Widget build(BuildContext context) {
    final summary = _summary;
    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: AppBar(
        backgroundColor: AppColors.clrWhiteFFFFFF,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.clr101828, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: CommonText(data: 'Refer & Earn', style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CommonContainer(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    borderRadius: BorderRadius.circular(16),
                    color: AppColors.clr101828,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const CommonIcon(icon: Icons.emoji_events_outlined, size: 32, color: AppColors.clrWhiteFFFFFF),
                        const SizedBox(height: 12),
                        CommonText(
                          data: summary?.planText.isNotEmpty == true
                              ? summary!.planText
                              : 'Invite your friends and family. When they place their first order, you both earn a reward.',
                          style: TextStyles.medium.copyWith(fontSize: 14, color: AppColors.clrWhiteFFFFFF, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  CommonText(data: 'Your Referral Code', style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828)),
                  const SizedBox(height: 10),
                  CommonContainer(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    borderRadius: BorderRadius.circular(12),
                    color: AppColors.clrWhiteFFFFFF,
                    border: Border.all(color: AppColors.grayEAECF0),
                    child: Row(
                      children: [
                        Expanded(
                          child: CommonText(
                            data: summary?.referralCode ?? '—',
                            style: TextStyles.extraBold.copyWith(fontSize: 20, color: AppColors.clr6156F1),
                          ),
                        ),
                        if (summary?.referralCode != null)
                          GestureDetector(
                            onTap: () => _copyCode(summary!.referralCode!),
                            child: const Icon(Icons.copy_rounded, size: 20, color: AppColors.clr101828),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _shareApp(summary?.referralCode),
                      icon: const Icon(Icons.share_rounded, size: 18, color: AppColors.clrWhiteFFFFFF),
                      label: CommonText(data: 'Share App', style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clrWhiteFFFFFF)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.clr6156F1,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(child: _StatCard(label: 'Total Referrals', value: '${summary?.totalReferrals ?? 0}')),
                      const SizedBox(width: 12),
                      Expanded(child: _StatCard(label: 'Pending', value: '${summary?.pendingReferrals ?? 0}')),
                      const SizedBox(width: 12),
                      Expanded(child: _StatCard(label: 'Earned', value: '₹${summary?.totalEarned ?? 0}')),
                    ],
                  ),
                  const SizedBox(height: 24),
                  CommonText(data: 'How It Works', style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828)),
                  const SizedBox(height: 10),
                  _HowItWorksStep(number: '1', text: 'Share your referral code with friends and family.'),
                  _HowItWorksStep(number: '2', text: 'They sign up and place their first order using your code.'),
                  _HowItWorksStep(number: '3', text: 'You both get rewarded with wallet credit.'),
                  if (summary != null && summary.referrals.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    CommonText(data: 'Your Referrals', style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828)),
                    const SizedBox(height: 10),
                    ...summary.referrals.map((r) => CommonContainer(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          borderRadius: BorderRadius.circular(10),
                          color: AppColors.clrWhiteFFFFFF,
                          child: Row(
                            children: [
                              Expanded(child: CommonText(data: r.phone, style: TextStyles.medium.copyWith(fontSize: 13, color: AppColors.clr101828))),
                              CommonText(
                                data: r.status == 'rewarded' ? '+₹${r.rewardAmount}' : 'Pending',
                                style: TextStyles.bold.copyWith(
                                  fontSize: 12,
                                  color: r.status == 'rewarded' ? AppColors.clr34C759 : AppColors.clrGrey757575,
                                ),
                              ),
                            ],
                          ),
                        )),
                  ],
                ],
              ),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;

  const _StatCard({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return CommonContainer(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      borderRadius: BorderRadius.circular(12),
      color: AppColors.clrWhiteFFFFFF,
      child: Column(
        children: [
          CommonText(data: value, style: TextStyles.extraBold.copyWith(fontSize: 18, color: AppColors.clr101828)),
          const SizedBox(height: 4),
          CommonText(
            data: label,
            textAlign: TextAlign.center,
            style: TextStyles.regular.copyWith(fontSize: 11, color: AppColors.clrGrey757575),
          ),
        ],
      ),
    );
  }
}

class _HowItWorksStep extends StatelessWidget {
  final String number;
  final String text;

  const _HowItWorksStep({required this.number, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 12,
            backgroundColor: AppColors.clr6156F1,
            child: CommonText(data: number, style: TextStyles.bold.copyWith(fontSize: 12, color: AppColors.clrWhiteFFFFFF)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: CommonText(data: text, style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clr101828, height: 1.4)),
          ),
        ],
      ),
    );
  }
}
