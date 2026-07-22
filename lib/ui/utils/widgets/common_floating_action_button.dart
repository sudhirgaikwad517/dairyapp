import 'package:dairy_app/ui/utils/theme/app_colors.dart';
import 'package:dairy_app/ui/utils/widgets/common_icon.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CommonFloatingActionButton extends ConsumerStatefulWidget {
  final Widget? screenName;
  final IconData? icon;
  final bool? isNewExpense;
  final void Function()? onPressed;

  const CommonFloatingActionButton({super.key, this.screenName, this.icon, this.onPressed, this.isNewExpense = false});

  @override
  ConsumerState<CommonFloatingActionButton> createState() => _CommonFloatingActionButtonState();
}

class _CommonFloatingActionButtonState extends ConsumerState<CommonFloatingActionButton> with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _rotationAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    
    // Scale "Twin" Animation: Grows then returns to normal
    _scaleAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.2), weight: 50),
      TweenSequenceItem(tween: Tween(begin: 1.2, end: 1.0), weight: 50),
    ]).animate(CurvedAnimation(parent: _animationController, curve: Curves.easeInOut));

    // Rotation "Twin" Animation: Slight wiggle
    _rotationAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 0.05), weight: 50),
      TweenSequenceItem(tween: Tween(begin: 0.05, end: 0.0), weight: 50),
    ]).animate(CurvedAnimation(parent: _animationController, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _scaleAnimation,
      child: RotationTransition(
        turns: _rotationAnimation,
        child: FloatingActionButton(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
          backgroundColor: AppColors.clrGreen1B5E20,
          elevation: 4,
          onPressed: () async {
            // Trigger animation sequence
            _animationController.forward().then((_) => _animationController.reverse());
            if (widget.onPressed != null) {
              widget.onPressed!();
            } else {
              // Navigator.push(
              //   context,
              //   MaterialPageRoute(builder: (context) => widget.screenName ?? const OverviewScreen()),
              // );
            }
          },
          splashColor: Colors.white, // Enhanced ripple
          child: CommonIcon(
            icon: widget.icon ?? Icons.add,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}
