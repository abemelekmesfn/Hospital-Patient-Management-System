/// Matches the backend NurseTaskSerializer fields.
class NurseTask {
  final int id;
  final int visitId;
  final String patientName;
  final String taskDescription;
  final String status;
  final String? priority;
  final String? createdAt;
  final String? completedAt;
  final bool isAdmitted;
  final String? wardName;
  final String? bedNumber;
  final String? admissionNote;

  const NurseTask({
    required this.id,
    required this.visitId,
    required this.patientName,
    required this.taskDescription,
    required this.status,
    this.priority,
    this.createdAt,
    this.completedAt,
    this.isAdmitted = false,
    this.wardName,
    this.bedNumber,
    this.admissionNote,
  });

  factory NurseTask.fromJson(Map<String, dynamic> json) => NurseTask(
    id: json['id'] as int,
    visitId: json['visit_id'] as int,
    patientName: json['patient_name'] as String? ?? '',
    taskDescription: json['task_description'] as String? ?? '',
    status: json['status'] as String? ?? 'PENDING',
    priority: json['priority'] as String?,
    createdAt: json['created_at'] as String?,
    completedAt: json['completed_at'] as String?,
    isAdmitted: json['is_admitted'] as bool? ?? false,
    wardName: json['ward_name'] as String?,
    bedNumber: json['bed_number'] as String?,
    admissionNote: json['admission_note'] as String?,
  );

  bool get isDone => status == 'DONE';
  bool get isInProgress => status == 'IN_PROGRESS';
  bool get isPending => status == 'PENDING';

  String get statusLabel {
    switch (status) {
      case 'DONE':
        return 'Done';
      case 'IN_PROGRESS':
        return 'In progress';
      default:
        return 'Pending';
    }
  }
}
