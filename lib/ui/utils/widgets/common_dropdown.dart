import 'package:dairy_app/ui/utils/app_enum.dart';
import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/theme/text_styles.dart';
import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';

class   CommonDropdown<T> extends StatelessWidget {
  final T? value;
  final T? initialValue;
  final List<T> items;
  final String? hintText;
  final String? labelText;
  final ValueChanged<T?> onChanged;
  final String Function(T)? itemLabelBuilder;
  final FormFieldValidator<T>? validator;
  final bool enabled;
  final EdgeInsetsGeometry padding;
  final Color? dropdownColor;
  final Color? defaultBorderColor;
  final Color? enabledBorderColor;
  final Color? disabledBorderColor;
  final BorderRadius? borderRadius;

  const CommonDropdown({
    super.key,
    required this.items,
    required this.onChanged,
    this.value,
    this.hintText,
    this.labelText,
    this.itemLabelBuilder,
    this.validator,
    this.enabled = true,
    this.padding = const EdgeInsets.symmetric(vertical: 8,),
    this.defaultBorderColor,
    this.enabledBorderColor,
    this.disabledBorderColor,
    this.initialValue,
    this.dropdownColor,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: DropdownButtonFormField<T>(
        borderRadius: borderRadius,
        dropdownColor: dropdownColor,
        initialValue: initialValue,
        value: items.contains(value)? value: null,
        validator: validator,
        decoration: InputDecoration(
          labelText: labelText,
          hintText: hintText,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 14,
          ),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),

          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(
              color: defaultBorderColor ?? AppColors.clrBlack000000,
            ), // default border
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(
              color: enabledBorderColor ??  AppColors.clrBlack000000,
            ), // when clicked/focused
          ),
          disabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: disabledBorderColor ?? AppColors.clrBlack000000,),
          ),
        ),
        icon: Icon(Icons.keyboard_arrow_down_rounded),

        // custom dropdown icon
        items: items.map((lang) {
          return DropdownMenuItem<T>(
            value: lang,
            child: CommonText(
              data: itemLabelBuilder != null
                  ? itemLabelBuilder!(lang)
                  : languageToString(lang as Language).toString(),
              style: TextStyles.medium,
            ),
          );
        }).toList(),
        onChanged: enabled ? onChanged : null,
      ),
    );
  }

  String languageToString(Language lang) {
    switch (lang) {
      case Language.english:
        return "English";
      case Language.marathi:
        return "Marathi";
    }
  }
}
