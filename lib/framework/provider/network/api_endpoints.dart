class ApiEndpoints {

  ApiEndpoints._();

  /// Override per machine without editing code:
  ///   flutter run --dart-define=API_BASE_URL=http://<your-lan-ip>:5555/api/v1/
  /// Android emulator reaches the host machine at 10.0.2.2.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: "https://erp.shrishtidairyfarm.com/api/v1/",
  );

  static const String sendOtp = "auth/otp/send";
  static const String verifyOtp = "auth/otp/verify";
  static const String me = "auth/me";
  static const String updateProfile = "auth/profile";
  static const String logout = "auth/logout";

  static const String getProducts = "products";
  static const String getCategories = "categories";
  static String categoryDetail(String categoryId) => "categories/$categoryId";
  static const String getBanners = "banners";

  static const String cart = "cart";
  static const String cartItems = "cart/items";

  static const String orders = "orders";

  static const String checkoutOptions = "checkout/options";
  static const String validatePincode = "checkout/validate-pincode";
  static const String checkoutQuote = "checkout/quote";
  static const String checkoutPlace = "checkout/place";

  static const String razorpayStatus = "payments/razorpay/status";
  static const String razorpayOrder = "payments/razorpay/order";
  static const String razorpayWalletOrder = "payments/razorpay/wallet-order";
  static const String razorpaySubscriptionOrder = "payments/razorpay/subscription-order";
  static const String razorpayVerify = "payments/razorpay/verify";

  static const String subscriptions = "subscriptions";
  static const String subscriptionQuote = "subscriptions/quote";
  static const String subscriptionUpcoming = "subscriptions/upcoming";
  static const String subscriptionHistory = "subscriptions/history";

  static const String wallet = "wallet";
  static const String walletTopup = "wallet/topup";
  static const String walletCashRequest = "wallet/cash-request";

  static const String leads = "leads";
  static const String feedback = "feedback";
  static const String cutoffInfo = "cutoff-info";
  static const String cancelReasons = "cancel-reasons";
  static const String notifications = "notifications";
  static const String farmVisits = "farm-visits";
  static const String vacations = "vacations";
  static String cancelVacation(String id) => "vacations/$id/cancel";

  static const String contentPages = "content-pages";
  static String contentPage(String slug) => "content-pages/$slug";
  static const String coupons = "coupons";
  static const String referrals = "referrals";
  static const String deliveryModes = "delivery-modes";
  static const String billing = "billing";
  static const String addresses = "addresses";
  static const String appAssets = "app-assets";
  static String address(String id) => "addresses/$id";
  static String addressSetDefault(String id) => "addresses/$id/default";
}