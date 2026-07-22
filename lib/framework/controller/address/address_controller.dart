import 'package:dairy_app/framework/repository/address/address_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

final addressProvider = ChangeNotifierProvider((ref) => AddressController());

class AddressController extends ChangeNotifier {
  final List<AddressModel> _addresses = [
    AddressModel(
      id: '1',
      title: 'Home',
      address: '11/15, Rajwada, Sector 2, Pune',
      isDefault: true,
    ),
  ];

  List<AddressModel> get addresses => _addresses;

  AddressModel? get selectedAddress {
    try {
      return _addresses.firstWhere((element) => element.isDefault);
    } catch (e) {
      return _addresses.isNotEmpty ? _addresses.first : null;
    }
  }

  void addAddress(AddressModel address) {
    if (address.isDefault) {
      for (var element in _addresses) {
        if (element.isDefault) {
          int index = _addresses.indexOf(element);
          _addresses[index] = element.copyWith(isDefault: false);
        }
      }
    }
    _addresses.add(address);
    notifyListeners();
  }

  void selectAddress(String id) {
    for (int i = 0; i < _addresses.length; i++) {
      if (_addresses[i].id == id) {
        _addresses[i] = _addresses[i].copyWith(isDefault: true);
      } else {
        _addresses[i] = _addresses[i].copyWith(isDefault: false);
      }
    }
    notifyListeners();
  }

  void removeAddress(String id) {
    _addresses.removeWhere((element) => element.id == id);
    notifyListeners();
  }
}
