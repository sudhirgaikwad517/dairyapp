import 'package:dairy_app/framework/repository/cart/product_model.dart';

class CategoryModel {
  final String id;
  final String label;
  final String? tile;
  final String? image;
  final String description;
  final String subscriptionNote;
  final int productCount;

  CategoryModel({
    required this.id,
    required this.label,
    this.tile,
    this.image,
    this.description = '',
    this.subscriptionNote = '',
    this.productCount = 0,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      tile: json['tile']?.toString(),
      image: json['imageUrl']?.toString(),
      description: json['description']?.toString() ?? '',
      subscriptionNote: json['subscriptionNote']?.toString() ?? '',
      productCount: (json['productCount'] as num?)?.toInt() ??
          (json['items'] as List?)?.length ??
          0,
    );
  }
}

/// One filter chip on the category screen.
class SubCategoryModel {
  final String id;
  final String label;
  final int productCount;

  SubCategoryModel({required this.id, required this.label, this.productCount = 0});

  factory SubCategoryModel.fromJson(Map<String, dynamic> json) {
    return SubCategoryModel(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      productCount: (json['productCount'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Everything the category screen renders, from one API call.
class CategoryDetailModel {
  final CategoryModel category;
  final List<SubCategoryModel> subCategories;
  final List<ProductModel> products;
  final int total;

  CategoryDetailModel({
    required this.category,
    this.subCategories = const [],
    this.products = const [],
    this.total = 0,
  });

  factory CategoryDetailModel.fromJson(Map<String, dynamic> json) {
    final products = (json['products'] as List? ?? [])
        .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
        .toList();

    return CategoryDetailModel(
      category: CategoryModel.fromJson(
        (json['category'] as Map<String, dynamic>?) ?? const {},
      ),
      subCategories: (json['subCategories'] as List? ?? [])
          .map((e) => SubCategoryModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      products: products,
      total: (json['total'] as num?)?.toInt() ?? products.length,
    );
  }
}
