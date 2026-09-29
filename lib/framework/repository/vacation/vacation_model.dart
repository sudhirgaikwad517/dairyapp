/// A "Vacation Mode" entry — pauses every delivery for the customer across a
/// date range. Distinct from pausing a single subscription.
class VacationModel {
  final String id;
  final DateTime fromDate;
  final DateTime toDate;
  final String? remark;
  final bool isEnded;
  final bool isActive;
  final bool isUpcoming;
  final DateTime? createdAt;

  VacationModel({
    required this.id,
    required this.fromDate,
    required this.toDate,
    this.remark,
    this.isEnded = false,
    this.isActive = false,
    this.isUpcoming = false,
    this.createdAt,
  });

  factory VacationModel.fromJson(Map<String, dynamic> json) => VacationModel(
        id: json['id']?.toString() ?? '',
        fromDate: DateTime.tryParse(json['fromDate']?.toString() ?? '') ?? DateTime.now(),
        toDate: DateTime.tryParse(json['toDate']?.toString() ?? '') ?? DateTime.now(),
        remark: json['remark']?.toString(),
        isEnded: json['isEnded'] as bool? ?? false,
        isActive: json['isActive'] as bool? ?? false,
        isUpcoming: json['isUpcoming'] as bool? ?? false,
        createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
      );
}
