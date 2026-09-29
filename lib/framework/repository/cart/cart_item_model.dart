/// A line item as the server sees it. [id] is the cart-item id (used for
/// quantity updates / removal) — not the product id.
class CartItemModel {
  final String id;
  final String productId;
  final String? variantId;
  final String name;
  final String size;
  final String? imageUrl;
  final String? categoryLabel;
  final String badge;
  final int quantity;
  final String purchaseType;
  final double unitPrice;
  final double lineTotal;

  CartItemModel({
    required this.id,
    required this.productId,
    this.variantId,
    required this.name,
    required this.size,
    this.imageUrl,
    this.categoryLabel,
    this.badge = '',
    required this.quantity,
    this.purchaseType = 'BUY_ONCE',
    required this.unitPrice,
    required this.lineTotal,
  });

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    return CartItemModel(
      id: json['id']?.toString() ?? '',
      productId: json['productId']?.toString() ?? '',
      variantId: json['variantId']?.toString(),
      name: json['name']?.toString() ?? '',
      size: json['size']?.toString() ?? '',
      imageUrl: json['imageUrl']?.toString(),
      categoryLabel: json['categoryLabel']?.toString(),
      badge: json['badge']?.toString() ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      purchaseType: json['purchaseType']?.toString() ?? 'BUY_ONCE',
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0,
      lineTotal: (json['lineTotal'] as num?)?.toDouble() ?? 0,
    );
  }
}

class CartModel {
  final String id;
  final List<CartItemModel> items;
  final int itemCount;
  final double totalAmount;

  CartModel({
    this.id = '',
    this.items = const [],
    this.itemCount = 0,
    this.totalAmount = 0,
  });

  factory CartModel.fromJson(Map<String, dynamic> json) {
    return CartModel(
      id: json['id']?.toString() ?? '',
      items: ((json['items'] as List?) ?? [])
          .map((e) => CartItemModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0,
    );
  }
}
