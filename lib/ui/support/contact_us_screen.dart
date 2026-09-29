import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/provider/auth_provider.dart';
import 'package:dairy_app/framework/repository/lead/lead_repository.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ContactUsScreen extends ConsumerStatefulWidget {
  const ContactUsScreen({super.key});

  @override
  ConsumerState<ContactUsScreen> createState() => _ContactUsScreenState();
}

class _ContactUsScreenState extends ConsumerState<ContactUsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _messageController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final customer = ref.read(authNotifierProvider).customer;
    final name = (customer?['name'] as String?)?.trim();
    final phone = customer?['phone']?.toString() ?? '';

    setState(() => _isSubmitting = true);
    final error = await getIt<LeadRepository>().submitLead(
      name: (name != null && name.isNotEmpty) ? name : 'Guest',
      phone: phone,
      source: 'contact_us',
      message: _messageController.text.trim(),
    );
    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (error == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your message has been sent. We will get back to you soon.')),
      );
      _messageController.clear();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final customer = ref.watch(authNotifierProvider).customer;
    final name = (customer?['name'] as String?)?.trim();
    final phone = customer?['phone']?.toString() ?? '';

    return Scaffold(
      backgroundColor: AppColors.clrF7F7F7,
      appBar: AppBar(
        backgroundColor: AppColors.clrWhiteFFFFFF,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.clr101828, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: CommonText(data: 'Contact Us', style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CommonText(
                data: 'Have a question or need help? Send us a message and our team will reach out to you.',
                style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575, height: 1.4),
              ),
              const SizedBox(height: 20),
              CommonContainer(
                padding: const EdgeInsets.all(16),
                borderRadius: BorderRadius.circular(14),
                color: AppColors.clrWhiteFFFFFF,
                child: Row(
                  children: [
                    const Icon(Icons.account_circle, size: 40, color: AppColors.clr101828),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CommonText(
                            data: (name != null && name.isNotEmpty) ? name : 'Guest',
                            style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
                          ),
                          if (phone.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            CommonText(data: phone, style: TextStyles.regular.copyWith(fontSize: 12, color: AppColors.clrGrey757575)),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              CommonText(data: 'Your Message', style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr101828)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _messageController,
                maxLines: 6,
                decoration: InputDecoration(
                  hintText: 'Type your message here...',
                  filled: true,
                  fillColor: AppColors.clrWhiteFFFFFF,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
                validator: (value) => (value == null || value.trim().isEmpty) ? 'Please enter your message' : null,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.clr101828,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : CommonText(data: 'Send Message', style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clrWhiteFFFFFF)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
