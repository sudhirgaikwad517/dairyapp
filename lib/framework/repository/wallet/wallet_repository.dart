import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

/// One line in "Recharge History" — either a settled wallet_transactions row
/// (top-up, spend, refund…) or a "Request Cash" request that is still
/// pending/rejected. An approved cash request does NOT appear twice: once
/// approved it is represented by its own settled transaction instead.
class WalletTransactionModel {
  final String id;
  final String kind; // 'transaction' | 'cash_request'
  final String type;
  final double amount;
  final double? balanceAfter;
  final String? referenceType;
  final String? notes;
  final String status; // 'completed' | 'pending' | 'rejected'
  final DateTime? createdAt;

  WalletTransactionModel({
    required this.id,
    this.kind = 'transaction',
    required this.type,
    required this.amount,
    this.balanceAfter,
    this.referenceType,
    this.notes,
    this.status = 'completed',
    this.createdAt,
  });

  bool get isCredit => type == 'credit';
  bool get isPending => status == 'pending';
  bool get isRejected => status == 'rejected';

  factory WalletTransactionModel.fromJson(Map<String, dynamic> json) => WalletTransactionModel(
        id: json['id']?.toString() ?? '',
        kind: json['kind']?.toString() ?? 'transaction',
        type: json['type']?.toString() ?? '',
        amount: (json['amount'] as num?)?.toDouble() ?? 0,
        balanceAfter: (json['balanceAfter'] as num?)?.toDouble(),
        referenceType: json['referenceType']?.toString(),
        notes: json['notes']?.toString(),
        status: json['status']?.toString() ?? 'completed',
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      );
}

/// Min/max amount allowed for each "Add Money" mode, as the server enforces
/// them — shown in the sheet's helper text so it never drifts out of sync.
class WalletLimits {
  final double onlineMin;
  final double onlineMax;
  final double cashMin;
  final double cashMax;

  const WalletLimits({
    this.onlineMin = 1,
    this.onlineMax = 30000,
    this.cashMin = 1,
    this.cashMax = 10000,
  });

  factory WalletLimits.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const WalletLimits();
    final online = json['online'] as Map<String, dynamic>?;
    final cash = json['cash'] as Map<String, dynamic>?;
    return WalletLimits(
      onlineMin: (online?['min'] as num?)?.toDouble() ?? 1,
      onlineMax: (online?['max'] as num?)?.toDouble() ?? 30000,
      cashMin: (cash?['min'] as num?)?.toDouble() ?? 1,
      cashMax: (cash?['max'] as num?)?.toDouble() ?? 10000,
    );
  }
}

class WalletModel {
  final double balance;

  /// Money held for pending "Request Cash" requests — not yet spendable.
  final double reservedBalance;

  final List<WalletTransactionModel> transactions;
  final WalletLimits limits;

  WalletModel({
    this.balance = 0,
    this.reservedBalance = 0,
    this.transactions = const [],
    this.limits = const WalletLimits(),
  });

  factory WalletModel.fromJson(Map<String, dynamic> json) => WalletModel(
        balance: (json['balance'] as num?)?.toDouble() ?? 0,
        reservedBalance: (json['reservedBalance'] as num?)?.toDouble() ?? 0,
        transactions: ((json['history'] as List?) ?? [])
            .map((e) => WalletTransactionModel.fromJson(e as Map<String, dynamic>))
            .toList(),
        limits: WalletLimits.fromJson(json['limits'] as Map<String, dynamic>?),
      );
}

@injectable
class WalletRepository {
  final Dio _dio;

  WalletRepository(this._dio);

  Future<WalletModel?> getWallet() async {
    try {
      final response = await _dio.get(ApiEndpoints.wallet);
      if (response.data['success'] == true) {
        return WalletModel.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Returns the error message on failure, null on success.
  Future<String?> topUp(
    double amount, {
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.walletTopup, data: {
        'amount': amount,
        'razorpayOrderId': razorpayOrderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
      });
      if (response.data['success'] == true) return null;
      return response.data['message']?.toString() ?? 'Unable to add money';
    } catch (e) {
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map && data['message'] != null) return data['message'].toString();
      }
      return 'Unable to add money';
    }
  }

  /// Flags that the customer will hand cash to the delivery staff instead of
  /// paying online. Returns the error message on failure, null on success.
  Future<String?> requestCash({
    required double amount,
    required DateTime requestedDate,
    String? email,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.walletCashRequest, data: {
        'amount': amount,
        'requestedDate': requestedDate.toIso8601String().split('T').first,
        if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
      });
      if (response.data['success'] == true) return null;
      return response.data['message']?.toString() ?? 'Unable to submit your request';
    } catch (e) {
      if (e is DioException) {
        final data = e.response?.data;
        if (data is Map && data['message'] != null) return data['message'].toString();
      }
      return 'Unable to submit your request';
    }
  }
}
