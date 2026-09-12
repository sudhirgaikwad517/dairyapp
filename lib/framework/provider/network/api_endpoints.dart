class ApiEndpoints {

  ApiEndpoints._();

  static const String baseUrl = "http://192.168.1.10:5555/api/v1/";

  static const String sendOtp = "auth/otp/send";
  static const String verifyOtp = "auth/otp/verify";
  
  static const String getProducts = "products";
  static const String getCategories = "categories";
}