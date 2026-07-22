import 'package:flutter/material.dart';

class CommonBottomSheet {
  static void show(
    BuildContext context, {
    required Widget child,
    bool isDismissible = false,
    bool isScrollControlled = false,
  }) {
    showModalBottomSheet(
      context: context,
      isDismissible: isDismissible,
      isScrollControlled: isScrollControlled,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(25)),
          ),
          child: child,
        );
      },
    );
  }
}
