import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

class ReferralEntry {
  final String id;
  final String phone;
  final String status;
  final int rewardAmount;
  final DateTime? createdAt;

  ReferralEntry({required this.id, required this.phone, required this.status, required this.rewardAmount, this.createdAt});

  factory ReferralEntry.fromJson(Map<String, dynamic> json) => ReferralEntry(
        id: json['id']?.toString() ?? '',
        phone: json['phone']?.toString() ?? '',
        status: json['status']?.toString() ?? 'pending',
        rewardAmount: (json['rewardAmount'] as num?)?.toInt() ?? 0,
        createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
      );
}

class ReferralSummary {
  final String? referralCode;
  final int totalReferrals;
  final int pendingReferrals;
  final int totalEarned;
  final String planText;
  final List<ReferralEntry> referrals;

  ReferralSummary({
    this.referralCode,
    required this.totalReferrals,
    required this.pendingReferrals,
    required this.totalEarned,
    required this.planText,
    required this.referrals,
  });

  factory ReferralSummary.fromJson(Map<String, dynamic> json) => ReferralSummary(
        referralCode: json['referralCode']?.toString(),
        totalReferrals: (json['totalReferrals'] as num?)?.toInt() ?? 0,
        pendingReferrals: (json['pendingReferrals'] as num?)?.toInt() ?? 0,
        totalEarned: (json['totalEarned'] as num?)?.toInt() ?? 0,
        planText: json['planText']?.toString() ?? '',
        referrals: ((json['referrals'] as List?) ?? const [])
            .map((e) => ReferralEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

@injectable
class ReferralRepository {
  final Dio _dio;

  ReferralRepository(this._dio);

  Future<ReferralSummary?> getSummary() async {
    try {
      final response = await _dio.get(ApiEndpoints.referrals);
      if (response.data['success'] == true) {
        return ReferralSummary.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
