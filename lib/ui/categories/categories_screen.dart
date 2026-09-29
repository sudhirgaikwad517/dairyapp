import 'package:dairy_app/framework/controller/base/base_controller.dart';
import 'package:dairy_app/framework/controller/cart/cart_controller.dart';
import 'package:dairy_app/framework/provider/catalog/catalog_provider.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:dairy_app/framework/repository/category/category_model.dart';
import 'package:dairy_app/ui/cart/add_to_cart_sheet.dart';
import 'package:dairy_app/ui/category/category_products_screen.dart';
import 'package:dairy_app/ui/products/product_details_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Browse by category. Picking a category opens [CategoryProductsScreen];
/// typing in the search box switches to product results across every category.
class CategoriesScreen extends ConsumerStatefulWidget {
  const CategoriesScreen({super.key});
  @override
  ConsumerState<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends ConsumerState<CategoriesScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      final catalog = ref.read(catalogNotifierProvider);
      if (catalog.categories.isEmpty && !catalog.isLoading) {
        ref.read(catalogNotifierProvider.notifier).fetchCatalog();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  bool get _isSearching => _searchQuery.trim().isNotEmpty;

  List<ProductModel> _searchResults(List<ProductModel> products) {
    final query = _searchQuery.trim().toLowerCase();
    return products
        .where((product) =>
            product.name.toLowerCase().contains(query) ||
            product.brand.toLowerCase().contains(query) ||
            product.volume.toLowerCase().contains(query) ||
            product.category.toLowerCase().contains(query))
        .toList();
  }

  void _openCategory(CategoryModel category) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CategoryProductsScreen(
          categoryId: category.id,
          categoryLabel: category.label,
        ),
      ),
    );
  }

  void _openCart() {
    ref.read(baseProvider).selectTabByTitle('Cart');
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final cartCount = ref.watch(cartProvider).cartCount;
    final catalogState = ref.watch(catalogNotifierProvider);

    return SafeArea(
      bottom: false,
      child: Container(
        color: AppColors.clrF7F7F7,
        child: Column(
          children: [
            _Header(cartCount: cartCount, onCartTap: _openCart),
            _buildSearchField(),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => ref.read(catalogNotifierProvider.notifier).fetchCatalog(),
                child: _isSearching
                    ? _buildSearchResults(catalogState.products)
                    : _buildCategoryList(catalogState),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchField() {
    return Container(
      color: AppColors.clrWhiteFFFFFF,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 14),
      child: TextField(
        controller: _searchController,
        onChanged: (value) => setState(() => _searchQuery = value),
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          isDense: true,
          hintText: 'Search milk, paneer, ghee…',
          hintStyle: TextStyles.regular.copyWith(fontSize: 14, color: AppColors.clrGrey757575),
          prefixIcon: const Icon(Icons.search_rounded, color: AppColors.clr6156F1),
          suffixIcon: _searchQuery.isEmpty
              ? null
              : IconButton(
                  icon: const Icon(Icons.close_rounded),
                  tooltip: 'Clear search',
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                ),
          filled: true,
          fillColor: AppColors.clrF7F7F7,
          contentPadding: const EdgeInsets.symmetric(vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.grayEAECF0),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: AppColors.clr6156F1, width: 1.5),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryList(CatalogState catalogState) {
    if (catalogState.isLoading && catalogState.categories.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (catalogState.categories.isEmpty) {
      return _EmptyState(
        icon: Icons.category_outlined,
        title: 'No categories yet',
        message: 'Pull down to refresh once products are added.',
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      itemCount: catalogState.categories.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, index) {
        final category = catalogState.categories[index];
        // productCount comes from /categories; the flat catalog is the
        // fallback when this list was built from the combined payload.
        final count = category.productCount > 0
            ? category.productCount
            : catalogState.products.where((p) => p.categoryId == category.id).length;

        return _CategoryTile(
          category: category,
          productCount: count,
          onTap: () => _openCategory(category),
        );
      },
    );
  }

  Widget _buildSearchResults(List<ProductModel> allProducts) {
    final products = _searchResults(allProducts);

    if (products.isEmpty) {
      return _EmptyState(
        icon: Icons.search_off_rounded,
        title: 'No products found',
        message: 'Try another product name, or browse by category.',
        actionLabel: 'Clear search',
        onAction: () {
          _searchController.clear();
          setState(() => _searchQuery = '');
        },
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final count = constraints.maxWidth >= 1100
            ? 4
            : constraints.maxWidth >= 700
                ? 3
                : 2;
        return GridView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          itemCount: products.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: count,
            mainAxisSpacing: 14,
            crossAxisSpacing: 14,
            // A fixed vertical extent gives the text/actions room to breathe
            // on compact phones and accessibility fonts.
            mainAxisExtent: count >= 3 ? 320 : 300,
          ),
          itemBuilder: (context, index) => _ProductCard(product: products[index]),
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  final int cartCount;
  final VoidCallback onCartTap;
  const _Header({required this.cartCount, required this.onCartTap});

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
              child: const Icon(Icons.local_drink_rounded, color: AppColors.clr6156F1),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Fresh dairy, daily',
                    style: TextStyles.bold.copyWith(fontSize: 17, color: AppColors.clr101828),
                  ),
                  Text(
                    'Delivered fresh to your door',
                    style: TextStyles.regular.copyWith(fontSize: 11, color: AppColors.clrGrey757575),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: onCartTap,
              tooltip: 'Cart',
              icon: Badge(
                label: Text('$cartCount'),
                isLabelVisible: cartCount > 0,
                backgroundColor: AppColors.clr6156F1,
                child: const Icon(Icons.shopping_bag_outlined, size: 26, color: AppColors.clr101828),
              ),
            ),
          ],
        ),
      );
}

class _CategoryTile extends StatelessWidget {
  final CategoryModel category;
  final int productCount;
  final VoidCallback onTap;

  const _CategoryTile({
    required this.category,
    required this.productCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.clrWhiteFFFFFF,
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  height: 72,
                  width: 72,
                  child: (category.image == null || category.image!.isEmpty)
                      ? const ColoredBox(
                          color: AppColors.clrD7D7FF,
                          child: Icon(Icons.layers, color: AppColors.clr6156F1, size: 32),
                        )
                      : Image.network(
                          category.image!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const ColoredBox(
                            color: AppColors.clrD7D7FF,
                            child: Icon(Icons.layers, color: AppColors.clr6156F1, size: 32),
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      category.label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clr101828),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      productCount == 0
                          ? 'Tap to browse'
                          : '$productCount item${productCount == 1 ? '' : 's'}',
                      style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
                    ),
                    if (category.description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        category.description,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                      ),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: AppColors.clrGrey757575),
            ],
          ),
        ),
      ),
    );
  }
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
            MaterialPageRoute(builder: (_) => ProductDetailsScreen(product: product)),
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
                        child: Icon(Icons.local_drink, size: 42, color: AppColors.clr6156F1),
                      ),
                    ),
                    if (product.badge.isNotEmpty)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.clr6156F1,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            product.badge,
                            style: TextStyles.bold.copyWith(fontSize: 10, color: AppColors.clrWhiteFFFFFF),
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
                        style: TextStyles.medium.copyWith(fontSize: 11, color: AppColors.clr6156F1),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr101828),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        product.volume,
                        style: TextStyles.regular.copyWith(fontSize: 11, color: AppColors.clrGrey757575),
                      ),
                      const Spacer(),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, size: 15, color: AppColors.clrYellowFBC02D),
                          Text(
                            ' ${product.rating}',
                            style: TextStyles.medium.copyWith(fontSize: 11, color: AppColors.clrGrey757575),
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
                                  style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
                                ),
                                if (product.hasMrp)
                                  Text(
                                    '${AppConstants.currency}${product.mrp.toStringAsFixed(0)}',
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
                            onPressed: product.inStock
                                ? () => showAddToCartSheet(context, product)
                                : null,
                            icon: const Icon(Icons.add),
                            color: AppColors.clrWhiteFFFFFF,
                            visualDensity: VisualDensity.compact,
                            style: IconButton.styleFrom(
                              backgroundColor: AppColors.clr6156F1,
                              disabledBackgroundColor: AppColors.grayEAECF0,
                              minimumSize: const Size(34, 34),
                              padding: EdgeInsets.zero,
                            ),
                            tooltip: product.inStock ? 'Add to cart' : 'Sold out',
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

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 80, 24, 24),
            child: Column(
              children: [
                Icon(icon, size: 56, color: AppColors.clrGrey),
                const SizedBox(height: 12),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
                ),
                const SizedBox(height: 6),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: TextStyles.regular.copyWith(color: AppColors.clrGrey757575),
                ),
                if (actionLabel != null && onAction != null)
                  TextButton(onPressed: onAction, child: Text(actionLabel!)),
              ],
            ),
          ),
        ],
      );
}
