import 'package:flutter/material.dart';
import '../core/constants.dart';

/// Success toast matching the CSS doctor-toast class.
/// Slides in from the right, auto-dismisses after 3 seconds.
class ToastOverlay {
  static OverlayEntry? _current;

  static void show(BuildContext context, String message) {
    _current?.remove();
    final entry = OverlayEntry(
      builder: (_) => _ToastWidget(
        message: message,
        onDismiss: () {
          _current?.remove();
          _current = null;
        },
      ),
    );
    _current = entry;
    Overlay.of(context).insert(entry);
  }
}

class _ToastWidget extends StatefulWidget {
  final String message;
  final VoidCallback onDismiss;

  const _ToastWidget({required this.message, required this.onDismiss});

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<Offset> _slide;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _slide = Tween<Offset>(
      begin: const Offset(1, 0),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOut));
    _fade = Tween(begin: 0.0, end: 1.0).animate(_ctrl);

    _ctrl.forward();
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        _ctrl.reverse().then((_) => widget.onDismiss());
      }
    });
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 20,
      right: 20,
      child: SlideTransition(
        position: _slide,
        child: FadeTransition(
          opacity: _fade,
          child: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(8),
            color: AppColors.toastSuccess,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Text(
                widget.message,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
