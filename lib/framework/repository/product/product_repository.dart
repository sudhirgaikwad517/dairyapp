import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:dairy_app/framework/repository/category/category_model.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:injectable/injectable.dart';

@injectable
class ProductRepository {
  final Dio _dio;

  ProductRepository(this._dio);

  Future<Map<String, dynamic>> fetchCatalogData() async {
    try {
      final response = await _dio.get(ApiEndpoints.getProducts);
      
      if (response.data['success'] == true && response.data['data'] != null) {
        final productsData = response.data['data']['products'] as List? ?? [];
        final categoriesData = response.data['data']['categories'] as List? ?? [];
        
        final products = productsData.map((e) => ProductModel.fromJson(e)).toList();
        final categories = categoriesData.map((e) => CategoryModel.fromJson(e)).toList();
        
        return {
          'products': products,
          'categories': categories,
        };
      }
      return {'products': <ProductModel>[], 'categories': <CategoryModel>[]};
    } catch (e) {
      if (e is DioException) {
        debugPrint('Error fetching catalog: ${e.response?.data}');
      } else {
        debugPrint('Error fetching catalog: $e');
      }
      return {'products': <ProductModel>[], 'categories': <CategoryModel>[]};
    }
  }

  /// Category header, sub-category chips and products in one call.
  /// Returns null on failure so the screen can show a retry instead of an
  /// empty list that looks like "this category has nothing in it".
  Future<CategoryDetailModel?> fetchCategoryDetail(
    String categoryId, {
    String? subCategoryId,
  }) async {
    try {
      final response = await _dio.get(
        ApiEndpoints.categoryDetail(categoryId),
        queryParameters: {
          if (subCategoryId != null && subCategoryId.isNotEmpty) 'subCategory': subCategoryId,
        },
      );

      if (response.data['success'] == true && response.data['data'] != null) {
        return CategoryDetailModel.fromJson(
          Map<String, dynamic>.from(response.data['data'] as Map),
        );
      }
      return null;
    } catch (e) {
      if (e is DioException) {
        debugPrint('Error fetching category $categoryId: ${e.response?.data}');
      } else {
        debugPrint('Error fetching category $categoryId: $e');
      }
      return null;
    }
  }
}
