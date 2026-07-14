import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../models/nurse_task.dart';

/// Queue card widget matching the CSS queue-card class.
/// Shows patient name, active/done task counts, priority bar on left, active state.
class QueueCard extends StatelessWidget {
  final String patientName;
  final List<NurseTask> tasks;
  final bool isActive;
  final VoidCallback onTap;

  const QueueCard({
    super.key,
    required this.patientName,
    required this.tasks,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final priority = tasks.isNotEmpty ? tasks.first.priority : null;
    final activeCnt = tasks.where((t) => t.status != 'DONE').length;
    final doneCnt = tasks.where((t) => t.status == 'DONE').length;
    final priorityColor = AppColors.priorityColor(priority);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: isActive ? null : AppColors.cardBg,
          gradient: isActive
              ? const LinearGradient(
                  colors: [
                    AppColors.activeGradientStart,
                    AppColors.activeGradientEnd,
                  ],
                )
              : null,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isActive ? Colors.transparent : AppColors.borderCard,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: AppColors.accentBlue.withValues(alpha: 0.15),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                  BoxShadow(
                    color: AppColors.accentBlue,
                    spreadRadius: 0,
                    blurRadius: 0,
                    offset: Offset.zero,
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 3,
                    offset: const Offset(0, 1),
                  ),
                ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            children: [
              // Priority accent bar on left
              if (isActive)
                Positioned(
                  left: 0,
                  top: 0,
                  bottom: 0,
                  child: Container(width: 4, color: AppColors.accentBlue),
                ),
              // Blue ring effect via border (handled by decoration above)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    // Priority dot
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: priorityColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            patientName,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          if (tasks.isNotEmpty && tasks.first.isAdmitted)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8.0),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.blueBg,
                                      border: Border.all(color: AppColors.accentBlue.withValues(alpha: 0.3)),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text('🏥 Admitted', style: TextStyle(color: AppColors.accentBlue, fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                  if (tasks.first.wardName != null) ...[
                                    const SizedBox(width: 8),
                                    Text('${tasks.first.wardName} - Bed ${tasks.first.bedNumber}', style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600)),
                                  ]
                                ],
                              ),
                            ),
                          Row(
                            children: [
                              _MetaChip(
                                label: '$activeCnt active',
                                color: AppColors.textSecondary,
                              ),
                              const SizedBox(width: 12),
                              _MetaChip(
                                label: '$doneCnt done',
                                color: AppColors.textSecondary,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    if (isActive)
                      const Icon(
                        Icons.chevron_right_rounded,
                        color: AppColors.accentBlue,
                        size: 20,
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  final String label;
  final Color color;

  const _MetaChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Text(label, style: TextStyle(fontSize: 12, color: color));
  }
}
