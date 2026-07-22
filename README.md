# dairy_app

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
# Dairy App

## UPI payments

UPI payments use the installed Android UPI apps through `upi_india`. Provide the
business UPI ID at build/run time; it is deliberately not hard-coded in source:

```bash
flutter run \
  --dart-define=UPI_RECEIVER_UPI_ID=your-business@bank \
  --dart-define="UPI_RECEIVER_NAME=Your Dairy"
```

Use the same `--dart-define` values for release builds. The customer is sent to
their selected UPI app, then returned to the app. Treat that return status as a
client-side signal only—verify the transaction with your payment provider or
backend before confirming an order.
