import 'package:dairy_app/ui/utils/widgets/common_text.dart';
import 'package:flutter/material.dart';

class CommonAlert extends StatelessWidget {
  final String title;

  const CommonAlert({
    super.key,
    required this.title
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
        title: CommonText(data: title),
        actions: [
          TextButton(
              onPressed: () {
                Navigator.pop(context);
              },
              child: CommonText(data: 'Ok')
          )
        ]
    );
  }
}