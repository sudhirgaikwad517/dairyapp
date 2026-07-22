class ProductModel {
  final String id;
  final String name;
  final String brand;
  final String volume;
  final double price;
  final double originalPrice;
  final String? image;
  final String category;
  final String description;
  final double rating;
  final bool isPopular;
  int quantity;

  ProductModel({
    required this.id,
    required this.name,
    required this.brand,
    required this.volume,
    required this.price,
    required this.originalPrice,
    this.image,
    this.category = 'Milk',
    this.description = '',
    this.rating = 4.5,
    this.isPopular = false,
    this.quantity = 0,
  });

  ProductModel copyWith({int? quantity}) {
    return ProductModel(
      id: id,
      name: name,
      brand: brand,
      volume: volume,
      price: price,
      originalPrice: originalPrice,
      image: image,
      category: category,
      description: description,
      rating: rating,
      isPopular: isPopular,
      quantity: quantity ?? this.quantity,
    );
  }
}
