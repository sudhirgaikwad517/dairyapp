import 'package:flutter/material.dart';

class CommonCard extends StatelessWidget {

  final Color? color;
  final Color? shadowColor;
  final Color? surfaceTintColor;
  final double? elevation;
  final ShapeBorder? shape;
  final bool borderOnForeground;
  final EdgeInsetsGeometry? margin;
  final Clip? clipBehavior;
  final Widget child;
  final bool semanticContainer = true;

  const CommonCard({super.key, this.color, this.shadowColor, this.surfaceTintColor, this.elevation, this.shape, this.margin, this.clipBehavior, required this.child, this.borderOnForeground = true});

  @override
  Widget build(BuildContext context) {

    return Card(
      ///card and their properties

      color: color,
      shadowColor: shadowColor,
      surfaceTintColor: surfaceTintColor,
      elevation: elevation,
      shape: shape,
      borderOnForeground: borderOnForeground,
      child: child,
    );

  }
}

