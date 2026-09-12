import 'package:dairy_app/framework/controller/cart/cart_controller.dart';
import 'package:dairy_app/framework/provider/catalog/catalog_provider.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:dairy_app/ui/cart/cart_screen.dart';
import 'package:dairy_app/ui/products/product_details_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CategoriesScreen extends ConsumerStatefulWidget {
  const CategoriesScreen({super.key});
  @override
  ConsumerState<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends ConsumerState<CategoriesScreen> {
  String _selectedCategory = 'All';
  String _searchQuery = '';

  List<ProductModel> _getVisibleProducts(List<ProductModel> products) {
    return products.where((product) {
      final matchesCategory =
          _selectedCategory == 'All' || product.category == _selectedCategory;
      final query = _searchQuery.trim().toLowerCase();
      final matchesSearch =
          query.isEmpty ||
          product.name.toLowerCase().contains(query) ||
          product.brand.toLowerCase().contains(query) ||
          product.category.toLowerCase().contains(query);
      return matchesCategory && matchesSearch;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final cartCount = ref.watch(cartProvider).cartCount;
    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          _Header(cartCount: cartCount),
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth >= 700;
                final catalogState = ref.watch(catalogNotifierProvider);
                final categories = catalogState.categories;
                final products = _getVisibleProducts(catalogState.products);
                
                final categoryNames = ['All', ...categories.map((c) => c.label)];

                return isWide
                    ? Row(
                        children: [
                          _CategoryRail(
                            selected: _selectedCategory,
                            onSelected: _selectCategory,
                            categories: categoryNames,
                          ),
                          Expanded(
                            child: _ProductArea(
                              products: products,
                              isWide: true,
                              categories: categoryNames,
                            ),
                          ),
                        ],
                      )
                    : _ProductArea(products: products, isWide: false, categories: categoryNames);
              },
            ),
          ),
        ],
      ),
    );
  }

  void _selectCategory(String category) =>
      setState(() => _selectedCategory = category);

  Widget _ProductArea({
    required List<ProductModel> products,
    required bool isWide,
    required List<String> categories,
  }) => Container(
    color: AppColors.clrF7F7F7,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(
            isWide ? 28 : 16,
            16,
            isWide ? 28 : 16,
            8,
          ),
          child: TextField(
            onChanged: (value) => setState(() => _searchQuery = value),
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: 'Search milk, paneer, ghee…',
              prefixIcon: const Icon(
                Icons.search_rounded,
                color: AppColors.clr6156F1,
              ),
              suffixIcon: _searchQuery.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => setState(() => _searchQuery = ''),
                    ),
              filled: true,
              fillColor: AppColors.clrWhiteFFFFFF,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppColors.grayEAECF0),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(
                  color: AppColors.clr6156F1,
                  width: 1.5,
                ),
              ),
            ),
          ),
        ),
        if (!isWide)
          _CategoryChips(
            selected: _selectedCategory,
            onSelected: _selectCategory,
            categories: categories,
          ),
        Padding(
          padding: EdgeInsets.fromLTRB(
            isWide ? 28 : 16,
            12,
            isWide ? 28 : 16,
            12,
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  _selectedCategory == 'All'
                      ? 'All products'
                      : _selectedCategory,
                  style: TextStyles.bold.copyWith(
                    fontSize: 20,
                    color: AppColors.clr101828,
                  ),
                ),
              ),
              Text(
                '${products.length} items',
                style: TextStyles.medium.copyWith(
                  color: AppColors.clrGrey757575,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: products.isEmpty
              ? _EmptyProducts(
                  onClear: () => setState(() {
                    _searchQuery = '';
                    _selectedCategory = 'All';
                  }),
                )
              : LayoutBuilder(
                  builder: (context, gridConstraints) {
                    final count = gridConstraints.maxWidth >= 1100
                        ? 4
                        : gridConstraints.maxWidth >= 700
                        ? 3
                        : 2;
                    return GridView.builder(
                      padding: EdgeInsets.fromLTRB(
                        isWide ? 28 : 16,
                        0,
                        isWide ? 28 : 16,
                        24,
                      ),
                      itemCount: products.length,
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: count,
                        mainAxisSpacing: 14,
                        crossAxisSpacing: 14,
                        // A fixed vertical extent gives the text/actions room
                        // to breathe on compact phones and accessibility fonts.
                        mainAxisExtent: count >= 3 ? 320 : 300,
                      ),
                      itemBuilder: (context, index) =>
                          _ProductCard(product: products[index]),
                    );
                  },
                ),
        ),
      ],
    ),
  );
}

class _Header extends StatelessWidget {
  final int cartCount;
  const _Header({required this.cartCount});
  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.clrWhiteFFFFFF,
    padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
    child: Row(
      children: [
        Container(
          padding: const EdgeInsets.all(9),
          decoration: BoxDecoration(
            color: AppColors.clrD7D7FF,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(
            Icons.local_drink_rounded,
            color: AppColors.clr6156F1,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Fresh dairy, daily',
                style: TextStyles.bold.copyWith(
                  fontSize: 17,
                  color: AppColors.clr101828,
                ),
              ),
              Text(
                'Delivered fresh to your door',
                style: TextStyles.regular.copyWith(
                  fontSize: 11,
                  color: AppColors.clrGrey757575,
                ),
              ),
            ],
          ),
        ),
        Badge(
            label: Text('$cartCount'),
            isLabelVisible: cartCount > 0,
            child: const Icon(
              Icons.shopping_bag_outlined,
              size: 27,
              color: AppColors.clr101828,
            ),
          ),
      ],
    ),
  );
}

class _CategoryRail extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onSelected;
  final List<String> categories;
  const _CategoryRail({required this.selected, required this.onSelected, required this.categories});
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 142,
    child: DecoratedBox(
      decoration: const BoxDecoration(
        color: AppColors.clrWhiteFFFFFF,
        border: Border(right: BorderSide(color: AppColors.grayEAECF0)),
      ),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 12),
        itemCount: categories.length,
        itemBuilder: (_, index) {
          final category = categories[index];
          final active = category == selected;
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            child: Material(
              color: active ? AppColors.clrD7D7FF : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                onTap: () => onSelected(category),
                borderRadius: BorderRadius.circular(12),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 12,
                  ),
                  child: Text(
                    category,
                    style: TextStyles.bold.copyWith(
                      color: active
                          ? AppColors.clr6156F1
                          : AppColors.clrGrey757575,
                    ),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    ),
  );
}

class _CategoryChips extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onSelected;
  final List<String> categories;
  const _CategoryChips({required this.selected, required this.onSelected, required this.categories});
  @override
  Widget build(BuildContext context) => SizedBox(
    height: 48,
    child: ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      scrollDirection: Axis.horizontal,
      itemCount: categories.length,
      separatorBuilder: (_, __) => const SizedBox(width: 8),
      itemBuilder: (_, index) {
        final category = categories[index];
        final active = category == selected;
        return ChoiceChip(
          label: Text(category),
          selected: active,
          onSelected: (_) => onSelected(category),
          selectedColor: AppColors.clrD7D7FF,
          labelStyle: TextStyles.bold.copyWith(
            fontSize: 13,
            color: active ? AppColors.clr6156F1 : AppColors.clrGrey757575,
          ),
          side: BorderSide(
            color: active ? AppColors.clr6156F1 : AppColors.grayEAECF0,
          ),
        );
      },
    ),
  );
}

class _ProductCard extends ConsumerWidget {
  final ProductModel product;
  const _ProductCard({required this.product});
  @override
  Widget build(BuildContext context, WidgetRef ref) => Material(
    color: AppColors.clrWhiteFFFFFF,
    borderRadius: BorderRadius.circular(18),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProductDetailsScreen(product: product),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 11,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(
                  product.image ?? '',
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const ColoredBox(
                    color: AppColors.clrD7D7FF,
                    child: Icon(
                      Icons.local_drink,
                      size: 42,
                      color: AppColors.clr6156F1,
                    ),
                  ),
                ),
                if (product.isPopular)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.clr6156F1,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Popular',
                        style: TextStyles.bold.copyWith(
                          fontSize: 10,
                          color: AppColors.clrWhiteFFFFFF,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            flex: 12,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 9, 10, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.brand,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyles.medium.copyWith(
                      fontSize: 11,
                      color: AppColors.clr6156F1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyles.bold.copyWith(
                      fontSize: 13,
                      color: AppColors.clr101828,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    product.volume,
                    style: TextStyles.regular.copyWith(
                      fontSize: 11,
                      color: AppColors.clrGrey757575,
                    ),
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      const Icon(
                        Icons.star_rounded,
                        size: 15,
                        color: AppColors.clrYellowFBC02D,
                      ),
                      Text(
                        ' ${product.rating}',
                        style: TextStyles.medium.copyWith(
                          fontSize: 11,
                          color: AppColors.clrGrey757575,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${AppConstants.currency}${product.price.toStringAsFixed(0)}',
                              style: TextStyles.bold.copyWith(
                                fontSize: 15,
                                color: AppColors.clr101828,
                              ),
                            ),
                            Text(
                              '${AppConstants.currency}${product.originalPrice.toStringAsFixed(0)}',
                              style: TextStyles.regular.copyWith(
                                fontSize: 10,
                                color: AppColors.clrGrey757575,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          ref.read(cartProvider).addToCart(product);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('${product.name} added to cart'),
                              duration: const Duration(seconds: 1),
                            ),
                          );
                        },
                        icon: const Icon(Icons.add),
                        color: AppColors.clrWhiteFFFFFF,
                        visualDensity: VisualDensity.compact,
                        style: IconButton.styleFrom(
                          backgroundColor: AppColors.clr6156F1,
                          minimumSize: const Size(34, 34),
                          padding: EdgeInsets.zero,
                        ),
                        tooltip: 'Add to cart',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _EmptyProducts extends StatelessWidget {
  final VoidCallback onClear;
  const _EmptyProducts({required this.onClear});
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.search_off_rounded,
            size: 56,
            color: AppColors.clrGrey,
          ),
          const SizedBox(height: 12),
          Text(
            'No products found',
            style: TextStyles.bold.copyWith(
              fontSize: 18,
              color: AppColors.clr101828,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Try another product name or category.',
            style: TextStyles.regular.copyWith(color: AppColors.clrGrey757575),
          ),
          TextButton(onPressed: onClear, child: const Text('Clear filters')),
        ],
      ),
    ),
  );
}
