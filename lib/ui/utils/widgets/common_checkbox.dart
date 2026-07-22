import 'package:flutter/material.dart';

class CommonCheckbox extends StatelessWidget {

  final bool value;
  final  Color? activeColor;
  final WidgetStateProperty<Color?>? fillColor;
  final Color? checkColor;
  final Color? focusColor;
  final WidgetStateProperty<Color?>? overlayColor;
  final void Function(bool?)? onChanged;

  const CommonCheckbox({super.key, required this.value, this.activeColor, this.fillColor, this.checkColor, this.focusColor, this.overlayColor, this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Checkbox(
        value: value,
        activeColor: activeColor,
        focusColor: focusColor,
        fillColor: fillColor,
        overlayColor: overlayColor,
        onChanged: onChanged,
    );
  }
}
