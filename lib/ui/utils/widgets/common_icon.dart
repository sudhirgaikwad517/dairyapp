import 'package:flutter/material.dart';

class CommonIcon extends StatelessWidget {

  final IconData? icon;
  final double? size;
  final Color? color;
  final double? fill;
  final double? weight;
  final FontWeight? fontWeight;

  const CommonIcon({super.key, this.icon, this.size, this.fill, this.weight, this.fontWeight, this.color});

  @override
  Widget build(BuildContext context) {
    return Icon(
      icon,
      size: size,
      color: color,
      weight: weight,
      fontWeight: fontWeight,
      fill: fill,
    );
  }
}
