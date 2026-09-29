import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dairy_app/framework/repository/cart/cart_item_model.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

/// Outcome of a cart mutation. [message] carries the server's own wording
/// (e.g. "This item is out of stock right now.") so the UI can show the real
/// reason instead of a generic failure.
class CartResult {
  final CartModel? cart;
  final String? message;

  const CartResult({this.cart, this.message});

  bool get isSuccess => cart != null;
}

@injectable
class CartRepository {
  final Dio _dio;

  CartRepository(this._dio);

  Future<CartModel?> getCart() async {
    try {
      final response = await _dio.get(ApiEndpoints.cart);
      if (response.data['success'] == true) {
        return CartModel.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<CartResult> addItem({
    required String productId,
    String? variantId,
    String purchaseType = 'BUY_ONCE',
    int quantity = 1,
  }) async {
    try {
      final response = await _dio.post(ApiEndpoints.cartItems, data: {
        'productId': productId,
        if (variantId != null) 'variantId': variantId,
        'purchaseType': purchaseType,
        'quantity': quantity,
      });
      if (response.data['success'] == true) {
        return CartResult(
          cart: CartModel.fromJson(response.data['data'] as Map<String, dynamic>),
        );
      }
      return CartResult(message: response.data['message']?.toString());
    } on DioException catch (e) {
      // The server rejects sold-out and hidden products with a 409 and a
      // customer-facing message; pass it straight through.
      final data = e.response?.data;
      final message = data is Map ? data['message']?.toString() : null;
      return CartResult(message: message);
    } catch (_) {
      return const CartResult();
    }
  }

  Future<CartModel?> updateQuantity({required String itemId, required int quantity}) async {
    try {
      final response = await _dio.patch('${ApiEndpoints.cartItems}/$itemId', data: {'quantity': quantity});
      if (response.data['success'] == true) {
        return CartModel.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<CartModel?> removeItem(String itemId) async {
    try {
      final response = await _dio.delete('${ApiEndpoints.cartItems}/$itemId');
      if (response.data['success'] == true) {
        return CartModel.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<CartModel?> clearCart() async {
    try {
      final response = await _dio.delete(ApiEndpoints.cart);
      if (response.data['success'] == true) {
        return CartModel.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
