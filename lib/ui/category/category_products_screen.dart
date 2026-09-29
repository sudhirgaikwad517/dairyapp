import 'package:dairy_app/framework/controller/base/base_controller.dart';
import 'package:dairy_app/framework/controller/cart/cart_controller.dart';
import 'package:dairy_app/framework/controller/category/category_products_controller.dart';
import 'package:dairy_app/framework/repository/cart/cart_item_model.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:dairy_app/ui/cart/add_to_cart_sheet.dart';
import 'package:dairy_app/ui/products/product_details_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Products inside one category. Reached by tapping a category tile on Home or
/// in the Categories tab.
class CategoryProductsScreen extends ConsumerStatefulWidget {
  const CategoryProductsScreen({
    super.key,
    required this.categoryId,
    this.categoryLabel = '',
  });

  final String categoryId;

  /// Shown in the app bar until the API reply arrives, so the header never
  /// flashes an empty title.
  final String categoryLabel;

  @override
  ConsumerState<CategoryProductsScreen> createState() => _CategoryProductsScreenState();
}

class _CategoryProductsScreenState extends ConsumerState<CategoryProductsScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _showSearch = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _toggleSearch() {
    setState(() {
      _showSearch = !_showSearch;
      if (!_showSearch) {
        _searchController.clear();
        ref.read(categoryProductsProvider(widget.categoryId)).setSearch('');
      }
    });
  }

  void _openCart() {
    // The cart lives inside the bottom-nav shell and has no Scaffold of its
    // own, so it must be reached by switching tabs, not pushed as a route.
    ref.read(baseProvider).selectTabByTitle('Cart');
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final controller = ref.watch(categoryProductsProvider(widget.categoryId));
    final cart = ref.watch(cartProvider);
    final products = controller.products;
    final title = controller.category?.label.isNotEmpty == true
        ? controller.category!.label
        : widget.categoryLabel;

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: AppBar(
        backgroundColor: AppColors.clrWhiteFFFFFF,
        surfaceTintColor: AppColors.clrWhiteFFFFFF,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        leading: IconButton(
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const CommonIcon(icon: Icons.arrow_back_ios_new_rounded, size: 20, color: AppColors.clr101828),
          tooltip: 'Back',
        ),
        titleSpacing: 0,
        title: CommonText(
          data: title.isEmpty ? 'Category' : title,
          style: TextStyles.bold.copyWith(fontSize: 20, color: AppColors.clr101828),
        ),
        actions: [
          IconButton(
            onPressed: _toggleSearch,
            icon: CommonIcon(
              icon: _showSearch ? Icons.close_rounded : Icons.search_rounded,
              size: 24,
              color: AppColors.clr101828,
            ),
            tooltip: _showSearch ? 'Close search' : 'Search in this category',
          ),
          IconButton(
            onPressed: _openCart,
            icon: Badge(
              label: Text('${cart.cartCount}'),
              isLabelVisible: cart.cartCount > 0,
              backgroundColor: AppColors.clr6156F1,
              child: const CommonIcon(
                icon: Icons.shopping_bag_outlined,
                size: 24,
                color: AppColors.clr101828,
              ),
            ),
            tooltip: 'Cart',
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            if (_showSearch) _buildSearchField(controller),
            if (controller.subCategories.isNotEmpty) _buildSubCategoryChips(controller),
            if (!controller.isLoading && controller.error == null)
              _buildCountRow(controller, products.length),
            Expanded(child: _buildBody(controller, products)),
          ],
        ),
      ),
      bottomNavigationBar: cart.cartCount == 0 ? null : _buildCartBar(cart),
    );
  }

  Widget _buildBody(CategoryProductsController controller, List<ProductModel> products) {
    if (controller.isLoading && controller.category == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (controller.error != null) {
      return _buildMessage(
        icon: Icons.wifi_off_rounded,
        color: AppColors.clrRedD32F2F,
        title: "Couldn't load this category",
        message: controller.error!,
        actionLabel: 'Try again',
        onAction: controller.load,
      );
    }

    if (products.isEmpty) {
      return controller.hasActiveFilter
          ? _buildMessage(
              icon: Icons.search_off_rounded,
              color: AppColors.clrGrey757575,
              title: 'No matching products',
              message: 'Nothing here matches your search or filter.',
              actionLabel: 'Clear filters',
              onAction: () {
                _searchController.clear();
                controller.clearFilters();
              },
            )
          : _buildMessage(
              icon: Icons.inventory_2_outlined,
              color: AppColors.clrGrey757575,
              title: 'Nothing here yet',
              message: 'Products in this category will show up here soon.',
            );
    }

    return RefreshIndicator(
      onRefresh: controller.load,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        itemCount: products.length,
        separatorBuilder: (_, __) => const SizedBox(height: 6),
        itemBuilder: (_, index) => _ProductRow(product: products[index]),
      ),
    );
  }

  Widget _buildSearchField(CategoryProductsController controller) {
    return CommonContainer(
      color: AppColors.clrWhiteFFFFFF,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
      child: TextField(
        controller: _searchController,
        autofocus: true,
        textInputAction: TextInputAction.search,
        onChanged: controller.setSearch,
        decoration: InputDecoration(
          isDense: true,
          hintText: 'Search in ${controller.category?.label ?? 'this category'}…',
          hintStyle: TextStyles.regular.copyWith(fontSize: 14, color: AppColors.clrGrey757575),
          prefixIcon: const CommonIcon(icon: Icons.search_rounded, size: 20, color: AppColors.clrGrey757575),
          filled: true,
          fillColor: AppColors.clrF7F7F7,
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.grayEAECF0),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.clr6156F1, width: 1.4),
          ),
        ),
      ),
    );
  }

  Widget _buildSubCategoryChips(CategoryProductsController controller) {
    final chips = [null, ...controller.subCategories.map((s) => s.id)];

    return CommonContainer(
      color: AppColors.clrWhiteFFFFFF,
      child: SizedBox(
        height: 50,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          itemCount: chips.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, index) {
            final id = chips[index];
            final selected = controller.selectedSubCategoryId == id;
            final label = id == null
                ? 'All'
                : controller.subCategories.firstWhere((s) => s.id == id).label;

            return ChoiceChip(
              label: Text(label),
              selected: selected,
              onSelected: (_) => controller.selectSubCategory(id),
              showCheckmark: false,
              backgroundColor: AppColors.clrWhiteFFFFFF,
              selectedColor: AppColors.clr101828,
              labelStyle: TextStyles.bold.copyWith(
                fontSize: 13,
                color: selected ? AppColors.clrWhiteFFFFFF : AppColors.clrGrey757575,
              ),
              side: BorderSide(color: selected ? AppColors.clr101828 : AppColors.grayEAECF0),
            );
          },
        ),
      ),
    );
  }

  Widget _buildCountRow(CategoryProductsController controller, int shown) {
    final total = controller.totalInCategory;
    final label = controller.hasActiveFilter && shown != total
        ? 'Showing $shown of $total items'
        : 'Total $shown item${shown == 1 ? '' : 's'}';

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 8, 10),
      child: Row(
        children: [
          Expanded(
            child: CommonText(
              data: label,
              style: TextStyles.medium.copyWith(fontSize: 15, color: AppColors.clrGrey757575),
            ),
          ),
          if (shown > 1)
            TextButton.icon(
              onPressed: () => _openSortSheet(controller),
              icon: const CommonIcon(icon: Icons.swap_vert_rounded, size: 18, color: AppColors.clr101828),
              label: CommonText(
                data: controller.sort == ProductSort.recommended ? 'Sort' : controller.sort.label,
                style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr101828),
              ),
              style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
            ),
        ],
      ),
    );
  }

  Future<void> _openSortSheet(CategoryProductsController controller) async {
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.clrWhiteFFFFFF,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              height: 4,
              width: 40,
              decoration: BoxDecoration(
                color: AppColors.grayEAECF0,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Align(
                alignment: Alignment.centerLeft,
                child: CommonText(
                  data: 'Sort by',
                  style: TextStyles.bold.copyWith(fontSize: 17, color: AppColors.clr101828),
                ),
              ),
            ),
            const SizedBox(height: 8),
            ...ProductSort.values.map(
              (option) => RadioListTile<ProductSort>(
                value: option,
                groupValue: controller.sort,
                activeColor: AppColors.clr6156F1,
                title: CommonText(
                  data: option.label,
                  style: TextStyles.medium.copyWith(fontSize: 15, color: AppColors.clr101828),
                ),
                onChanged: (value) {
                  if (value != null) controller.setSort(value);
                  Navigator.of(sheetContext).pop();
                },
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildCartBar(CartController cart) {
    return CommonContainer(
      color: AppColors.clrWhiteFFFFFF,
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      border: const Border(top: BorderSide(color: AppColors.grayEAECF0)),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  CommonText(
                    data: '${cart.cartCount} item${cart.cartCount == 1 ? '' : 's'} in cart',
                    style: TextStyles.medium.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                  ),
                  CommonText(
                    data: '${AppConstants.currency}${cart.subtotal.toStringAsFixed(0)}',
                    style: TextStyles.bold.copyWith(fontSize: 17, color: AppColors.clr101828),
                  ),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: _openCart,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.clr101828,
                foregroundColor: AppColors.clrWhiteFFFFFF,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: CommonText(
                data: 'View Cart',
                style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clrWhiteFFFFFF),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessage({
    required IconData icon,
    required Color color,
    required String title,
    required String message,
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CommonIcon(icon: icon, size: 64, color: color),
            const SizedBox(height: 20),
            CommonText(
              data: title,
              textAlign: TextAlign.center,
              style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
            ),
            const SizedBox(height: 8),
            CommonText(
              data: message,
              textAlign: TextAlign.center,
              style: TextStyles.regular.copyWith(fontSize: 14, color: AppColors.clrGrey757575, height: 1.5),
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 16),
              TextButton(
                onPressed: onAction,
                child: CommonText(
                  data: actionLabel,
                  style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr6156F1),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// One product line: image, details, tag and the add / quantity control.
class _ProductRow extends ConsumerWidget {
  const _ProductRow({required this.product});

  final ProductModel product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final line = cart.lineForProduct(product.id);

    return Material(
      color: AppColors.clrWhiteFFFFFF,
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ProductDetailsScreen(product: product)),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildImage(),
              const SizedBox(width: 14),
              Expanded(child: _buildDetails()),
              const SizedBox(width: 8),
              SizedBox(width: 92, child: _buildActions(context, ref, line)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImage() {
    final image = ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: 88,
        width: 88,
        child: (product.image == null || product.image!.isEmpty)
            ? const ColoredBox(
                color: AppColors.clrD7D7FF,
                child: CommonIcon(icon: Icons.local_drink, size: 34, color: AppColors.clr6156F1),
              )
            : Image.network(
                product.image!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const ColoredBox(
                  color: AppColors.clrD7D7FF,
                  child: CommonIcon(icon: Icons.local_drink, size: 34, color: AppColors.clr6156F1),
                ),
              ),
      ),
    );

    // Sold-out stock is dimmed so the row reads as unavailable at a glance.
    if (product.inStock) return image;
    return Opacity(opacity: 0.45, child: image);
  }

  Widget _buildDetails() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CommonText(
          data: product.brand,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
        ),
        const SizedBox(height: 3),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Flexible(
              child: CommonText(
                data: product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828, height: 1.25),
              ),
            ),
            const SizedBox(width: 6),
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: _FoodTypeMark(isVeg: product.isVeg),
            ),
          ],
        ),
        const SizedBox(height: 3),
        CommonText(
          data: product.volume,
          style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
        ),
        const SizedBox(height: 6),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            CommonText(
              data: '${AppConstants.currency}${product.price.toStringAsFixed(0)}',
              style: TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clr101828),
            ),
            // Only real, admin-entered MRPs are struck through.
            if (product.hasMrp) ...[
              const SizedBox(width: 6),
              CommonText(
                data: '${AppConstants.currency}${product.mrp.toStringAsFixed(0)}',
                style: TextStyles.regular.copyWith(
                  fontSize: 13,
                  color: AppColors.clrGrey757575,
                  decoration: TextDecoration.lineThrough,
                ),
              ),
              const SizedBox(width: 6),
              CommonText(
                data: '${product.discountPercent}% off',
                style: TextStyles.bold.copyWith(fontSize: 12, color: AppColors.clrGreen43A047),
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildActions(BuildContext context, WidgetRef ref, CartItemModel? line) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (product.badge.isNotEmpty) _BadgePill(label: product.badge) else const SizedBox(height: 26),
        const SizedBox(height: 18),
        if (!product.inStock)
          CommonContainer(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 8),
            borderRadius: BorderRadius.circular(10),
            color: AppColors.clrF7F7F7,
            border: Border.all(color: AppColors.grayEAECF0),
            alignment: Alignment.center,
            child: CommonText(
              data: 'Sold out',
              style: TextStyles.bold.copyWith(fontSize: 11, color: AppColors.clrGrey757575),
            ),
          )
        else if (line == null)
          _AddButton(
            onTap: () => showAddToCartSheet(context, product),
          )
        else
          _QuantityStepper(
            quantity: line.quantity,
            onIncrement: () => ref.read(cartProvider).increment(line),
            onDecrement: () => ref.read(cartProvider).decrement(line),
          ),
      ],
    );
  }
}

class _AddButton extends StatelessWidget {
  const _AddButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.clr101828,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          width: double.infinity,
          height: 38,
          alignment: Alignment.center,
          child: CommonText(
            data: '+ Add',
            style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clrWhiteFFFFFF),
          ),
        ),
      ),
    );
  }
}

/// Once an item is in the cart the Add button becomes a stepper, so a customer
/// can adjust quantity without opening the cart.
class _QuantityStepper extends StatelessWidget {
  const _QuantityStepper({
    required this.quantity,
    required this.onIncrement,
    required this.onDecrement,
  });

  final int quantity;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  @override
  Widget build(BuildContext context) {
    return CommonContainer(
      width: double.infinity,
      height: 38,
      borderRadius: BorderRadius.circular(10),
      color: AppColors.clr101828,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _stepButton(
            icon: quantity == 1 ? Icons.delete_outline_rounded : Icons.remove_rounded,
            onTap: onDecrement,
            tooltip: quantity == 1 ? 'Remove from cart' : 'Decrease quantity',
          ),
          CommonText(
            data: '$quantity',
            style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clrWhiteFFFFFF),
          ),
          _stepButton(icon: Icons.add_rounded, onTap: onIncrement, tooltip: 'Increase quantity'),
        ],
      ),
    );
  }

  Widget _stepButton({required IconData icon, required VoidCallback onTap, required String tooltip}) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: SizedBox(
          height: 38,
          width: 30,
          child: CommonIcon(icon: icon, size: 17, color: AppColors.clrWhiteFFFFFF),
        ),
      ),
    );
  }
}

class _BadgePill extends StatelessWidget {
  const _BadgePill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return CommonContainer(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      borderRadius: BorderRadius.circular(20),
      color: AppColors.clrYellowFFEE58,
      child: CommonText(
        data: label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyles.bold.copyWith(fontSize: 11, color: AppColors.clr101828),
      ),
    );
  }
}

/// The standard FSSAI veg / non-veg mark.
class _FoodTypeMark extends StatelessWidget {
  const _FoodTypeMark({required this.isVeg});

  final bool isVeg;

  @override
  Widget build(BuildContext context) {
    final color = isVeg ? AppColors.clrGreen43A047 : AppColors.clrRedD32F2F;

    return Semantics(
      label: isVeg ? 'Vegetarian' : 'Non vegetarian',
      child: Container(
        height: 14,
        width: 14,
        decoration: BoxDecoration(
          border: Border.all(color: color, width: 1.4),
          borderRadius: BorderRadius.circular(2),
        ),
        child: Center(
          child: Container(
            height: 7,
            width: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
        ),
      ),
    );
  }
}
