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
  final bool isNewArrival;
  final bool isSeasonal;
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
    this.isNewArrival = false,
    this.isSeasonal = false,
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
      isNewArrival: isNewArrival,
      isSeasonal: isSeasonal,
      quantity: quantity ?? this.quantity,
    );
  }

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      brand: json['brand']?.toString() ?? 'Proshakti',
      volume: json['size']?.toString() ?? '',
      price: (json['buyOnce'] ?? 0).toDouble(),
      originalPrice: (json['buyOnce'] ?? 0).toDouble() * 1.1, // Mock original price if not present
      image: json['imageUrl']?.toString(),
      category: json['categoryLabel']?.toString() ?? 'Other',
      description: json['description']?.toString() ?? '',
      rating: (json['ratingAvg'] ?? 4.5).toDouble(),
      isPopular: (json['ratingAvg'] ?? 0) > 4.0 || 
                 (json['reviewCount'] ?? 0) > 10 || 
                 (json['badge']?.toString().toUpperCase() == 'POPULAR') ||
                 (json['badge']?.toString().toUpperCase() == 'BEST VALUE') ||
                 (json['badge']?.toString().toUpperCase() == 'COMBO'),
      isNewArrival: (json['badge']?.toString().toUpperCase() == 'NEW'),
      isSeasonal: (json['badge']?.toString().toUpperCase() == 'SEASONAL'),
    );
  }
}
