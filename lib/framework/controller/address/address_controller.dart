import 'package:dairy_app/framework/dependency_injection/inject.dart';
import 'package:dairy_app/framework/repository/address/address_model.dart';
import 'package:dairy_app/framework/repository/address/address_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/legacy.dart';

final addressProvider = ChangeNotifierProvider((ref) => AddressController()..loadAddress());

/// The customer's saved address book. Checkout and cart use [selectedAddress]
/// — whichever saved address is marked default — unless the customer picks
/// a different one from the list.
class AddressController extends ChangeNotifier {
  List<AddressModel> _addresses = [];
  bool _isLoading = false;
  String? _error;

  AddressRepository get _repository => getIt<AddressRepository>();

  bool get isLoading => _isLoading;
  String? get error => _error;

  List<AddressModel> get addresses => _addresses;

  AddressModel? get selectedAddress {
    if (_addresses.isEmpty) return null;
    return _addresses.firstWhere((a) => a.isDefault, orElse: () => _addresses.first);
  }

  Future<void> loadAddress() async {
    _isLoading = true;
    notifyListeners();

    final list = await _repository.getAddresses();
    if (list != null) {
      _addresses = list;
      _error = null;
    } else {
      _error = 'Unable to load your addresses';
    }

    _isLoading = false;
    notifyListeners();
  }

  /// Creates a new address, or updates an existing one when [editId] is set.
  Future<bool> saveAddress(AddressModel address, {String? editId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final saved = editId != null
        ? await _repository.updateAddress(editId, address)
        : await _repository.createAddress(address);

    if (saved != null) {
      await loadAddress();
      return true;
    }

    _error = 'Unable to save address';
    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> removeAddress(String id) async {
    final removed = await _repository.deleteAddress(id);
    if (removed) {
      await loadAddress();
    } else {
      _error = 'Unable to remove address';
      notifyListeners();
    }
    return removed;
  }

  Future<bool> setDefault(String id) async {
    final ok = await _repository.setDefault(id);
    if (ok) {
      await loadAddress();
    } else {
      _error = 'Unable to set default address';
      notifyListeners();
    }
    return ok;
  }
}
