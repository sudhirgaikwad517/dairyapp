import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:flutter/material.dart';

class CommonDialog {
  static Future<void> showConfirmDialog(
    BuildContext context, {
    required Widget body,
    EdgeInsetsGeometry? contentPadding,
    double? borderRadius,
  }) {
    return showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.clrWhiteFFFFFF,
        surfaceTintColor: AppColors.clrWhiteFFFFFF,
        contentPadding: contentPadding ?? const EdgeInsets.all(24),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius ?? 30),
        ),
        content: body,
      ),
    );
  }
}
