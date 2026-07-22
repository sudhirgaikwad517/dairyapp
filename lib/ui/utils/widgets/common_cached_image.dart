import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:shimmer_animation/shimmer_animation.dart';

class CommonCachedImage extends StatelessWidget {
  final String imageUrl;
  final double? height;
  final double? width;

  const CommonCachedImage({
    super.key,
    required this.imageUrl,
    this.height,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: imageUrl,
      height: height,
      width: width,
      fit: BoxFit.cover,
      placeholder: (context, url){   ///placeholder
        return Shimmer(
          child: SizedBox(
            height: height,
            width: width,
          ),
        );
      },
      errorWidget: (context, error, stackTrace) {   ///error image
        return const CommonCachedImage(imageUrl: "https://static6.depositphotos.com/1005145/589/i/450/depositphotos_5896205-stock-photo-summer-landscape.jpg");
      },
    );
  }
}