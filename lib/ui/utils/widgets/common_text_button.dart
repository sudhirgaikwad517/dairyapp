import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';

class CommonTextButton extends StatelessWidget {

  final String text;
  final void Function() onTap;

  const CommonTextButton({super.key, required this.text, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
        onTap: onTap,
        child: CommonText(
            data: text,
          style: TextStyle(
            fontSize: 16,
            color: AppColors.clrGrey,
            decoration: TextDecoration.underline
          ),
        )
    );
  }
}
