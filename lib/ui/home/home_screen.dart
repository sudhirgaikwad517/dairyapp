import 'package:dairy_app/framework/controller/address/address_controller.dart';
import 'package:dairy_app/framework/controller/cart/cart_controller.dart';
import 'package:dairy_app/framework/repository/cart/catalog_data.dart';
import 'package:dairy_app/ui/address/address_screen.dart';
import 'package:dairy_app/ui/best_sellers/best_sellers_screen.dart';
import 'package:dairy_app/ui/menu/menu_screen.dart';
import 'package:dairy_app/ui/products/product_details_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_button.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:dairy_app/ui/wallet/wallet_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenConsumerState();
}

class _HomeScreenConsumerState extends ConsumerState<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    final watchAddress = ref.watch(addressProvider);
    final selectedAddress = watchAddress.selectedAddress;

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              /// Top Bar with Address
              _buildTopBar(selectedAddress?.address ?? "Select Address"),

              /// Banner
              _buildBanner(),

              const SizedBox(height: 24),

              /// Categories
              _buildSectionHeader(title : "Categories", navTitle: ''),
              const SizedBox(height: 16),
              _buildCategoriesList(),

              const SizedBox(height: 24),

              /// Best Sellers
              _buildSectionHeader(title: "Best Sellers", navTitle: "View All"),
              const SizedBox(height: 16),
              _buildBestSellersList(),

              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar(String address) {
    return Padding(
      padding: const EdgeInsets.all(AppConstants.defaultPadding),
      child: Row(
        children: [
          /// Logo (Placeholder)
          CommonContainer(
            height: 40,
            width: 40,
            color: AppColors.clr6156F1,
            borderRadius: BorderRadius.circular(8),
            alignment: Alignment.center,
            child: const CommonIcon(
              icon: Icons.local_drink,
              color: AppColors.clrWhiteFFFFFF,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const AddressScreen(),
                  ),
                );
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CommonText(
                        data: "Deliver to",
                        style: TextStyles.bold.copyWith(
                          fontSize: 14,
                          color: AppColors.clr101828,
                        ),
                      ),
                      const CommonIcon(
                        icon: Icons.keyboard_arrow_down,
                        size: 18,
                      ),
                    ],
                  ),
                  CommonText(
                    data: address,
                    style: TextStyles.regular.copyWith(
                      fontSize: 12,
                      color: AppColors.clrGrey757575,
                    ),
                    maxLines: 1,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),

          /// Wallet/Balance
          GestureDetector(
            onTap: (){
              Navigator.push(context, MaterialPageRoute(builder: (context)=> WalletScreen()));
            },
            child: CommonContainer(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              borderRadius: BorderRadius.circular(20),
              color: AppColors.clr101828,
              child: Row(
                children: [
                  const CommonIcon(
                    icon: Icons.account_balance_wallet_outlined,
                    color: AppColors.clrWhiteFFFFFF,
                    size: 16,
                  ),
                  const SizedBox(width: 6),
                  CommonText(
                    data: "${AppConstants.currency}0",
                    style: TextStyles.bold.copyWith(
                      color: AppColors.clrWhiteFFFFFF,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 14),
          GestureDetector(
            onTap: (){
              Navigator.push(context, MaterialPageRoute(builder: (context)=> MenuScreen()));
            },
            child: CommonIcon(
              icon: Icons.menu,
              size: 28,
            ),
          )
        ],
      ),
    );
  }

  Widget _buildBanner() {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppConstants.defaultPadding,
      ),
      child: CommonContainer(
        height: 180,
        width: double.infinity,
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [AppColors.clr6156F1, AppColors.clr6B60FE],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CommonText(
              data: "Subscribe once & Get",
              style: TextStyles.medium.copyWith(
                color: AppColors.clrWhiteFFFFFF,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 4),
            CommonText(
              data: "FREE",
              style: TextStyles.extraBold.copyWith(
                color: AppColors.clrWhiteFFFFFF,
                fontSize: 32,
              ),
            ),
            const SizedBox(height: 4),
            CommonText(
              data: "Proshakti product every Sunday.",
              style: TextStyles.regular.copyWith(
                color: AppColors.clrWhiteFFFFFF,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 12),
            CommonButton(
              onTap: () {},
              buttonText: "ORDER NOW",
              buttonColor: AppColors.clrWhiteFFFFFF,
              height: 32,
              width: 100,
              borderRadius: BorderRadius.circular(6),
              buttonTextStyle: TextStyles.bold.copyWith(
                color: AppColors.clr6156F1,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader({required String title, required String navTitle}) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppConstants.defaultPadding,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          CommonText(
            data: title,
            style: TextStyles.bold.copyWith(
              fontSize: 18,
              color: AppColors.clr101828,
            ),
          ),
          if(navTitle.isNotEmpty || navTitle != '')
            GestureDetector(
              onTap: (){
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (context)=>BestSellers())
                );
              },
              child: CommonText(
                data: navTitle,
                style: TextStyles.bold.copyWith(
                  fontSize: 18,
                  color: AppColors.clr101828,
                ),
              ),
            )
        ],
      ),
    );
  }

  Widget _buildCategoriesList() {
    final categories = ["Milk", "Ghee", "Paneer"];
    return SizedBox(
      height: 140,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(
          horizontal: AppConstants.defaultPadding,
        ),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 16),
        itemBuilder: (context, index) {
          return Column(
            children: [
              CommonContainer(
                height: 100,
                width: 100,
                color: AppColors.clrWhiteFFFFFF,
                borderRadius: BorderRadius.circular(12),
                alignment: Alignment.center,
                child: CommonIcon(
                  icon: index == 0
                      ? Icons.water_drop
                      : index == 1
                      ? Icons.opacity
                      : Icons.layers,
                  color: AppColors.clr6156F1,
                  size: 40,
                ),
              ),
              const SizedBox(height: 8),
              CommonText(
                data: categories[index],
                style: TextStyles.medium.copyWith(
                  fontSize: 14,
                  color: AppColors.clr101828,
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBestSellersList() {
    final products = CatalogData.products
        .where((product) => product.isPopular)
        .toList();

    return SizedBox(
      height: 320,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(
          horizontal: AppConstants.defaultPadding,
        ),
        scrollDirection: Axis.horizontal,
        itemCount: products.length,
        separatorBuilder: (context, index) => const SizedBox(width: 16),
        itemBuilder: (context, index) {
          final product = products[index];
          return GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ProductDetailsScreen(product: product),
              ),
            ),
            child: CommonContainer(
              width: 180,
              color: AppColors.clrWhiteFFFFFF,
              borderRadius: BorderRadius.circular(16),
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: 140,
                    width: double.infinity,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        product.image ?? '',
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const ColoredBox(
                              color: AppColors.clrD7D7FF,
                              child: Icon(
                                Icons.local_drink,
                                color: AppColors.clr6156F1,
                                size: 50,
                              ),
                            ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  CommonText(
                    data: product.brand,
                    style: TextStyles.regular.copyWith(
                      fontSize: 12,
                      color: AppColors.clrGrey757575,
                    ),
                  ),
                  const SizedBox(height: 4),
                  CommonText(
                    data: product.name,
                    style: TextStyles.bold.copyWith(
                      fontSize: 14,
                      color: AppColors.clr101828,
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 4),
                  CommonText(
                    data: product.volume,
                    style: TextStyles.regular.copyWith(
                      fontSize: 12,
                      color: AppColors.clrGrey757575,
                    ),
                  ),
                  const Spacer(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CommonText(
                            data:
                                "${AppConstants.currency}${product.price.toInt()}",
                            style: TextStyles.bold.copyWith(
                              fontSize: 16,
                              color: AppColors.clr101828,
                            ),
                          ),
                          CommonText(
                            data:
                                "${AppConstants.currency}${product.originalPrice.toInt()}",
                            style: TextStyles.regular.copyWith(
                              fontSize: 12,
                              color: AppColors.clrGrey757575,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ),
                      CommonButton(
                        onTap: () {
                          ref.read(cartProvider).addToCart(product);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text("${product.name} added to cart"),
                              duration: const Duration(seconds: 1),
                            ),
                          );
                        },
                        buttonText: "Add +",
                        buttonColor: AppColors.clr101828,
                        height: 32,
                        width: 65,
                        borderRadius: BorderRadius.circular(8),
                        buttonTextStyle: TextStyles.bold.copyWith(
                          color: AppColors.clrWhiteFFFFFF,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
