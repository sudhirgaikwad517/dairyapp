import 'package:flutter/material.dart';

class CommonColumn extends StatelessWidget {

  final MainAxisAlignment? mainAxisAlignment;
  final MainAxisSize? mainAxisSize;
  final CrossAxisAlignment? crossAxisAlignment;
  final List<Widget> children;
  final double? spacing;

  const CommonColumn({super.key, required this.children, this.spacing, this.mainAxisAlignment, this.mainAxisSize, this.crossAxisAlignment});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: mainAxisAlignment ?? MainAxisAlignment.start,
      mainAxisSize: mainAxisSize ?? MainAxisSize.max,
      crossAxisAlignment: crossAxisAlignment ?? CrossAxisAlignment.start,
      spacing: spacing ?? 0,
      children: children,
    );
  }
}
