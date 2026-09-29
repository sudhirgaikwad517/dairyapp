import 'product_model.dart';

/// Temporary local catalogue. Replace this with the catalogue API response.
class CatalogData {
  const CatalogData._();

  static const categories = [
    'All',
    'Milk',
    'Ghee',
    'Paneer',
    'Curd',
    'Butter',
    'Beverages',
  ];

  static final products = <ProductModel>[
    ProductModel(
      id: 'milk-1',
      name: 'A2 Gir Cow Milk',
      brand: 'Proshakti',
      volume: '1 litre',
      price: 84,
      mrp: 99,
      category: 'Milk',
      rating: 4.8,
      isPopular: true,
      image:
          'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80',
      description:
          'Fresh A2 milk from indigenous Gir cows. Chilled and delivered daily.',
    ),
    ProductModel(
      id: 'milk-2',
      name: 'Farm Fresh Cow Milk',
      brand: 'Daily Dairy',
      volume: '500 ml',
      price: 38,
      mrp: 45,
      category: 'Milk',
      rating: 4.6,
      image:
          'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=80',
      description:
          'Creamy, pasteurised cow milk for everyday tea, coffee and cooking.',
    ),
    ProductModel(
      id: 'milk-3',
      name: 'Toned Milk',
      brand: 'Daily Dairy',
      volume: '1 litre',
      price: 58,
      mrp: 65,
      category: 'Milk',
      rating: 4.4,
      image:
          'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80',
      description: 'Light, nutritious toned milk with a balanced fat content.',
    ),
    ProductModel(
      id: 'ghee-1',
      name: 'A2 Bilona Cow Ghee',
      brand: 'Proshakti',
      volume: '500 ml',
      price: 995,
      mrp: 1150,
      category: 'Ghee',
      rating: 4.9,
      isPopular: true,
      image:
          'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=900&q=80',
      description:
          'Slow-churned bilona ghee with a rich aroma and golden colour.',
    ),
    ProductModel(
      id: 'ghee-2',
      name: 'Desi Cow Ghee',
      brand: 'Daily Dairy',
      volume: '250 ml',
      price: 430,
      mrp: 475,
      category: 'Ghee',
      rating: 4.7,
      image:
          'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=900&q=80',
      description:
          'Pure ghee, ideal for tadka, festive sweets and everyday meals.',
    ),
    ProductModel(
      id: 'paneer-1',
      name: 'Malai Paneer',
      brand: 'Proshakti',
      volume: '200 g',
      price: 110,
      mrp: 125,
      category: 'Paneer',
      rating: 4.8,
      isPopular: true,
      image:
          'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80',
      description: 'Soft, high-protein paneer made from fresh milk.',
    ),
    ProductModel(
      id: 'paneer-2',
      name: 'Fresh Paneer Cubes',
      brand: 'Daily Dairy',
      volume: '500 g',
      price: 245,
      mrp: 280,
      category: 'Paneer',
      rating: 4.5,
      image:
          'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80',
      description:
          'Conveniently cut paneer cubes for quick curries and snacks.',
    ),
    ProductModel(
      id: 'curd-1',
      name: 'Homestyle Curd',
      brand: 'Daily Dairy',
      volume: '400 g',
      price: 58,
      mrp: 65,
      category: 'Curd',
      rating: 4.6,
      image:
          'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
      description: 'Thick and creamy set curd with live cultures.',
    ),
    ProductModel(
      id: 'curd-2',
      name: 'Greek Yogurt',
      brand: 'Proshakti',
      volume: '200 g',
      price: 80,
      mrp: 95,
      category: 'Curd',
      rating: 4.7,
      image:
          'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=900&q=80',
      description:
          'High-protein strained yogurt with a naturally creamy texture.',
    ),
    ProductModel(
      id: 'butter-1',
      name: 'Salted Table Butter',
      brand: 'Daily Dairy',
      volume: '100 g',
      price: 62,
      mrp: 70,
      category: 'Butter',
      rating: 4.5,
      image:
          'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=900&q=80',
      description:
          'Smooth, spreadable table butter with a gentle salted finish.',
    ),
    ProductModel(
      id: 'butter-2',
      name: 'White Butter',
      brand: 'Proshakti',
      volume: '200 g',
      price: 145,
      mrp: 165,
      category: 'Butter',
      rating: 4.6,
      image:
          'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=900&q=80',
      description:
          'Freshly churned white butter, perfect for parathas and makhan toast.',
    ),
    ProductModel(
      id: 'bev-1',
      name: 'Classic Buttermilk',
      brand: 'Daily Dairy',
      volume: '300 ml',
      price: 32,
      mrp: 38,
      category: 'Beverages',
      rating: 4.4,
      image:
          'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80',
      description: 'A cooling spiced buttermilk drink for warm days.',
    ),
    ProductModel(
      id: 'bev-2',
      name: 'Rose Lassi',
      brand: 'Proshakti',
      volume: '250 ml',
      price: 48,
      mrp: 55,
      category: 'Beverages',
      rating: 4.5,
      image:
          'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=900&q=80',
      description: 'A refreshing sweet lassi with a delicate rose flavour.',
    ),
  ];
}
