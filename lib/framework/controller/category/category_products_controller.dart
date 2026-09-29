import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:dairy_app/framework/repository/category/category_model.dart';
import 'package:dairy_app/framework/repository/product/product_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

enum ProductSort { recommended, priceLowToHigh, priceHighToLow, nameAZ }

extension ProductSortLabel on ProductSort {
  String get label {
    switch (this) {
      case ProductSort.priceLowToHigh:
        return 'Price: Low to High';
      case ProductSort.priceHighToLow:
        return 'Price: High to Low';
      case ProductSort.nameAZ:
        return 'Name: A to Z';
      case ProductSort.recommended:
        return 'Recommended';
    }
  }
}

/// One controller per category, disposed when the screen goes away.
final categoryProductsProvider =
    ChangeNotifierProvider.family<CategoryProductsController, String>(
  (ref, categoryId) => CategoryProductsController(categoryId)..load(),
);

class CategoryProductsController extends ChangeNotifier {
  CategoryProductsController(this.categoryId);

  final String categoryId;

  ProductRepository get _repository => getIt<ProductRepository>();

  CategoryDetailModel? _detail;
  bool _isLoading = false;
  String? _error;

  /// null = "All"; otherwise the selected sub-category chip.
  String? _selectedSubCategoryId;
  ProductSort _sort = ProductSort.recommended;
  String _search = '';

  CategoryModel? get category => _detail?.category;
  List<SubCategoryModel> get subCategories => _detail?.subCategories ?? const [];
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get selectedSubCategoryId => _selectedSubCategoryId;
  ProductSort get sort => _sort;
  String get search => _search;

  /// True when the customer has narrowed the list themselves — lets the screen
  /// tell "this category is empty" apart from "your filter matched nothing".
  bool get hasActiveFilter => _selectedSubCategoryId != null || _search.trim().isNotEmpty;

  int get totalInCategory => _detail?.total ?? 0;

  List<ProductModel> get products {
    var list = List<ProductModel>.from(_detail?.products ?? const []);

    if (_selectedSubCategoryId != null) {
      list = list.where((p) => p.subCategoryId == _selectedSubCategoryId).toList();
    }

    final needle = _search.trim().toLowerCase();
    if (needle.isNotEmpty) {
      list = list
          .where((p) =>
              p.name.toLowerCase().contains(needle) ||
              p.volume.toLowerCase().contains(needle) ||
              p.brand.toLowerCase().contains(needle))
          .toList();
    }

    switch (_sort) {
      case ProductSort.priceLowToHigh:
        list.sort((a, b) => a.price.compareTo(b.price));
        break;
      case ProductSort.priceHighToLow:
        list.sort((a, b) => b.price.compareTo(a.price));
        break;
      case ProductSort.nameAZ:
        list.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
        break;
      case ProductSort.recommended:
        // Keep the admin's display order, but never lead with something
        // the customer can't actually buy.
        list.sort((a, b) {
          if (a.inStock == b.inStock) return 0;
          return a.inStock ? -1 : 1;
        });
        break;
    }

    return list;
  }

  Future<void> load() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final detail = await _repository.fetchCategoryDetail(categoryId);
    if (detail == null) {
      _error = 'We could not load this category. Please try again.';
    } else {
      _detail = detail;
      // A chip that no longer exists would silently hide every product.
      if (_selectedSubCategoryId != null &&
          !detail.subCategories.any((s) => s.id == _selectedSubCategoryId)) {
        _selectedSubCategoryId = null;
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  void selectSubCategory(String? subCategoryId) {
    if (_selectedSubCategoryId == subCategoryId) return;
    _selectedSubCategoryId = subCategoryId;
    notifyListeners();
  }

  void setSort(ProductSort sort) {
    if (_sort == sort) return;
    _sort = sort;
    notifyListeners();
  }

  void setSearch(String value) {
    if (_search == value) return;
    _search = value;
    notifyListeners();
  }

  void clearFilters() {
    _selectedSubCategoryId = null;
    _search = '';
    notifyListeners();
  }
}
