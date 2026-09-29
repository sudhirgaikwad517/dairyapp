import 'package:dairy_app/framework/controller/cart/cart_controller.dart';
import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/cart/product_model.dart';
import 'package:dairy_app/framework/repository/checkout/checkout_models.dart';
import 'package:dairy_app/framework/repository/checkout/checkout_repository.dart';
import 'package:dairy_app/ui/subscription/subscribe_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Every "+ Add" quick-add button in the app opens this instead of adding to
/// the cart straight away — it's where "Buy Once" and "Subscribe" actually
/// branch, and where the delivery shift + quantity are chosen up front.
Future<void> showAddToCartSheet(BuildContext context, ProductModel product) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => AddToCartSheet(product: product),
  );
}

class AddToCartSheet extends ConsumerStatefulWidget {
  const AddToCartSheet({super.key, required this.product});

  final ProductModel product;

  @override
  ConsumerState<AddToCartSheet> createState() => _AddToCartSheetState();
}

class _AddToCartSheetState extends ConsumerState<AddToCartSheet> {
  int _quantity = 1;
  String? _deliverySlotId;
  List<DeliverySlotModel> _slots = const [];
  bool _loadingSlots = true;
  bool _addingToCart = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadSlots);
  }

  Future<void> _loadSlots() async {
    final slots = await getIt<CheckoutRepository>().deliverySlots();
    if (!mounted) return;
    setState(() {
      _slots = slots;
      _deliverySlotId = slots.isNotEmpty ? slots.first.id : null;
      _loadingSlots = false;
    });
  }

  String get _selectedSlotLabel {
    if (_deliverySlotId == null) return 'Any time';
    return _slots.firstWhere((s) => s.id == _deliverySlotId, orElse: () => DeliverySlotModel(id: '', label: 'Any time')).label;
  }

  Future<void> _buyOnce() async {
    setState(() => _addingToCart = true);
    final error = await ref.read(cartProvider).addToCart(widget.product, quantity: _quantity);
    if (!mounted) return;

    Navigator.pop(context);
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(error ?? '${widget.product.name} added to cart'),
          backgroundColor: error == null ? AppColors.clr34C759 : AppColors.clrRedD32F2F,
          duration: Duration(seconds: error == null ? 1 : 3),
        ),
      );
  }

  void _subscribe() {
    Navigator.pop(context);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SubscribeScreen(
          product: widget.product,
          initialQuantity: _quantity,
          initialDeliverySlotId: _deliverySlotId,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        top: false,
        child: CommonContainer(
          color: AppColors.clrF7F7F7,
          borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: CommonText(
                      data: product.name,
                      style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
                      maxLines: 2,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const CommonIcon(icon: Icons.close_rounded, size: 22, color: AppColors.clr101828),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              CommonText(
                data: product.volume,
                style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
              ),
              const SizedBox(height: 16),
              _buildPriceCards(product),
              const SizedBox(height: 16),
              if (!_loadingSlots && _slots.isNotEmpty) _buildDeliveryTypeRow(),
              _buildQuantityRow(),
              const SizedBox(height: 16),
              _buildActionButtons(product),
            ],
          ),
        ),
      ),
    );
  }

  /// "Buy Once" and "Subscribe" often have different prices — and therefore
  /// different discounts off the same MRP. Showing one unlabelled price+
  /// discount block was ambiguous about which mode it belonged to; each mode
  /// now gets its own clearly-labelled card.
  Widget _buildPriceCards(ProductModel product) {
    final buyOnce = _PriceCard(
      label: 'Buy Once',
      price: product.price,
      mrp: product.mrp,
      hasMrp: product.hasMrp,
      discountPercent: product.discountPercent,
    );

    if (!product.allowSubscription) return buyOnce;

    final subscribe = _PriceCard(
      label: 'Subscribe',
      price: product.subscriptionPrice,
      mrp: product.mrp,
      hasMrp: product.hasSubscriptionMrp,
      discountPercent: product.subscriptionDiscountPercent,
    );

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: buyOnce),
          const SizedBox(width: 12),
          Expanded(child: subscribe),
        ],
      ),
    );
  }

  Widget _buildDeliveryTypeRow() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: CommonContainer(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        borderRadius: BorderRadius.circular(14),
        color: AppColors.clrWhiteFFFFFF,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            CommonText(
              data: "Choose Delivery Type:",
              style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828),
            ),
            PopupMenuButton<String>(
              initialValue: _deliverySlotId,
              onSelected: (id) => setState(() => _deliverySlotId = id),
              itemBuilder: (context) => _slots
                  .map((slot) => PopupMenuItem(value: slot.id, child: Text(slot.label)))
                  .toList(),
              child: CommonContainer(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                borderRadius: BorderRadius.circular(20),
                color: AppColors.clr101828,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CommonText(
                      data: _selectedSlotLabel,
                      style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clrWhiteFFFFFF),
                    ),
                    if (_slots.length > 1) ...[
                      const SizedBox(width: 4),
                      const CommonIcon(icon: Icons.keyboard_arrow_down_rounded, size: 16, color: AppColors.clrWhiteFFFFFF),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuantityRow() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: CommonText(
            data: "Quantity",
            style: TextStyles.bold.copyWith(fontSize: 14, color: AppColors.clr101828),
          ),
        ),
        CommonContainer(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.grayEAECF0),
          color: AppColors.clrWhiteFFFFFF,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                icon: const CommonIcon(icon: Icons.remove_rounded, size: 18, color: AppColors.clr101828),
                visualDensity: VisualDensity.compact,
              ),
              CommonText(data: '$_quantity', style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828)),
              IconButton(
                onPressed: () => setState(() => _quantity++),
                icon: const CommonIcon(icon: Icons.add_rounded, size: 18, color: AppColors.clr101828),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons(ProductModel product) {
    if (!product.inStock) {
      return CommonContainer(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        borderRadius: BorderRadius.circular(14),
        color: AppColors.grayEAECF0,
        alignment: Alignment.center,
        child: CommonText(
          data: "Sold out",
          style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clrGrey757575),
        ),
      );
    }

    final buyOnceTotal = product.price * _quantity;
    final buyOnceButton = GestureDetector(
      onTap: _addingToCart ? null : _buyOnce,
      child: CommonContainer(
        padding: const EdgeInsets.symmetric(vertical: 12),
        borderRadius: BorderRadius.circular(14),
        color: AppColors.clr101828,
        alignment: Alignment.center,
        child: _addingToCart
            ? const SizedBox(
                height: 18,
                width: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.clrWhiteFFFFFF),
              )
            : _ButtonLabel(
                title: "Buy Once",
                total: buyOnceTotal,
                color: AppColors.clrWhiteFFFFFF,
              ),
      ),
    );

    if (!product.allowSubscription) return buyOnceButton;

    final subscribeTotal = product.subscriptionPrice * _quantity;

    return Row(
      children: [
        Expanded(child: buyOnceButton),
        const SizedBox(width: 12),
        Expanded(
          child: GestureDetector(
            onTap: _subscribe,
            child: CommonContainer(
              padding: const EdgeInsets.symmetric(vertical: 12),
              borderRadius: BorderRadius.circular(14),
              color: AppColors.clrWhiteFFFFFF,
              border: Border.all(color: AppColors.clr101828),
              alignment: Alignment.center,
              child: _ButtonLabel(
                title: "Subscribe",
                total: subscribeTotal,
                color: AppColors.clr101828,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// An action button's label plus the total it actually charges for the
/// chosen quantity — so "Buy Once" and "Subscribe" never look like the same
/// price when they aren't.
class _ButtonLabel extends StatelessWidget {
  const _ButtonLabel({required this.title, required this.total, required this.color});

  final String title;
  final double total;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        CommonText(data: title, style: TextStyles.bold.copyWith(fontSize: 15, color: color)),
        const SizedBox(height: 2),
        CommonText(
          data: '${AppConstants.currency}${total.toStringAsFixed(0)}',
          style: TextStyles.medium.copyWith(fontSize: 12, color: color.withValues(alpha: 0.85)),
        ),
      ],
    );
  }
}

/// One purchase mode's price + (if it actually has one) its own MRP and
/// discount — never the other mode's numbers.
class _PriceCard extends StatelessWidget {
  const _PriceCard({
    required this.label,
    required this.price,
    required this.mrp,
    required this.hasMrp,
    required this.discountPercent,
  });

  final String label;
  final double price;
  final double mrp;
  final bool hasMrp;
  final int discountPercent;

  @override
  Widget build(BuildContext context) {
    return CommonContainer(
      borderRadius: BorderRadius.circular(14),
      color: AppColors.clrWhiteFFFFFF,
      border: Border.all(color: AppColors.grayEAECF0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          CommonContainer(
            padding: const EdgeInsets.symmetric(vertical: 8),
            borderRadius: const BorderRadius.only(topLeft: Radius.circular(13), topRight: Radius.circular(13)),
            color: AppColors.clr101828,
            alignment: Alignment.center,
            child: CommonText(
              data: hasMrp ? '$label · $discountPercent% OFF' : label,
              style: TextStyles.bold.copyWith(fontSize: 12, color: AppColors.clrWhiteFFFFFF),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 14),
            child: Column(
              children: [
                CommonText(
                  data: '${AppConstants.currency}${price.toStringAsFixed(0)}',
                  style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
                ),
                if (hasMrp) ...[
                  const SizedBox(height: 2),
                  CommonText(
                    data: '${AppConstants.currency}${mrp.toStringAsFixed(0)}',
                    style: TextStyles.regular.copyWith(
                      fontSize: 12,
                      color: AppColors.clrGrey757575,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
