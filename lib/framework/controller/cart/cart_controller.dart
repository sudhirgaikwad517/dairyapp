import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/cart/cart_item_model.dart';
import 'package:dairy_app/framework/repository/cart/cart_repository.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

final cartProvider = ChangeNotifierProvider((ref) => CartController()..loadCart());

/// Server-backed cart. Every mutation goes to the API (keyed by the login
/// session id that [DioInterceptors] attaches) and the response replaces
/// local state, so the cart survives app restarts and matches the website.
class CartController extends ChangeNotifier {
  CartModel _cart = CartModel();
  bool _isLoading = false;
  String? _error;

  CartRepository get _repository => getIt<CartRepository>();

  List<CartItemModel> get cartItems => _cart.items;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get cartCount => _cart.itemCount;

  double get subtotal => _cart.totalAmount;

  double get gst => subtotal * 0.05;

  double get totalAmount => subtotal + gst;

  /// The cart line for a product, or null when it isn't in the cart.
  /// Quantity steppers need the line id, not the product id.
  CartItemModel? lineForProduct(String productId) {
    for (final item in _cart.items) {
      if (item.productId == productId) return item;
    }
    return null;
  }

  int quantityOfProduct(String productId) => _cart.items
      .where((item) => item.productId == productId)
      .fold<int>(0, (total, item) => total + item.quantity);

  Future<void> loadCart() async {
    _isLoading = true;
    notifyListeners();
    final cart = await _repository.getCart();
    _apply(cart, fallbackError: 'Unable to load your cart');
  }

  /// Returns null on success, or the reason the item couldn't be added
  /// (out of stock, no longer available, network) so the screen can show it.
  Future<String?> addToCart(ProductModel product, {int quantity = 1}) async {
    final result = await _repository.addItem(productId: product.id, quantity: quantity);
    final fallback = 'Unable to add ${product.name} to cart';
    _apply(result.cart, fallbackError: result.message ?? fallback);
    return result.isSuccess ? null : (result.message ?? fallback);
  }

  Future<void> increment(CartItemModel item) async {
    final cart = await _repository.updateQuantity(itemId: item.id, quantity: item.quantity + 1);
    _apply(cart, fallbackError: 'Unable to update quantity');
  }

  /// Drops the quantity by one, removing the line entirely at zero.
  Future<void> decrement(CartItemModel item) async {
    final cart = await _repository.updateQuantity(itemId: item.id, quantity: item.quantity - 1);
    _apply(cart, fallbackError: 'Unable to update quantity');
  }

  Future<void> removeItem(CartItemModel item) async {
    final cart = await _repository.removeItem(item.id);
    _apply(cart, fallbackError: 'Unable to remove item');
  }

  Future<void> clearCart() async {
    final cart = await _repository.clearCart();
    _apply(cart, fallbackError: 'Unable to clear cart');
  }

  void _apply(CartModel? cart, {required String fallbackError}) {
    _isLoading = false;
    if (cart != null) {
      _cart = cart;
      _error = null;
    } else {
      _error = fallbackError;
    }
    notifyListeners();
  }
}
