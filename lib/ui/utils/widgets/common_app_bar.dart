import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CommonAppBar extends ConsumerStatefulWidget implements PreferredSizeWidget {
  final Widget? leading;
  final Widget? title;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;
  final double? elevation;
  final  Color? shadowColor;
  final double? appBarHeight;

  const CommonAppBar({super.key, this.leading, this.title, this.actions, this.bottom, this.elevation, this.shadowColor, this.appBarHeight});

  @override
  ConsumerState<CommonAppBar> createState() => _CommonAppBarState();

  @override
  Size get preferredSize => Size.fromHeight((appBarHeight ?? 65) + (bottom?.preferredSize.height ?? 0));
}

class _CommonAppBarState extends ConsumerState<CommonAppBar> {
  @override
  Widget build(BuildContext context) {
    return AppBar(
      leading: widget.leading,
      title: widget.title,
      actions: widget.actions,
      bottom: widget.bottom,
      elevation: widget.elevation ?? 0,
      shadowColor: widget.shadowColor,
      centerTitle: false,
      toolbarHeight: widget.appBarHeight ?? 65,
      actionsPadding: const EdgeInsets.only(right: 20),
    );
  }
}
