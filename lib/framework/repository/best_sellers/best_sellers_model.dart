import '../cart/product_model.dart';

class BestSellersModel {
  final ProductModel product;
  final String tag;

  BestSellersModel({
    required this.product,
    this.tag = 'Must Try',
  });
}
