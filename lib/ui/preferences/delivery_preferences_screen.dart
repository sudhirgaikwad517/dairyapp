import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/provider/auth_provider.dart';
import 'package:dairy_app/framework/repository/delivery_mode/delivery_mode_repository.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class DeliveryPreferencesScreen extends ConsumerStatefulWidget {
  const DeliveryPreferencesScreen({super.key});

  @override
  ConsumerState<DeliveryPreferencesScreen> createState() => _DeliveryPreferencesScreenState();
}

class _DeliveryPreferencesScreenState extends ConsumerState<DeliveryPreferencesScreen> {
  List<DeliveryModeOption> _options = [];
  bool _isLoading = true;
  bool _isSaving = false;
  String? _selected;

  @override
  void initState() {
    super.initState();
    _selected = ref.read(authNotifierProvider).customer?['deliveryMode']?.toString();
    _load();
  }

  Future<void> _load() async {
    final options = await getIt<DeliveryModeRepository>().getModes();
    if (!mounted) return;
    setState(() {
      _options = options ?? [];
      _isLoading = false;
    });
  }

  Future<void> _select(String name) async {
    if (_isSaving || name == _selected) return;
    setState(() {
      _isSaving = true;
      _selected = name;
    });

    final error = await ref.read(authNotifierProvider.notifier).updateProfileFields({'deliveryMode': name});
    if (!mounted) return;
    setState(() => _isSaving = false);

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Delivery preference set to "$name"'), duration: const Duration(seconds: 1)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: AppBar(
        backgroundColor: AppColors.clrWhiteFFFFFF,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.clr101828, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: CommonText(data: 'Delivery Preferences', style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CommonText(
                    data: 'Choose how you would like your delivery to be handled.',
                    style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575),
                  ),
                  const SizedBox(height: 16),
                  ..._options.map((option) {
                    final isSelected = _selected == option.name;
                    return GestureDetector(
                      onTap: () => _select(option.name),
                      child: CommonContainer(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                        borderRadius: BorderRadius.circular(12),
                        color: AppColors.clrWhiteFFFFFF,
                        border: Border.all(color: isSelected ? AppColors.clr6156F1 : AppColors.grayEAECF0, width: isSelected ? 1.4 : 1),
                        child: Row(
                          children: [
                            Icon(
                              isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                              color: isSelected ? AppColors.clr6156F1 : AppColors.clrGrey757575,
                              size: 22,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: CommonText(
                                data: option.name,
                                style: TextStyles.medium.copyWith(fontSize: 14, color: AppColors.clr101828),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }
}
