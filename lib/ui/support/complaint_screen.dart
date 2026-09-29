import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/feedback/feedback_repository.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';

class ComplaintScreen extends StatefulWidget {
  const ComplaintScreen({super.key});

  @override
  State<ComplaintScreen> createState() => _ComplaintScreenState();
}

class _ComplaintScreenState extends State<ComplaintScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _descriptionController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    final error = await getIt<FeedbackRepository>().submit(
      type: 'complaint',
      subject: _subjectController.text.trim(),
      comment: _descriptionController.text.trim(),
    );
    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (error == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your complaint has been registered. We will look into it shortly.')),
      );
      _subjectController.clear();
      _descriptionController.clear();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
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
        title: CommonText(data: 'Complaint', style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CommonText(
                data: 'Facing an issue with a delivery, product or your subscription? Let us know and we will resolve it.',
                style: TextStyles.regular.copyWith(fontSize: 13, color: AppColors.clrGrey757575, height: 1.4),
              ),
              const SizedBox(height: 20),
              CommonText(data: 'Subject', style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr101828)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _subjectController,
                decoration: InputDecoration(
                  hintText: 'e.g. Spoiled milk delivered',
                  filled: true,
                  fillColor: AppColors.clrWhiteFFFFFF,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
                validator: (value) => (value == null || value.trim().isEmpty) ? 'Please enter a subject' : null,
              ),
              const SizedBox(height: 16),
              CommonText(data: 'Description', style: TextStyles.bold.copyWith(fontSize: 13, color: AppColors.clr101828)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _descriptionController,
                maxLines: 6,
                decoration: InputDecoration(
                  hintText: 'Describe your complaint in detail...',
                  filled: true,
                  fillColor: AppColors.clrWhiteFFFFFF,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
                validator: (value) => (value == null || value.trim().isEmpty) ? 'Please describe your complaint' : null,
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
                      : CommonText(data: 'Submit Complaint', style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clrWhiteFFFFFF)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
