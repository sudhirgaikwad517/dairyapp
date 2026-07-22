class AddressModel {
  final String id;
  final String title;
  final String address;
  final bool isDefault;

  AddressModel({
    required this.id,
    required this.title,
    required this.address,
    this.isDefault = false,
  });

  AddressModel copyWith({
    String? id,
    String? title,
    String? address,
    bool? isDefault,
  }) {
    return AddressModel(
      id: id ?? this.id,
      title: title ?? this.title,
      address: address ?? this.address,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}
