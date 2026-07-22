import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:flutter/material.dart';

class CommonButton extends StatelessWidget {
  final double? height;
  final double? width;
  final void Function() onTap;
  final Color? buttonColor;
  final Color? borderColor;
  final BorderRadiusGeometry? borderRadius;
  final String buttonText;
  final TextStyle? buttonTextStyle;
  final bool? showIcon;
  final IconData? icon;
  final Gradient? gradient;

  const CommonButton({
    super.key,
    required this.onTap,
    this.buttonColor,
    this.borderRadius,
    required this.buttonText,
    this.buttonTextStyle,
    this.height,
    this.width,
    this.showIcon,
    this.icon,
    this.borderColor,
    this.gradient,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: height,
        width: width,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: buttonColor,
          gradient: gradient,
          borderRadius: borderRadius ?? BorderRadius.circular(10),
          border: borderColor != null ? Border.all(color: borderColor!) : null,
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 13.0, vertical: 8.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (showIcon ?? false)
                Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: CommonIcon(
                    icon: icon,
                    color: AppColors.clrWhiteFFFFFF,
                    size: 20,
                  ),
                ),
              Text(
                buttonText,
                style: buttonTextStyle,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
