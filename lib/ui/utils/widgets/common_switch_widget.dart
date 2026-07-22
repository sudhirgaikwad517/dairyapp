import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class CommonCupertinoSwitch extends StatelessWidget {
  const CommonCupertinoSwitch({super.key, required this.switchValue,required this.onChanged,this.width,this.height,this.opacity,this.absorbing });

  /// Switch Value
  final bool switchValue;
  /// On changed switch value
  final ValueChanged<bool> onChanged;
  final double? height;
  final double? width;
  final double? opacity;
  final bool? absorbing;

  @override
  Widget build(BuildContext context) {
    return AbsorbPointer(
      absorbing: absorbing??false,
      child: Opacity(
        opacity:opacity??1,
        child: SizedBox(
          height: height??24,
          width: width,
          child: FittedBox(
            fit: BoxFit.contain,
            child: CupertinoSwitch(
              value: switchValue,
              activeTrackColor: AppColors.clrGreen1B5E20,
              inactiveTrackColor: AppColors.transparent,
              inactiveThumbColor: AppColors.clrBlue90CAF9,
              onChanged: onChanged,
              thumbIcon: WidgetStateProperty. resolveWith<Icon?>((Set<WidgetState> states) {
                if (switchValue) {
                  return  Icon(Icons.check,size: 20,color: AppColors.clr34C759,);
                }
                return null;
              }),
              trackOutlineColor:WidgetStateProperty.resolveWith<Color?>((Set<WidgetState> states) {
                if (switchValue) {
                  return null;
                }else{
                  return AppColors.clrIndigo7986CB;
                }
              }),
            ),
          ),
        ),
      ),
    );
  }
}