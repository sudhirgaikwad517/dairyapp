import 'package:dairy_app/framework/controller/address/address_controller.dart';
import 'package:dairy_app/framework/controller/cart/cart_controller.dart';
import 'package:dairy_app/ui/address/address_screen.dart';
import 'package:dairy_app/ui/payment/payment_screen.dart';
import 'package:dairy_app/ui/utils/app_constants/app_constants.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_button.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenConsumerState();
}

class _CartScreenConsumerState extends ConsumerState<CartScreen> {
  @override
  Widget build(BuildContext context) {
    final watchCart = ref.watch(cartProvider);
    final watchAddress = ref.watch(addressProvider);
    final selectedAddress = watchAddress.selectedAddress;

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      body: Column(
        children: [
          /// Header
          _buildHeader(context, watchCart.cartItems.length),

          Expanded(
            child: watchCart.cartItems.isEmpty
                ? _buildEmptyCart()
                : SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        /// Cart Items List
                        _buildCartItemsList(watchCart),
                        const SizedBox(height: 24),

                        /// Delivery Address Section
                        _buildDeliveryAddress(
                          selectedAddress?.title ?? "No Address",
                          selectedAddress?.address ?? "Please add a delivery address",
                        ),
                        const SizedBox(height: 24),

                        /// Bill Details Section
                        _buildBillDetails(watchCart),
                        const SizedBox(height: 30),
                      ],
                    ),
                  ),
          ),

          /// Bottom Checkout Button
          if (watchCart.cartItems.isNotEmpty) _buildBottomCheckout(watchCart),
        ],
      ),
    );
  }

  Widget _buildEmptyCart() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CommonIcon(icon: Icons.shopping_cart_outlined, size: 80, color: AppColors.clrGrey),
          const SizedBox(height: 20),
          CommonText(
            data: "Your cart is empty",
            style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, int count) {
    return CommonContainer(
      color: AppColors.clrWhiteFFFFFF,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            CommonText(
              data: "My Cart",
              style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
            ),
            const Spacer(),
            CommonText(
              data: "$count Items",
              style: TextStyles.medium.copyWith(fontSize: 14, color: AppColors.clrGrey757575),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartItemsList(CartController cart) {
    return Column(
      children: List.generate(cart.cartItems.length, (index) {
        final item = cart.cartItems[index];
        return CommonContainer(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(12),
          borderRadius: BorderRadius.circular(16),
          color: AppColors.clrWhiteFFFFFF,
          child: Row(
            children: [
              CommonContainer(
                height: 80,
                width: 80,
                color: AppColors.clrF7F7F7,
                borderRadius: BorderRadius.circular(12),
                alignment: Alignment.center,
                child: const CommonIcon(icon: Icons.image, color: AppColors.clrGrey, size: 30),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CommonText(
                      data: item.name,
                      style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
                    ),
                    const SizedBox(height: 4),
                    CommonText(
                      data: item.volume,
                      style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        CommonText(
                          data: "${AppConstants.currency}${item.price.toInt()}",
                          style: TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clr6156F1),
                        ),
                        CommonContainer(
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.clrGrey.withOpacity(0.3)),
                          child: Row(
                            children: [
                              _buildQtyBtn(Icons.remove, () {
                                cart.removeFromCart(item.id);
                              }),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                child: CommonText(
                                  data: item.quantity.toString(),
                                  style: TextStyles.bold.copyWith(fontSize: 14),
                                ),
                              ),
                              _buildQtyBtn(Icons.add, () {
                                cart.addToCart(item);
                              }),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildQtyBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: CommonContainer(
        padding: const EdgeInsets.all(4),
        child: CommonIcon(icon: icon, size: 18, color: AppColors.clr101828),
      ),
    );
  }

  Widget _buildDeliveryAddress(String title, String address) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CommonText(
          data: "Delivery Address",
          style: TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clr101828),
        ),
        const SizedBox(height: 12),
        CommonContainer(
          padding: const EdgeInsets.all(16),
          borderRadius: BorderRadius.circular(16),
          color: AppColors.clrWhiteFFFFFF,
          child: Row(
            children: [
              const CommonIcon(icon: Icons.location_on_outlined, color: AppColors.clr6156F1, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CommonText(
                      data: title,
                      style: TextStyles.bold.copyWith(fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    CommonText(
                      data: address,
                      style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                      maxLines: 1,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const AddressScreen()),
                  );
                },
                child: CommonText(
                  data: "Change",
                  style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr6156F1),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBillDetails(CartController cart) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CommonText(
          data: "Bill Details",
          style: TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clr101828),
        ),
        const SizedBox(height: 12),
        CommonContainer(
          padding: const EdgeInsets.all(16),
          borderRadius: BorderRadius.circular(16),
          color: AppColors.clrWhiteFFFFFF,
          child: Column(
            children: [
              _buildBillRow("Subtotal", "${AppConstants.currency}${cart.subtotal.toStringAsFixed(1)}"),
              _buildBillRow("Delivery Charge", "Free", isFree: true),
              _buildBillRow("GST (5%)", "${AppConstants.currency}${cart.gst.toStringAsFixed(1)}"),
              const Divider(height: 24),
              _buildBillRow("Total Amount", "${AppConstants.currency}${cart.totalAmount.toStringAsFixed(1)}", isTotal: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBillRow(String label, String value, {bool isTotal = false, bool isFree = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          CommonText(
            data: label,
            style: isTotal
                ? TextStyles.bold.copyWith(fontSize: 16, color: AppColors.clr101828)
                : TextStyles.medium.copyWith(fontSize: 14, color: AppColors.clrGrey757575),
          ),
          CommonText(
            data: value,
            style: isTotal
                ? TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr6156F1)
                : TextStyles.bold.copyWith(
                    fontSize: 14,
                    color: isFree ? AppColors.clr34C759 : AppColors.clr101828,
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomCheckout(CartController cart) {
    return CommonContainer(
      padding: const EdgeInsets.all(20),
      color: AppColors.clrWhiteFFFFFF,
      borderRadius: const BorderRadius.only(
        topLeft: Radius.circular(24),
        topRight: Radius.circular(24),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CommonText(
                    data: "Total Amount",
                    style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575),
                  ),
                  CommonText(
                    data: "${AppConstants.currency}${cart.totalAmount.toStringAsFixed(1)}",
                    style: TextStyles.bold.copyWith(fontSize: 20, color: AppColors.clr101828),
                  ),
                ],
              ),
            ),
            CommonButton(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const PaymentScreen()),
                );
              },
              buttonText: "Checkout",
              height: 54,
              width: 160,
              borderRadius: BorderRadius.circular(14),
              gradient: const LinearGradient(
                colors: [AppColors.clr6156F1, AppColors.clr6B60FE],
              ),
              buttonTextStyle: TextStyles.bold.copyWith(color: AppColors.clrWhiteFFFFFF, fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}
