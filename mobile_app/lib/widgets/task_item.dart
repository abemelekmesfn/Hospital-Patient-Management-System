import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../models/nurse_task.dart';

/// Single task row matching the CSS task-item class.
/// Shows task description, status label, Start/Complete buttons with gradient styling.
class TaskItem extends StatelessWidget {
  final NurseTask task;
  final int animationIndex;
  final Future<void> Function(int taskId, String status) onUpdateStatus;

  const TaskItem({
    super.key,
    required this.task,
    required this.animationIndex,
    required this.onUpdateStatus,
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: Duration(milliseconds: 400 + (animationIndex * 80)),
      curve: Curves.easeOut,
      builder: (_, value, child) {
        return Transform.translate(
          offset: Offset(0, 10 * (1 - value)),
          child: Opacity(opacity: value, child: child),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.borderCard),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Task info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.taskDescription,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Status: ${task.statusLabel}',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Action buttons
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _ActionButton(
                  label: 'Start',
                  enabled: !task.isInProgress,
                  onPressed: () => onUpdateStatus(task.id, 'IN_PROGRESS'),
                ),
                const SizedBox(height: 8),
                _ActionButton(
                  label: 'Complete',
                  enabled: !task.isDone,
                  onPressed: () => onUpdateStatus(task.id, 'DONE'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final bool enabled;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.label,
    required this.enabled,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 90,
      height: 36,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: enabled
              ? const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [AppColors.buttonBlueStart, AppColors.buttonBlueEnd],
                )
              : null,
          color: enabled ? null : AppColors.disabledBg,
          borderRadius: BorderRadius.circular(8),
          boxShadow: enabled
              ? [
                  BoxShadow(
                    color: AppColors.buttonBlueStart.withValues(alpha: 0.2),
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
            child: Center(
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
      ),
    );
  }
}
