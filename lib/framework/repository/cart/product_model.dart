class ProductModel {
  final String id;
  final String name;
  final String brand;
  final String volume;
  final double price;

  /// List price the admin entered. 0 means there is none to show — never draw a
  /// struck-through price in that case rather than inventing one.
  final double mrp;

  final String? image;
  final String category;
  final String? categoryId;
  final String? subCategoryId;
  final String description;
  final double rating;
  final String badge;
  final String foodType;
  final bool inStock;
  final bool isPopular;
  final bool isNewArrival;
  final bool isSeasonal;

  /// Whether an admin has switched subscriptions on for this product at all.
  /// The account-type-specific check (prepaid/postpaid) still happens
  /// server-side when the subscription is actually created.
  final bool allowSubscription;

  /// Per-delivery subscription rate (may differ from the one-off [price]).
  final double subscriptionPrice;

  int quantity;

  ProductModel({
    required this.id,
    required this.name,
    required this.brand,
    required this.volume,
    required this.price,
    this.mrp = 0,
    this.image,
    this.category = 'Milk',
    this.categoryId,
    this.subCategoryId,
    this.description = '',
    this.rating = 4.5,
    this.badge = '',
    this.foodType = 'veg',
    this.inStock = true,
    this.isPopular = false,
    this.isNewArrival = false,
    this.isSeasonal = false,
    this.allowSubscription = false,
    double? subscriptionPrice,
    this.quantity = 0,
  }) : subscriptionPrice = subscriptionPrice ?? price;

  bool get hasMrp => mrp > price;

  /// Kept for the older screens that read `originalPrice`; falls back to the
  /// selling price so nothing shows a fake discount.
  double get originalPrice => hasMrp ? mrp : price;

  int get discountPercent => hasMrp ? (((mrp - price) / mrp) * 100).round() : 0;

  /// The subscribe price is often lower than the one-off price, so it can
  /// carry a different (usually bigger) discount off the same MRP — compute
  /// it separately rather than assuming it matches [discountPercent].
  bool get hasSubscriptionMrp => mrp > subscriptionPrice;

  int get subscriptionDiscountPercent =>
      hasSubscriptionMrp ? (((mrp - subscriptionPrice) / mrp) * 100).round() : 0;

  bool get isVeg => foodType != 'non_veg';

  ProductModel copyWith({int? quantity}) {
    return ProductModel(
      id: id,
      name: name,
      brand: brand,
      volume: volume,
      price: price,
      mrp: mrp,
      image: image,
      category: category,
      categoryId: categoryId,
      subCategoryId: subCategoryId,
      description: description,
      rating: rating,
      badge: badge,
      foodType: foodType,
      inStock: inStock,
      isPopular: isPopular,
      isNewArrival: isNewArrival,
      isSeasonal: isSeasonal,
      allowSubscription: allowSubscription,
      subscriptionPrice: subscriptionPrice,
      quantity: quantity ?? this.quantity,
    );
  }

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final badge = json['badge']?.toString() ?? '';
    final upperBadge = badge.toUpperCase();

    return ProductModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      brand: json['brand']?.toString() ?? 'Proshakti',
      volume: json['size']?.toString() ?? '',
      price: (json['buyOnce'] ?? 0).toDouble(),
      mrp: (json['mrp'] ?? 0).toDouble(),
      image: json['imageUrl']?.toString(),
      category: json['categoryLabel']?.toString() ?? 'Other',
      categoryId: json['categoryId']?.toString(),
      subCategoryId: json['subCategoryId']?.toString(),
      description: json['description']?.toString() ?? '',
      rating: (json['ratingAvg'] ?? 4.5).toDouble(),
      badge: badge,
      foodType: json['foodType']?.toString() ?? 'veg',
      // Absent means the endpoint predates the field — assume sellable.
      inStock: json['inStock'] as bool? ?? true,
      isPopular: (json['ratingAvg'] ?? 0) > 4.0 ||
          (json['reviewCount'] ?? 0) > 10 ||
          upperBadge == 'POPULAR' ||
          upperBadge == 'BEST VALUE' ||
          upperBadge == 'MUST TRY' ||
          upperBadge == 'COMBO',
      isNewArrival: upperBadge == 'NEW',
      isSeasonal: upperBadge == 'SEASONAL',
      allowSubscription: json['allowSubscription'] as bool? ?? false,
      subscriptionPrice: (json['subscription'] as num?)?.toDouble(),
    );
  }
}
