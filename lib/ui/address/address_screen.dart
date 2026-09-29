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
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AddressScreen extends ConsumerStatefulWidget {
  const AddressScreen({super.key});

  @override
  ConsumerState<AddressScreen> createState() => _AddressScreenConsumerState();
}

class _AddressScreenConsumerState extends ConsumerState<AddressScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(addressProvider).loadAddress());
  }

  @override
  Widget build(BuildContext context) {
    final watchAddress = ref.watch(addressProvider);
    final addresses = watchAddress.addresses;

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: _buildAppBar(context),
      body: Column(
        children: [
          Expanded(
            child: watchAddress.isLoading && addresses.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : addresses.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: addresses.length,
                    itemBuilder: (context, index) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _buildAddressCard(addresses[index]),
                    ),
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
        data: "My Addresses",
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
    return CommonContainer(
      padding: const EdgeInsets.all(16),
      borderRadius: BorderRadius.circular(16),
      color: AppColors.clrWhiteFFFFFF,
      border: Border.all(color: address.isDefault ? AppColors.clr6156F1 : AppColors.grayEAECF0, width: address.isDefault ? 1.5 : 1),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const CommonIcon(icon: Icons.home_outlined, color: AppColors.clr6156F1, size: 24),
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
                            color: AppColors.clr6156F1.withValues(alpha: 0.1),
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
                      maxLines: 3,
                    ),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, color: AppColors.clrGrey757575, size: 20),
                onSelected: (value) async {
                  if (value == 'edit') {
                    _showAddressSheet(existing: address);
                  } else if (value == 'delete') {
                    final removed = await ref.read(addressProvider).removeAddress(address.id);
                    if (!mounted) return;
                    if (!removed) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Unable to remove address'), backgroundColor: Colors.redAccent),
                      );
                    }
                  } else if (value == 'default') {
                    await ref.read(addressProvider).setDefault(address.id);
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'edit', child: Text('Edit')),
                  if (!address.isDefault) const PopupMenuItem(value: 'default', child: Text('Set as Default')),
                  const PopupMenuItem(value: 'delete', child: Text('Delete')),
                ],
              ),
            ],
          ),
        ],
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
          onTap: () => _showAddressSheet(),
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

  void _showAddressSheet({AddressModel? existing}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _AddressFormSheet(
        existing: existing,
        onSave: (address) async {
          final saved = await ref.read(addressProvider).saveAddress(address, editId: existing?.id);
          if (!sheetContext.mounted) return saved;
          if (saved) {
            Navigator.pop(sheetContext);
          } else {
            ScaffoldMessenger.of(sheetContext).showSnackBar(
              SnackBar(
                content: Text(ref.read(addressProvider).error ?? 'Unable to save address'),
                backgroundColor: Colors.redAccent,
              ),
            );
          }
          return saved;
        },
      ),
    );
  }
}

class _AddressFormSheet extends StatefulWidget {
  final AddressModel? existing;
  final Future<bool> Function(AddressModel address) onSave;

  const _AddressFormSheet({required this.existing, required this.onSave});

  @override
  State<_AddressFormSheet> createState() => _AddressFormSheetState();
}

class _AddressFormSheetState extends State<_AddressFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleController;
  late final TextEditingController _flatController;
  late final TextEditingController _societyController;
  late final TextEditingController _streetController;
  late final TextEditingController _landmarkController;
  late final TextEditingController _cityController;
  late final TextEditingController _stateController;
  late final TextEditingController _pincodeController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    _titleController = TextEditingController(text: existing?.title ?? '');
    _flatController = TextEditingController(text: existing?.flatNo ?? '');
    _societyController = TextEditingController(text: existing?.societyName ?? '');
    _streetController = TextEditingController(text: existing?.streetName ?? '');
    _landmarkController = TextEditingController(text: existing?.landmark ?? '');
    _cityController = TextEditingController(text: existing?.city ?? '');
    _stateController = TextEditingController(text: existing?.state ?? '');
    _pincodeController = TextEditingController(text: existing?.pincode ?? '');
  }

  @override
  void dispose() {
    _titleController.dispose();
    _flatController.dispose();
    _societyController.dispose();
    _streetController.dispose();
    _landmarkController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _saving = true);
    await widget.onSave(
      AddressModel(
        title: _titleController.text.trim().isNotEmpty ? _titleController.text.trim() : 'Home',
        flatNo: _flatController.text.trim(),
        societyName: _societyController.text.trim(),
        streetName: _streetController.text.trim(),
        landmark: _landmarkController.text.trim(),
        city: _cityController.text.trim(),
        state: _stateController.text.trim(),
        pincode: _pincodeController.text.trim(),
      ),
    );
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: CommonContainer(
        padding: const EdgeInsets.all(24),
        color: AppColors.clrWhiteFFFFFF,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CommonText(
                  data: widget.existing == null ? "Add New Address" : "Edit Address",
                  style: TextStyles.bold.copyWith(fontSize: 20),
                ),
                const SizedBox(height: 20),
                _field(_titleController, "Label (e.g. Home, Office)"),
                const SizedBox(height: 12),
                _field(_flatController, "Flat / House No.", required: true),
                const SizedBox(height: 12),
                _field(_societyController, "Society / Building"),
                const SizedBox(height: 12),
                _field(_streetController, "Street / Area", required: true),
                const SizedBox(height: 12),
                _field(_landmarkController, "Landmark"),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _field(_cityController, "City", required: true)),
                    const SizedBox(width: 12),
                    Expanded(child: _field(_stateController, "State")),
                  ],
                ),
                const SizedBox(height: 12),
                _field(
                  _pincodeController,
                  "Pincode",
                  required: true,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                  validator: (value) {
                    if (value == null || value.trim().length != 6) return 'Enter a valid 6-digit pincode';
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                CommonButton(
                  onTap: _saving ? () {} : _submit,
                  buttonText: _saving ? "Saving..." : "Save Address",
                  height: 54,
                  width: double.infinity,
                  borderRadius: BorderRadius.circular(14),
                  gradient: const LinearGradient(
                    colors: [AppColors.clr6156F1, AppColors.clr6B60FE],
                  ),
                  buttonTextStyle: TextStyles.bold.copyWith(color: AppColors.clrWhiteFFFFFF, fontSize: 16),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String hint, {
    bool required = false,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
    String? Function(String?)? validator,
  }) {
    return CommonTextFormField(
      controller: controller,
      hintText: required ? "$hint *" : hint,
      borderRadius: 12,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 14),
      validator: validator ??
          (required
              ? (value) => (value == null || value.trim().isEmpty) ? '$hint is required' : null
              : null),
    );
  }
}
