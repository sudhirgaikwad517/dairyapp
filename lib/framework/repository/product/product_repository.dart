import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:dairy_app/framework/repository/category/category_model.dart';
import 'package:dio/dio.dart';
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
        print('Error fetching catalog: ${e.response?.data}');
      } else {
        print('Error fetching catalog: $e');
      }
      return {'products': <ProductModel>[], 'categories': <CategoryModel>[]};
    }
  }
}
