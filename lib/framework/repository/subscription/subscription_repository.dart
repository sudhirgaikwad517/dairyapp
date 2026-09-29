import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

class SubscriptionModel {
  final String id;
  final String productName;
  final String size;
  final String? imageUrl;
  final String status;
  final String frequency;

  /// Human-readable schedule ("Day wise (Mon, Wed, Fri)"), computed server-side
  /// so the app never has to re-derive weekday names itself.
  final String frequencyLabel;

  final int quantity;
  final double? rate;
  final DateTime? startDate;
  final DateTime? endDate;
  final DateTime? nextDeliveryDate;
  final DateTime? pausedUntil;
  final String? deliverySlotLabel;
  final bool hasPendingChange;

  SubscriptionModel({
    required this.id,
    required this.productName,
    this.size = '',
    this.imageUrl,
    required this.status,
    this.frequency = 'daily',
    String? frequencyLabel,
    this.quantity = 1,
    this.rate,
    this.startDate,
    this.endDate,
    this.nextDeliveryDate,
    this.pausedUntil,
    this.deliverySlotLabel,
    this.hasPendingChange = false,
  }) : frequencyLabel = frequencyLabel ?? frequency;

  bool get isActive => status.toLowerCase() == 'active';
  bool get isPaused => status.toLowerCase() == 'paused';
  bool get isCancelled => status.toLowerCase() == 'cancelled' || status.toLowerCase() == 'inactive';

  factory SubscriptionModel.fromJson(Map<String, dynamic> json) => SubscriptionModel(
        id: json['id']?.toString() ?? '',
        productName: json['productName']?.toString() ?? '',
        size: json['size']?.toString() ?? '',
        imageUrl: json['imageUrl']?.toString(),
        status: json['status']?.toString() ?? 'active',
        frequency: json['frequency']?.toString() ?? 'daily',
        frequencyLabel: json['frequencyLabel']?.toString(),
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        rate: (json['rate'] as num?)?.toDouble(),
        startDate: DateTime.tryParse(json['startDate']?.toString() ?? ''),
        endDate: DateTime.tryParse(json['endDate']?.toString() ?? ''),
        nextDeliveryDate: DateTime.tryParse(json['nextDeliveryDate']?.toString() ?? ''),
        pausedUntil: DateTime.tryParse(json['pausedUntil']?.toString() ?? ''),
        deliverySlotLabel: (json['deliverySlot'] as Map<String, dynamic>?)?['label']?.toString(),
        hasPendingChange: json['hasPendingChange'] == true,
      );
}

/// What a plan actually costs, computed server-side from the exact same rules
/// that will be enforced when it's created — a prepaid customer commits to a
/// real number before paying anything.
class SubscriptionQuote {
  final bool isPrepaid;
  final double rate;
  final int quantity;

  /// How many deliveries fall in the chosen date range. 0 for postpaid — an
  /// open-ended plan billed per delivery has nothing to pre-count.
  final int occurrences;

  /// What a prepaid customer must pay now. Always 0 for postpaid.
  final double totalCost;
  final double walletBalance;
  final bool walletSufficient;

  const SubscriptionQuote({
    required this.isPrepaid,
    required this.rate,
    required this.quantity,
    required this.occurrences,
    required this.totalCost,
    required this.walletBalance,
    required this.walletSufficient,
  });

  factory SubscriptionQuote.fromJson(Map<String, dynamic> json) => SubscriptionQuote(
        isPrepaid: json['isPrepaid'] == true,
        rate: (json['rate'] as num?)?.toDouble() ?? 0,
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        occurrences: (json['occurrences'] as num?)?.toInt() ?? 0,
        totalCost: (json['totalCost'] as num?)?.toDouble() ?? 0,
        walletBalance: (json['walletBalance'] as num?)?.toDouble() ?? 0,
        walletSufficient: json['walletSufficient'] == true,
      );
}

class SubscriptionQuoteResult {
  final SubscriptionQuote? quote;
  final String? error;

  const SubscriptionQuoteResult.success(this.quote) : error = null;
  const SubscriptionQuoteResult.failure(this.error) : quote = null;

  bool get isSuccess => error == null;
}

/// One product due for delivery on a given day, projected forward from a
/// subscription's `next_delivery_date` — used by the "Upcoming Order" tab.
class UpcomingDeliveryItem {
  final String subscriptionId;
  final String productName;
  final String? imageUrl;
  final String size;
  final int quantity;

  UpcomingDeliveryItem({
    required this.subscriptionId,
    required this.productName,
    this.imageUrl,
    this.size = '',
    this.quantity = 1,
  });

  factory UpcomingDeliveryItem.fromJson(Map<String, dynamic> json) => UpcomingDeliveryItem(
        subscriptionId: json['subscriptionId']?.toString() ?? '',
        productName: json['productName']?.toString() ?? '',
        imageUrl: json['imageUrl']?.toString(),
        size: json['size']?.toString() ?? '',
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      );
}

class UpcomingDeliveryDay {
  final DateTime date;
  final List<UpcomingDeliveryItem> items;

  UpcomingDeliveryDay({required this.date, required this.items});

  factory UpcomingDeliveryDay.fromJson(Map<String, dynamic> json) => UpcomingDeliveryDay(
        date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
        items: ((json['items'] as List?) ?? const [])
            .map((e) => UpcomingDeliveryItem.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// A single already-marked delivery — used by the "Order History" tab.
class DeliveryHistoryEntry {
  final String id;
  final DateTime date;
  final String productName;
  final String? imageUrl;
  final String size;
  final double quantityOrdered;
  final double quantityDelivered;
  final String status;

  DeliveryHistoryEntry({
    required this.id,
    required this.date,
    required this.productName,
    this.imageUrl,
    this.size = '',
    this.quantityOrdered = 0,
    this.quantityDelivered = 0,
    required this.status,
  });

  factory DeliveryHistoryEntry.fromJson(Map<String, dynamic> json) => DeliveryHistoryEntry(
        id: json['id']?.toString() ?? '',
        date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
        productName: json['productName']?.toString() ?? '',
        imageUrl: json['imageUrl']?.toString(),
        size: json['size']?.toString() ?? '',
        quantityOrdered: (json['quantityOrdered'] as num?)?.toDouble() ?? 0,
        quantityDelivered: (json['quantityDelivered'] as num?)?.toDouble() ?? 0,
        status: json['status']?.toString() ?? 'delivered',
      );
}

@injectable
class SubscriptionRepository {
  final Dio _dio;

  SubscriptionRepository(this._dio);

  String _messageFrom(Object e, String fallback) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['message'] != null) return data['message'].toString();
    }
    return fallback;
  }

  Future<List<SubscriptionModel>?> getSubscriptions() async {
    try {
      final response = await _dio.get(ApiEndpoints.subscriptions);
      if (response.data['success'] == true) {
        final data = response.data['data'];
        final list = data is List ? data : (data?['subscriptions'] as List? ?? []);
        return list.map((e) => SubscriptionModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Map<String, dynamic> _planBody({
    required String productId,
    String? variantId,
    required String frequency,
    List<int>? dayWiseDays,
    required int quantity,
    required String startDate,
    String? toDate,
  }) =>
      {
        'productId': productId,
        if (variantId != null) 'variantId': variantId,
        'frequency': frequency,
        if (dayWiseDays != null && dayWiseDays.isNotEmpty) 'dayWiseDays': dayWiseDays,
        'quantity': quantity,
        'startDate': startDate,
        if (toDate != null) 'toDate': toDate,
      };

  /// What this plan would cost — call whenever quantity/frequency/dates
  /// change so the customer always sees a live, trustworthy total.
  Future<SubscriptionQuoteResult> quote({
    required String productId,
    String? variantId,
    required String frequency,
    List<int>? dayWiseDays,
    required int quantity,
    required String startDate,
    String? toDate,
  }) async {
    try {
      final response = await _dio.post(
        ApiEndpoints.subscriptionQuote,
        data: _planBody(
          productId: productId,
          variantId: variantId,
          frequency: frequency,
          dayWiseDays: dayWiseDays,
          quantity: quantity,
          startDate: startDate,
          toDate: toDate,
        ),
      );
      if (response.data['success'] == true) {
        return SubscriptionQuoteResult.success(
          SubscriptionQuote.fromJson(response.data['data'] as Map<String, dynamic>),
        );
      }
      return SubscriptionQuoteResult.failure(response.data['message']?.toString() ?? 'Unable to calculate the plan total');
    } catch (e) {
      return SubscriptionQuoteResult.failure(_messageFrom(e, 'Unable to calculate the plan total'));
    }
  }

  /// Creates a new recurring subscription for a product. For a prepaid plan
  /// pass `paymentMethod` ('wallet' or 'online', plus the Razorpay fields for
  /// 'online') — postpaid needs neither. Returns null on success, or an error
  /// message: a 422 from the server (ineligible product, before-cutoff date,
  /// insufficient wallet balance, empty day-wise selection…) surfaces its own
  /// specific message rather than a generic failure.
  Future<String?> create({
    required String productId,
    String? variantId,
    required String frequency,
    List<int>? dayWiseDays,
    required int quantity,
    String? deliverySlotId,
    required String startDate,
    String? toDate,
    String? paymentMethod,
    String? razorpayOrderId,
    String? razorpayPaymentId,
    String? razorpaySignature,
  }) =>
      _action(
        ApiEndpoints.subscriptions,
        {
          ..._planBody(
            productId: productId,
            variantId: variantId,
            frequency: frequency,
            dayWiseDays: dayWiseDays,
            quantity: quantity,
            startDate: startDate,
            toDate: toDate,
          ),
          if (deliverySlotId != null) 'deliverySlotId': deliverySlotId,
          if (paymentMethod != null) 'paymentMethod': paymentMethod,
          if (razorpayOrderId != null) 'razorpayOrderId': razorpayOrderId,
          if (razorpayPaymentId != null) 'razorpayPaymentId': razorpayPaymentId,
          if (razorpaySignature != null) 'razorpaySignature': razorpaySignature,
        },
        'Unable to create subscription',
      );

  /// Returns null on success, or an error message.
  Future<String?> pause(String id, {String? pausedFrom, String? pausedUntil}) =>
      _action('${ApiEndpoints.subscriptions}/$id/pause', {
        if (pausedFrom != null) 'pausedFrom': pausedFrom,
        if (pausedUntil != null) 'pausedUntil': pausedUntil,
      }, 'Unable to pause subscription');

  Future<String?> resume(String id) =>
      _action('${ApiEndpoints.subscriptions}/$id/resume', {}, 'Unable to resume subscription');

  Future<String?> cancel(String id, {String? reason}) =>
      _action('${ApiEndpoints.subscriptions}/$id/cancel', {
        if (reason != null) 'reason': reason,
      }, 'Unable to cancel subscription');

  Future<List<UpcomingDeliveryDay>?> getUpcoming({int days = 14}) async {
    try {
      final response = await _dio.get(ApiEndpoints.subscriptionUpcoming, queryParameters: {'days': days});
      if (response.data['success'] == true) {
        final list = response.data['data']?['days'] as List? ?? [];
        return list.map((e) => UpcomingDeliveryDay.fromJson(e as Map<String, dynamic>)).toList();
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<List<DeliveryHistoryEntry>?> getHistory() async {
    try {
      final response = await _dio.get(ApiEndpoints.subscriptionHistory);
      if (response.data['success'] == true) {
        return (response.data['data'] as List)
            .map((e) => DeliveryHistoryEntry.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<String?> _action(String path, Map<String, dynamic> body, String fallback) async {
    try {
      final response = await _dio.post(path, data: body);
      if (response.data['success'] == true) return null;
      return response.data['message']?.toString() ?? fallback;
    } catch (e) {
      return _messageFrom(e, fallback);
    }
  }
}
