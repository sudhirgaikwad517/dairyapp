import 'package:cached_network_image/cached_network_image.dart';
import 'package:dairy_app/ui/utils/widgets/common_asset_image.dart';
import 'package:flutter/material.dart';

/// Shows the admin-uploaded [remoteUrl] when one is set, falling back to the
/// app's bundled [assetPath] — instantly, with no loading flash — when it
/// isn't, still loading, or fails to load.
class RemoteOrAssetImage extends StatelessWidget {
  final String? remoteUrl;
  final String assetPath;
  final double? height;
  final double? width;
  final BoxFit? fit;

  const RemoteOrAssetImage({
    super.key,
    required this.remoteUrl,
    required this.assetPath,
    this.height,
    this.width,
    this.fit,
  });

  @override
  Widget build(BuildContext context) {
    final url = remoteUrl;
    if (url == null || url.isEmpty) {
      return CommonAssetImage(path: assetPath, height: height, width: width, fit: fit);
    }

    return CachedNetworkImage(
      imageUrl: url,
      height: height,
      width: width,
      fit: fit,
      placeholder: (context, _) => CommonAssetImage(path: assetPath, height: height, width: width, fit: fit),
      errorWidget: (context, _, __) => CommonAssetImage(path: assetPath, height: height, width: width, fit: fit),
    );
  }
}
