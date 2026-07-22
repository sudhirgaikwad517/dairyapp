import 'package:dairy_app/framework/controller/address/address_controller.dart';
import 'package:dairy_app/framework/repository/address/address_model.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_button.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:dairy_app/ui/utils/widgets/common_text_form_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AddressScreen extends ConsumerStatefulWidget {
  const AddressScreen({super.key});

  @override
  ConsumerState<AddressScreen> createState() => _AddressScreenConsumerState();
}

class _AddressScreenConsumerState extends ConsumerState<AddressScreen> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();

  @override
  void dispose() {
    _titleController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final watchAddress = ref.watch(addressProvider);

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: _buildAppBar(context),
      body: Column(
        children: [
          Expanded(
            child: watchAddress.addresses.isEmpty
                ? _buildEmptyState()
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: watchAddress.addresses.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 16),
                    itemBuilder: (context, index) {
                      final address = watchAddress.addresses[index];
                      return _buildAddressCard(address);
                    },
                  ),
          ),
          _buildAddAddressSection(),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.clrWhiteFFFFFF,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios, color: AppColors.clr101828, size: 20),
        onPressed: () => Navigator.pop(context),
      ),
      title: CommonText(
        data: "Manage Addresses",
        style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CommonIcon(icon: Icons.location_off_outlined, size: 80, color: AppColors.clrGrey),
          const SizedBox(height: 16),
          CommonText(
            data: "No address saved yet",
            style: TextStyles.medium.copyWith(color: AppColors.clrGrey757575),
          ),
        ],
      ),
    );
  }

  Widget _buildAddressCard(AddressModel address) {
    return GestureDetector(
      onTap: () {
        ref.read(addressProvider.notifier).selectAddress(address.id);
      },
      child: CommonContainer(
        padding: const EdgeInsets.all(16),
        borderRadius: BorderRadius.circular(16),
        color: AppColors.clrWhiteFFFFFF,
        border: address.isDefault
            ? Border.all(color: AppColors.clr6156F1, width: 1.5)
            : Border.all(color: AppColors.grayEAECF0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CommonIcon(
              icon: address.title.toLowerCase() == 'home' ? Icons.home_outlined : Icons.work_outline,
              color: address.isDefault ? AppColors.clr6156F1 : AppColors.clrGrey757575,
              size: 24,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CommonText(
                        data: address.title,
                        style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
                      ),
                      if (address.isDefault) ...[
                        const SizedBox(width: 8),
                        CommonContainer(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          color: AppColors.clr6156F1.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                          child: CommonText(
                            data: "Default",
                            style: TextStyles.bold.copyWith(fontSize: 10, color: AppColors.clr6156F1),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  CommonText(
                    data: address.address,
                    style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
                    maxLines: 2,
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: AppColors.clrRedD32F2F, size: 20),
              onPressed: () {
                ref.read(addressProvider.notifier).removeAddress(address.id);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddAddressSection() {
    return CommonContainer(
      padding: const EdgeInsets.all(20),
      color: AppColors.clrWhiteFFFFFF,
      borderRadius: const BorderRadius.only(
        topLeft: Radius.circular(24),
        topRight: Radius.circular(24),
      ),
      child: SafeArea(
        top: false,
        child: CommonButton(
          onTap: () => _showAddAddressDialog(),
          buttonText: "Add New Address",
          height: 54,
          width: double.infinity,
          borderRadius: BorderRadius.circular(14),
          gradient: const LinearGradient(
            colors: [AppColors.clr6156F1, AppColors.clr6B60FE],
          ),
          buttonTextStyle: TextStyles.bold.copyWith(color: AppColors.clrWhiteFFFFFF, fontSize: 16),
        ),
      ),
    );
  }

  void _showAddAddressDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: CommonContainer(
          padding: const EdgeInsets.all(24),
          color: AppColors.clrWhiteFFFFFF,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CommonText(
                data: "Add Address",
                style: TextStyles.bold.copyWith(fontSize: 20),
              ),
              const SizedBox(height: 20),
              CommonTextFormField(
                controller: _titleController,
                hintText: "Title (e.g. Home, Office)",
                borderRadius: 12,
              ),
              const SizedBox(height: 16),
              CommonTextFormField(
                controller: _addressController,
                hintText: "Full Address",
                borderRadius: 12,
              ),
              const SizedBox(height: 24),
              CommonButton(
                onTap: () {
                  if (_titleController.text.isNotEmpty && _addressController.text.isNotEmpty) {
                    final newAddress = AddressModel(
                      id: DateTime.now().millisecondsSinceEpoch.toString(),
                      title: _titleController.text,
                      address: _addressController.text,
                      isDefault: ref.read(addressProvider).addresses.isEmpty,
                    );
                    ref.read(addressProvider.notifier).addAddress(newAddress);
                    _titleController.clear();
                    _addressController.clear();
                    Navigator.pop(context);
                  }
                },
                buttonText: "Save Address",
                height: 54,
                width: double.infinity,
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  colors: [AppColors.clr6156F1, AppColors.clr6B60FE],
                ),
                buttonTextStyle: TextStyles.bold.copyWith(color: AppColors.clrWhiteFFFFFF, fontSize: 16),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
