import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dairy_app/framework/repository/address/address_model.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

@injectable
class AddressRepository {
  final Dio _dio;

  AddressRepository(this._dio);

  String _messageFrom(Object e, String fallback) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map && data['message'] != null) return data['message'].toString();
    }
    return fallback;
  }

  Future<List<AddressModel>?> getAddresses() async {
    try {
      final response = await _dio.get(ApiEndpoints.addresses);
      if (response.data['success'] == true) {
        return (response.data['data'] as List)
            .map((e) => AddressModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<AddressModel?> createAddress(AddressModel address, {bool makeDefault = false}) async {
    try {
      final response = await _dio.post(ApiEndpoints.addresses, data: {
        ...address.toPayload(),
        if (makeDefault) 'isDefault': true,
      });
      if (response.data['success'] == true) {
        return AddressModel.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<AddressModel?> updateAddress(String id, AddressModel address) async {
    try {
      final response = await _dio.patch(ApiEndpoints.address(id), data: address.toPayload());
      if (response.data['success'] == true) {
        return AddressModel.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<bool> deleteAddress(String id) async {
    try {
      final response = await _dio.delete(ApiEndpoints.address(id));
      return response.data['success'] == true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> setDefault(String id) async {
    try {
      final response = await _dio.patch(ApiEndpoints.addressSetDefault(id));
      return response.data['success'] == true;
    } catch (_) {
      return false;
    }
  }
}
