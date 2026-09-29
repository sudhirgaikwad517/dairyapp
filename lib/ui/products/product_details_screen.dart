import 'package:dairy_app/framework/controller/cart/cart_controller.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:dairy_app/ui/subscription/subscribe_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ProductDetailsScreen extends ConsumerWidget {
  final ProductModel product;

  const ProductDetailsScreen({super.key, required this.product});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final quantity = cart.quantityOfProduct(product.id);

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: AppBar(
        backgroundColor: AppColors.clrWhiteFFFFFF,
        elevation: 0,
        surfaceTintColor: AppColors.clrWhiteFFFFFF,
        title: Text(
          'Product details',
          style: TextStyles.bold.copyWith(color: AppColors.clr101828),
        ),
      ),
      body: SafeArea(
        top: false,
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 700;
            final content = _ProductInfo(product: product, isWide: isWide);
            return SingleChildScrollView(
              padding: EdgeInsets.fromLTRB(
                isWide ? 48 : 16,
                20,
                isWide ? 48 : 16,
                112,
              ),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 1000),
                  child: isWide
                      ? Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: _ProductImage(
                                product: product,
                                height: 420,
                              ),
                            ),
                            const SizedBox(width: 40),
                            Expanded(child: content),
                          ],
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _ProductImage(product: product, height: 310),
                            const SizedBox(height: 24),
                            content,
                          ],
                        ),
                ),
              ),
            );
          },
        ),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        child: SizedBox(
          height: 52,
          child: Row(
            children: [
              if (product.inStock && product.allowSubscription) ...[
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => SubscribeScreen(product: product)),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.clr6156F1,
                      side: const BorderSide(color: AppColors.clr6156F1),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.autorenew_rounded, size: 18),
                    label: const Text('Subscribe'),
                  ),
                ),
                const SizedBox(width: 12),
              ],
              Expanded(
                flex: (product.inStock && product.allowSubscription) ? 1 : 2,
                child: FilledButton.icon(
                  onPressed: product.inStock
                      ? () async {
                          final error = await ref.read(cartProvider).addToCart(product);
                          if (!context.mounted) return;
                          ScaffoldMessenger.of(context)
                            ..hideCurrentSnackBar()
                            ..showSnackBar(
                              SnackBar(
                                content: Text(error ?? '${product.name} added to cart'),
                                backgroundColor:
                                    error == null ? null : AppColors.clrRedD32F2F,
                                duration: Duration(seconds: error == null ? 1 : 3),
                              ),
                            );
                        }
                      : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.clr6156F1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  icon: Icon(
                    product.inStock
                        ? (quantity > 0
                            ? Icons.add_shopping_cart
                            : Icons.shopping_bag_outlined)
                        : Icons.remove_shopping_cart_outlined,
                  ),
                  label: Text(
                    !product.inStock
                        ? 'Sold out'
                        : quantity > 0
                            ? 'Add another • $quantity in cart'
                            : 'Buy Once',
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductImage extends StatelessWidget {
  final ProductModel product;
  final double height;
  const _ProductImage({required this.product, required this.height});

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(24),
    child: SizedBox(
      height: height,
      width: double.infinity,
      child: Image.network(
        product.image ?? '',
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => const ColoredBox(
          color: AppColors.clrD7D7FF,
          child: Icon(Icons.local_drink, size: 72, color: AppColors.clr6156F1),
        ),
      ),
    ),
  );
}

class _ProductInfo extends StatelessWidget {
  final ProductModel product;
  final bool isWide;
  const _ProductInfo({required this.product, required this.isWide});

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        product.brand.toUpperCase(),
        style: TextStyles.bold.copyWith(
          fontSize: 12,
          letterSpacing: 1,
          color: AppColors.clr6156F1,
        ),
      ),
      const SizedBox(height: 8),
      Text(
        product.name,
        style: TextStyles.extraBold.copyWith(
          fontSize: isWide ? 32 : 26,
          color: AppColors.clr101828,
        ),
      ),
      const SizedBox(height: 8),
      Row(
        children: [
          const Icon(
            Icons.star_rounded,
            color: AppColors.clrYellowFBC02D,
            size: 20,
          ),
          const SizedBox(width: 4),
          Text(
            '${product.rating} rating',
            style: TextStyles.medium.copyWith(color: AppColors.clrGrey757575),
          ),
          const SizedBox(width: 12),
          Text(
            '• ${product.volume}',
            style: TextStyles.regular.copyWith(color: AppColors.clrGrey757575),
          ),
        ],
      ),
      const SizedBox(height: 24),
      Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            '${AppConstants.currency}${product.price.toStringAsFixed(0)}',
            style: TextStyles.extraBold.copyWith(
              fontSize: 28,
              color: AppColors.clr101828,
            ),
          ),
          const SizedBox(width: 10),
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(
              '${AppConstants.currency}${product.originalPrice.toStringAsFixed(0)}',
              style: TextStyles.regular.copyWith(
                color: AppColors.clrGrey757575,
                decoration: TextDecoration.lineThrough,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(
              '${(((product.originalPrice - product.price) / product.originalPrice) * 100).round()}% off',
              style: TextStyles.bold.copyWith(color: AppColors.clr34C759),
            ),
          ),
        ],
      ),
      const SizedBox(height: 28),
      Text(
        'About this product',
        style: TextStyles.bold.copyWith(
          fontSize: 18,
          color: AppColors.clr101828,
        ),
      ),
      const SizedBox(height: 8),
      Text(
        product.description,
        style: TextStyles.regular.copyWith(
          fontSize: 15,
          height: 1.5,
          color: AppColors.clrGrey757575,
        ),
      ),
      const SizedBox(height: 24),
      _Feature(
        icon: Icons.local_shipping_outlined,
        title: 'Fresh delivery',
        subtitle: 'Chilled and handled with care',
      ),
      const SizedBox(height: 12),
      _Feature(
        icon: Icons.verified_outlined,
        title: 'Quality checked',
        subtitle: 'Packed after a quality inspection',
      ),
    ],
  );
}

class _Feature extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _Feature({
    required this.icon,
    required this.title,
    required this.subtitle,
  });
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Container(
        padding: const EdgeInsets.all(10),
        decoration: const BoxDecoration(
          color: AppColors.clrD7D7FF,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: AppColors.clr6156F1),
      ),
      const SizedBox(width: 12),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyles.bold.copyWith(color: AppColors.clr101828),
            ),
            Text(
              subtitle,
              style: TextStyles.regular.copyWith(
                fontSize: 12,
                color: AppColors.clrGrey757575,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}
