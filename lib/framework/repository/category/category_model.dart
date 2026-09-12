class CategoryModel {
  final String id;
  final String label;
  final String? tile;
  final String? image;

  CategoryModel({
    required this.id,
    required this.label,
    this.tile,
    this.image,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      tile: json['tile']?.toString(),
      image: json['imageUrl']?.toString(),
    );
  }
}
