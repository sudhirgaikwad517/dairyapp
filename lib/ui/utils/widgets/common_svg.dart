import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';

class CommonSvg extends StatelessWidget {

  final String strIcon;
  final ColorFilter? colorFilter;
  final double? iconHeight;
  final double? iconWidth;
  final BoxFit boxFit;
  final bool? isRotate;
  const CommonSvg({super.key,required this.strIcon, this.colorFilter, this.boxFit = BoxFit.fill, this.isRotate, this.iconHeight, this.iconWidth});

  @override
  Widget build(BuildContext context) {
    return  SvgPicture.asset(
        strIcon,
        fit: boxFit,
        colorFilter: colorFilter,
        height: iconHeight,  //set height , width
        width: iconWidth,
    );
  }
}
