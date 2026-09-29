import 'package:dairy_app/framework/provider/network/api_endpoints.dart';
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

class DeliveryModeOption {
  final String id;
  final String name;

  DeliveryModeOption({required this.id, required this.name});

  factory DeliveryModeOption.fromJson(Map<String, dynamic> json) => DeliveryModeOption(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
      );
}

@injectable
class DeliveryModeRepository {
  final Dio _dio;

  DeliveryModeRepository(this._dio);

  Future<List<DeliveryModeOption>?> getModes() async {
    try {
      final response = await _dio.get(ApiEndpoints.deliveryModes);
      if (response.data['success'] == true) {
        return (response.data['data'] as List)
            .map((e) => DeliveryModeOption.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
