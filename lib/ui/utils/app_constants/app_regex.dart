class AppRegex {
  /// regex for validation
  static final email = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w]{2,4}$');
  static final phone = RegExp(r'^[6-9]\d{9}$');
  static final password = RegExp(
    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$#!%*?&])[A-Za-z\d@$#!%*?&]{8,}$',
  );
  static final name = RegExp(r'^[a-zA-Z ]+$');

}
