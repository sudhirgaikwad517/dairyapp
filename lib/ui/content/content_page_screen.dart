import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/content/content_page_repository.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';

/// Generic viewer for any admin-managed content page — used for both
/// "About Us" (opened directly with slug `about_us`) and each entry on the
/// Policies list (Terms & Conditions, Privacy Policy, ...).
class ContentPageScreen extends StatefulWidget {
  final String slug;
  final String fallbackTitle;

  const ContentPageScreen({super.key, required this.slug, this.fallbackTitle = ''});

  @override
  State<ContentPageScreen> createState() => _ContentPageScreenState();
}

class _ContentPageScreenState extends State<ContentPageScreen> {
  ContentPageDetail? _page;
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final page = await getIt<ContentPageRepository>().getPage(widget.slug);
    if (!mounted) return;
    setState(() {
      _page = page;
      _hasError = page == null;
      _isLoading = false;
    });
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
        title: CommonText(
          data: _page?.title ?? widget.fallbackTitle,
          style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _hasError
              ? Center(
                  child: CommonText(
                    data: 'Unable to load this page right now.',
                    style: TextStyles.medium.copyWith(fontSize: 14, color: AppColors.clrGrey757575),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: CommonText(
                    data: _page?.content ?? '',
                    style: TextStyles.regular.copyWith(fontSize: 14, color: AppColors.clr101828, height: 1.6),
                  ),
                ),
    );
  }
}
