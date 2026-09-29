import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/content/content_page_repository.dart';
import 'package:dairy_app/ui/content/content_page_screen.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_container.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';

class PoliciesScreen extends StatefulWidget {
  const PoliciesScreen({super.key});

  @override
  State<PoliciesScreen> createState() => _PoliciesScreenState();
}

class _PoliciesScreenState extends State<PoliciesScreen> {
  List<ContentPageSummary> _pages = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final pages = await getIt<ContentPageRepository>().listPages(exclude: 'about_us');
    if (!mounted) return;
    setState(() {
      _pages = pages ?? [];
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
          data: 'Policies',
          style: TextStyles.bold.copyWith(fontSize: 18, color: AppColors.clr101828),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _pages.isEmpty
              ? Center(
                  child: CommonText(
                    data: 'No policies available right now.',
                    style: TextStyles.medium.copyWith(fontSize: 14, color: AppColors.clrGrey757575),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _pages.length,
                  itemBuilder: (context, index) {
                    final page = _pages[index];
                    return GestureDetector(
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ContentPageScreen(slug: page.slug, fallbackTitle: page.title),
                        ),
                      ),
                      child: CommonContainer(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                        borderRadius: BorderRadius.circular(14),
                        color: AppColors.clrWhiteFFFFFF,
                        child: Row(
                          children: [
                            const CommonIcon(icon: Icons.description_outlined, size: 20, color: AppColors.clr101828),
                            const SizedBox(width: 14),
                            Expanded(
                              child: CommonText(
                                data: page.title,
                                style: TextStyles.bold.copyWith(fontSize: 15, color: AppColors.clr101828),
                              ),
                            ),
                            const CommonIcon(icon: Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.clr101828),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
