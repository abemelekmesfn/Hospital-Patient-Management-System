import 'package:flutter/material.dart';
import '../core/constants.dart';

/// Full‑width "Record vitals" button matching the CSS vitals-btn class.
class RecordVitalsButton extends StatelessWidget {
  final bool enabled;
  final VoidCallback onPressed;

  const RecordVitalsButton({
    super.key,
    required this.enabled,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 14),
      child: SizedBox(
        width: double.infinity,
        height: 50,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: enabled
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppColors.vitalsBlueStart, AppColors.vitalsBlueEnd],
                  )
                : null,
            color: enabled ? null : AppColors.disabledBg,
            borderRadius: BorderRadius.circular(10),
            boxShadow: enabled
                ? [
                    BoxShadow(
                      color: AppColors.vitalsBlueStart.withValues(alpha: 0.2),
                      blurRadius: 6,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: enabled ? onPressed : null,
              borderRadius: BorderRadius.circular(10),
              child: Center(
                child: Text(
                  '+ Record vitals',
                  style: TextStyle(
                    color: enabled ? Colors.white : AppColors.disabledText,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
