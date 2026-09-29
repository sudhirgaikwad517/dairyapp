import 'package:dairy_app/framework/repository/base/base_model.dart';
import 'package:dairy_app/ui/cart/cart_screen.dart';
import 'package:dairy_app/ui/categories/categories_screen.dart';
import 'package:dairy_app/ui/home/home_screen.dart';
import 'package:dairy_app/ui/orders/orders_screen.dart';
import 'package:dairy_app/ui/subscription/subscription_screen.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

final baseProvider = ChangeNotifierProvider((ref) => BaseController());

class BaseController extends ChangeNotifier{


  int selectedIndex = 0;

  List<BaseModel> bottomList = [
    BaseModel(title: 'Home', iconName: CommonIcon(icon : Icons.home_outlined), screen: HomeScreen()),
    BaseModel(title: 'Categories', iconName: CommonIcon(icon : Icons.category_outlined), screen: CategoriesScreen()),
    BaseModel(title: 'Orders', iconName:  CommonIcon(icon : Icons.delivery_dining_outlined), screen: OrdersScreen()),
    BaseModel(title: 'Subscription', iconName:  CommonIcon(icon : Icons.collections_bookmark_outlined), screen: SubscriptionScreen()),
    BaseModel(title: 'Cart', iconName:  CommonIcon(icon : Icons.card_travel_rounded), screen: CartScreen()),

  ];

  void updateIndex(int index){
    selectedIndex = index;
    notifyListeners();
  }

  /// Switches the bottom-nav to a tab by its title. Tab screens have no
  /// Scaffold of their own, so they must be shown through this shell rather
  /// than pushed as a standalone route.
  void selectTabByTitle(String title) {
    final index = bottomList.indexWhere((tab) => tab.title == title);
    if (index != -1) updateIndex(index);
  }

}