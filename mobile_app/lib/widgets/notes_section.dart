import 'package:flutter/material.dart';
import '../core/constants.dart';

/// Observation notes section matching the CSS nurse-notes class.
/// TextArea + "Commit to Doctor" green gradient button.
class NotesSection extends StatelessWidget {
  final TextEditingController controller;
  final bool canCommit;
  final VoidCallback onCommit;

  const NotesSection({
    super.key,
    required this.controller,
    required this.canCommit,
    required this.onCommit,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Observation notes',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: controller,
            maxLines: 5,
            minLines: 4,
            decoration: InputDecoration(
              hintText: 'Write observation notes...',
              hintStyle: const TextStyle(color: AppColors.textMuted),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.all(12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFFCCCCCC)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFFCCCCCC)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.accentBlue, width: 2),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerRight,
            child: _CommitButton(
              enabled: canCommit,
              onPressed: onCommit,
            ),
          ),
        ],
      ),
    );
  }
}

/// Reusable "Commit to Doctor" green gradient button matching commit-doctor-btn CSS.
class _CommitButton extends StatelessWidget {
  final bool enabled;
  final VoidCallback onPressed;
  final String label;

  const _CommitButton({
    required this.enabled,
    required this.onPressed,
    this.label = 'Commit to Doctor',
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: enabled
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.commitGreenStart, AppColors.commitGreenEnd],
              )
            : null,
        color: enabled ? null : AppColors.disabledBg,
        borderRadius: BorderRadius.circular(8),
        boxShadow: enabled
            ? [
                BoxShadow(
                  color: AppColors.commitGreenStart.withValues(alpha: 0.2),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: enabled ? onPressed : null,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            child: Text(
              label,
              style: TextStyle(
                color: enabled ? Colors.white : AppColors.disabledText,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
