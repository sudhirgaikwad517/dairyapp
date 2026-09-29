/// One saved delivery address. A customer can save several of these; exactly
/// one is marked [isDefault], which is what checkout uses unless the
/// customer picks a different one.
class AddressModel {
  final String id;
  final String title;
  final String flatNo;
  final String societyName;
  final String streetName;
  final String landmark;
  final String city;
  final String state;
  final String pincode;

  /// The joined, display-ready address the backend builds from the parts.
  final String address;

  final bool isDefault;

  AddressModel({
    this.id = '',
    this.title = 'Home',
    this.flatNo = '',
    this.societyName = '',
    this.streetName = '',
    this.landmark = '',
    this.city = '',
    this.state = '',
    this.pincode = '',
    this.address = '',
    this.isDefault = false,
  });

  bool get isEmpty =>
      address.trim().isEmpty &&
      flatNo.trim().isEmpty &&
      societyName.trim().isEmpty &&
      streetName.trim().isEmpty &&
      city.trim().isEmpty;

  factory AddressModel.fromJson(Map<String, dynamic> json) {
    return AddressModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Home',
      flatNo: json['flatNo']?.toString() ?? '',
      societyName: json['societyName']?.toString() ?? '',
      streetName: json['streetName']?.toString() ?? '',
      landmark: json['landmark']?.toString() ?? '',
      city: json['city']?.toString() ?? '',
      state: json['state']?.toString() ?? '',
      pincode: json['pincode']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      isDefault: json['isDefault'] == true,
    );
  }

  Map<String, dynamic> toPayload() => {
        'title': title.trim().isNotEmpty ? title.trim() : 'Home',
        'flatNo': flatNo,
        'societyName': societyName,
        'streetName': streetName,
        'landmark': landmark,
        'city': city,
        'state': state,
        'pincode': pincode,
      };

  AddressModel copyWith({
    String? id,
    String? title,
    String? flatNo,
    String? societyName,
    String? streetName,
    String? landmark,
    String? city,
    String? state,
    String? pincode,
    String? address,
    bool? isDefault,
  }) {
    return AddressModel(
      id: id ?? this.id,
      title: title ?? this.title,
      flatNo: flatNo ?? this.flatNo,
      societyName: societyName ?? this.societyName,
      streetName: streetName ?? this.streetName,
      landmark: landmark ?? this.landmark,
      city: city ?? this.city,
      state: state ?? this.state,
      pincode: pincode ?? this.pincode,
      address: address ?? this.address,
      isDefault: isDefault ?? this.isDefault,
    );
  }
}
