import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:flutter/material.dart';

class BaseModel {

  final String title;
  final CommonIcon iconName;
  final Widget screen;


  BaseModel({required this.title, required this.iconName, required this.screen});

}