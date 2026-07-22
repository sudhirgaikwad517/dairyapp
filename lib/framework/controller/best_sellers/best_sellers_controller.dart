import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';
import '../../repository/best_sellers/best_sellers_model.dart';
import '../../repository/cart/catalog_data.dart';

final bestSellersProvider = ChangeNotifierProvider((ref) => BestSellersController());

class BestSellersController extends ChangeNotifier {
  List<BestSellersModel> get bestSellers => CatalogData.products
      .where((product) => product.isPopular)
      .map((product) => BestSellersModel(product: product))
      .toList();
}
