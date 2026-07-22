import 'package:dairy_app/framework/controller/best_sellers/best_sellers_controller.dart';
import 'package:dairy_app/framework/controller/cart/cart_controller.dart';
import 'package:dairy_app/ui/products/product_details_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_button.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class BestSellers extends ConsumerStatefulWidget {
  const BestSellers({super.key});

  @override
  ConsumerState<BestSellers> createState() => _BestSellersConsumerState();
}

class _BestSellersConsumerState extends ConsumerState<BestSellers> {
  @override
  Widget build(BuildContext context) {
    final bestSellersWatch = ref.watch(bestSellersProvider);
    final products = bestSellersWatch.bestSellers;

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: _buildAppBar(context),
      body: products.isEmpty
          ? _buildEmptyState()
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: products.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.65,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemBuilder: (context, index) {
                final item = products[index];
                final product = item.product;
                return GestureDetector(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => ProductDetailsScreen(product: product),
                    ),
                  ),
                  child: CommonContainer(
                    color: AppColors.clrWhiteFFFFFF,
                    borderRadius: BorderRadius.circular(16),
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        /// Product Image & Tag
                        Stack(
                          children: [
                            CommonContainer(
                              height: 120,
                              width: double.infinity,
                              color: AppColors.clrF7F7F7,
                              borderRadius: BorderRadius.circular(12),
                              alignment: Alignment.center,
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  product.image ?? '',
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) =>
                                      const CommonIcon(
                                    icon: Icons.local_drink,
                                    color: AppColors.clr6156F1,
                                    size: 40,
                                  ),
                                ),
                              ),
                            ),
                            Positioned(
                              top: 0,
                              right: 0,
                              child: CommonContainer(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                color: AppColors.clrYellowFBC02D,
                                borderRadius: const BorderRadius.only(
                                  bottomLeft: Radius.circular(8),
                                  topRight: Radius.circular(12),
                                ),
                                child: CommonText(
                                  data: item.tag,
                                  style: TextStyles.bold.copyWith(
                                    fontSize: 10,
                                    color: AppColors.clrWhiteFFFFFF,
                                  ),
                                ),
                              ),
                            ),
                          ],
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
                          maxLines: 1,
                        ),
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
                              width: 60,
                              borderRadius: BorderRadius.circular(8),
                              buttonTextStyle: TextStyles.bold.copyWith(
                                color: AppColors.clrWhiteFFFFFF,
                                fontSize: 11,
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

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.clrWhiteFFFFFF,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded,
            color: AppColors.clr101828, size: 20),
        onPressed: () => Navigator.pop(context),
      ),
      title: CommonText(
        data: "Best Sellers",
        style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CommonIcon(
            icon: Icons.star_outline_rounded,
            size: 80,
            color: AppColors.clrGrey,
          ),
          const SizedBox(height: 16),
          CommonText(
            data: "No Best Sellers found",
            style: TextStyles.medium.copyWith(color: AppColors.clrGrey757575),
          ),
        ],
      ),
    );
  }
}
