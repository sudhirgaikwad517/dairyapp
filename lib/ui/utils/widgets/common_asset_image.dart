import 'package:flutter/material.dart';

class CommonAssetImage extends StatelessWidget {
  final String path;
  final double? height;
  final double? width;
  final AlignmentGeometry? alignment;
  final double? scale;
  final BoxFit? fit;

  const CommonAssetImage({super.key, required this.path, this.height, this.width, this.alignment, this.scale, this.fit});

  @override
  Widget build(BuildContext context) {
    return Image.asset(
        path,
      height: height,
      width: width,
      alignment: alignment ?? Alignment.center,
      scale: scale,
      fit: fit,
    );
  }
}
