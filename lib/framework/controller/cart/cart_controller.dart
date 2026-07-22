import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

final cartProvider = ChangeNotifierProvider((ref) => CartController());

class CartController extends ChangeNotifier {
  final List<ProductModel> _cartItems = [];

  List<ProductModel> get cartItems => _cartItems;

  void addToCart(ProductModel product) {
    int index = _cartItems.indexWhere((item) => item.id == product.id);
    if (index != -1) {
      _cartItems[index].quantity++;
    } else {
      _cartItems.add(product.copyWith(quantity: 1));
    }
    notifyListeners();
  }

  void removeFromCart(String productId) {
    int index = _cartItems.indexWhere((item) => item.id == productId);
    if (index != -1) {
      if (_cartItems[index].quantity > 1) {
        _cartItems[index].quantity--;
      } else {
        _cartItems.removeAt(index);
      }
      notifyListeners();
    }
  }

  double get subtotal {
    return _cartItems.fold(0, (sum, item) => sum + (item.price * item.quantity));
  }

  double get gst => subtotal * 0.05;

  double get totalAmount => subtotal + gst;

  int get cartCount => _cartItems.fold(0, (sum, item) => sum + item.quantity);
}
