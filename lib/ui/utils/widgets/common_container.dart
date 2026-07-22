import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:flutter/material.dart';

class CommonContainer extends StatelessWidget {
  final double? height;
  final double? width;
  final Color? color;
  final BoxBorder? border;
  final BorderRadiusGeometry? borderRadius;
  final Gradient? gradient;
  final Color? shadowColor;
  final double? spreadRadius;
  final double? blurRadius;
  final Offset? offset;
  final Widget? child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final AlignmentGeometry? alignment;

  const CommonContainer({
    super.key,
    this.height,
    this.width,
    this.color,
    this.borderRadius,
    this.child,
    this.gradient,
    this.shadowColor,
    this.spreadRadius,
    this.blurRadius,
    this.offset,
    this.border,
    this.padding,
    this.margin,
    this.alignment,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
      padding: padding,
      margin: margin,
      alignment: alignment,
      decoration: BoxDecoration(
        color: color,
        gradient: gradient,
        borderRadius: borderRadius,
        border: border,
        boxShadow: (shadowColor != null || blurRadius != null || spreadRadius != null || offset != null)
            ? [
                BoxShadow(
                  color: shadowColor ?? AppColors.clrBlack000000.withOpacity(0.1),
                  spreadRadius: spreadRadius ?? 0.0,
                  blurRadius: blurRadius ?? 0.0,
                  offset: offset ?? Offset.zero,
                )
              ]
            : null,
      ),
      child: child,
    );
  }
}
