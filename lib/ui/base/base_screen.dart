import 'package:dairy_app/framework/controller/base/base_controller.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class BaseScreen extends ConsumerStatefulWidget {
  final PreferredSizeWidget? appBar;
  final Widget? body;
  final Widget? floatingActionButton;

  const BaseScreen({super.key, this.body, this.floatingActionButton, this.appBar});

  @override
  ConsumerState<BaseScreen> createState() => _BaseScreenConsumerState();
}

class _BaseScreenConsumerState extends ConsumerState<BaseScreen> {
  @override
  void initState() {
    super.initState();
    // Ensure the provider is initialized
    ref.read(baseProvider);
  }

  @override
  Widget build(BuildContext context) {
    final watchBase = ref.watch(baseProvider);
    
    return Scaffold(
      appBar: widget.appBar,
      // body will display the specific screen content from the controller
      body: widget.body ?? (watchBase.bottomList.isNotEmpty 
          ? watchBase.bottomList[watchBase.selectedIndex].screen 
          : const SizedBox.shrink()),
      floatingActionButton: widget.floatingActionButton,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: watchBase.selectedIndex,
        type: BottomNavigationBarType.shifting,
        backgroundColor: AppColors.clrWhiteFFFFFF,
        selectedItemColor: AppColors.clr6156F1,
        unselectedItemColor: AppColors.clrGrey757575,
        showSelectedLabels: true,
        showUnselectedLabels: true,
        selectedFontSize: 12,
        unselectedFontSize: 12,
        onTap: (index) {
          if (watchBase.selectedIndex != index) {
            watchBase.updateIndex(index);
          }
        },
        items: watchBase.bottomList.map((item) {
          return BottomNavigationBarItem(
            icon: Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: item.iconName,
            ),
            label: item.title,
          );
        }).toList(),
      ),
    );
  }
}
