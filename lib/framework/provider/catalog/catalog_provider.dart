import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:dairy_app/framework/repository/category/category_model.dart';
import 'package:dairy_app/framework/repository/product/product_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CatalogState {
  final bool isLoading;
  final String? error;
  final List<ProductModel> products;
  final List<CategoryModel> categories;

  CatalogState({
    this.isLoading = false,
    this.error,
    this.products = const [],
    this.categories = const [],
  });

  CatalogState copyWith({
    bool? isLoading,
    String? error,
    List<ProductModel>? products,
    List<CategoryModel>? categories,
  }) {
    return CatalogState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      products: products ?? this.products,
      categories: categories ?? this.categories,
    );
  }
}

final catalogNotifierProvider = NotifierProvider<CatalogNotifier, CatalogState>(() {
  return CatalogNotifier();
});

class CatalogNotifier extends Notifier<CatalogState> {
  @override
  CatalogState build() {
    return CatalogState();
  }

  Future<void> fetchCatalog() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final repository = getIt<ProductRepository>();
      final result = await repository.fetchCatalogData();
      
      state = state.copyWith(
        isLoading: false,
        products: result['products'],
        categories: result['categories'],
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}
