/// Models for the patient clinical history view.
/// Matches the structure returned by GET /api/patients/<id>/history/

class PatientHistory {
  final PatientInfo patient;
  final List<VisitHistory> visits;

  const PatientHistory({required this.patient, required this.visits});

  factory PatientHistory.fromJson(Map<String, dynamic> json) => PatientHistory(
        patient: PatientInfo.fromJson(json['patient'] as Map<String, dynamic>? ?? {}),
        visits: (json['visits'] as List<dynamic>?)
                ?.map((v) => VisitHistory.fromJson(v as Map<String, dynamic>))
                .toList() ??
            [],
      );
}

class PatientInfo {
  final int? id;
  final String? hospitalId;
  final String? displayName;
  final String? firstName;
  final String? lastName;
  final int? age;
  final String? sex;
  final String? phone;
  final String? dateOfBirth;

  const PatientInfo({
    this.id,
    this.hospitalId,
    this.displayName,
    this.firstName,
    this.lastName,
    this.age,
    this.sex,
    this.phone,
    this.dateOfBirth,
  });

  factory PatientInfo.fromJson(Map<String, dynamic> json) => PatientInfo(
        id: json['id'] as int?,
        hospitalId: json['hospital_id'] as String?,
        displayName: json['display_name'] as String?,
        firstName: json['first_name'] as String?,
        lastName: json['last_name'] as String?,
        age: json['age'] as int?,
        sex: json['sex'] as String?,
        phone: json['phone'] as String?,
        dateOfBirth: json['date_of_birth'] as String?,
      );

  String get title {
    final dn = (displayName ?? '').trim();
    if (dn.isNotEmpty) return dn;
    final full = '${firstName ?? ''} ${lastName ?? ''}'.trim();
    if (full.isNotEmpty && full != 'Unknown Male' && full != 'Unknown Female') return full;
    return hospitalId ?? 'Patient';
  }
}

class VisitHistory {
  final int id;
  final String? arrivalTime;
  final String? status;
  final String? doctorName;
  final TriageData? triage;
  final ConsultationData? consultation;
  final ReceptionData? reception;
  final List<LabOrder> labOrders;
  final List<Prescription> prescriptions;
  final List<NurseTaskHistory> nurseTasks;

  const VisitHistory({
    required this.id,
    this.arrivalTime,
    this.status,
    this.doctorName,
    this.triage,
    this.consultation,
    this.reception,
    this.labOrders = const [],
    this.prescriptions = const [],
    this.nurseTasks = const [],
  });

  factory VisitHistory.fromJson(Map<String, dynamic> json) => VisitHistory(
        id: json['id'] as int,
        arrivalTime: json['arrival_time'] as String?,
        status: json['status'] as String?,
        doctorName: json['doctor_name'] as String?,
        triage: json['triage'] != null ? TriageData.fromJson(json['triage'] as Map<String, dynamic>) : null,
        consultation:
            json['consultation'] != null ? ConsultationData.fromJson(json['consultation'] as Map<String, dynamic>) : null,
        reception: json['reception'] != null ? ReceptionData.fromJson(json['reception'] as Map<String, dynamic>) : null,
        labOrders:
            (json['lab_orders'] as List<dynamic>?)?.map((e) => LabOrder.fromJson(e as Map<String, dynamic>)).toList() ??
                [],
        prescriptions: (json['prescriptions'] as List<dynamic>?)
                ?.map((e) => Prescription.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        nurseTasks: (json['nurse_tasks'] as List<dynamic>?)
                ?.map((e) => NurseTaskHistory.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );
}

class TriageData {
  final String? priority;
  final String? chiefComplaint;
  final dynamic temperature;
  final String? bloodPressure;
  final dynamic pulse;
  final dynamic respiratoryRate;
  final String? recordedAt;

  const TriageData({
    this.priority,
    this.chiefComplaint,
    this.temperature,
    this.bloodPressure,
    this.pulse,
    this.respiratoryRate,
    this.recordedAt,
  });

  factory TriageData.fromJson(Map<String, dynamic> json) => TriageData(
        priority: json['priority'] as String?,
        chiefComplaint: json['chief_complaint'] as String?,
        temperature: json['temperature'],
        bloodPressure: json['blood_pressure'] as String?,
        pulse: json['pulse'],
        respiratoryRate: json['respiratory_rate'],
        recordedAt: json['recorded_at'] as String?,
      );
}

class ConsultationData {
  final String? doctorName;
  final String? diagnosis;
  final String? physicalExam;
  final String? examinedAt;

  const ConsultationData({
    this.doctorName,
    this.diagnosis,
    this.physicalExam,
    this.examinedAt,
  });

  factory ConsultationData.fromJson(Map<String, dynamic> json) => ConsultationData(
        doctorName: json['doctor_name'] as String?,
        diagnosis: json['diagnosis'] as String?,
        physicalExam: json['physical_exam'] as String?,
        examinedAt: json['examined_at'] as String?,
      );
}

class ReceptionData {
  final String? arrivalMode;
  final String? arrivalTime;
  final String? kinName;
  final String? kinPhone;
  final String? kinRelationship;

  const ReceptionData({
    this.arrivalMode,
    this.arrivalTime,
    this.kinName,
    this.kinPhone,
    this.kinRelationship,
  });

  factory ReceptionData.fromJson(Map<String, dynamic> json) => ReceptionData(
        arrivalMode: json['arrival_mode'] as String?,
        arrivalTime: json['arrival_time'] as String?,
        kinName: json['kin_name'] as String?,
        kinPhone: json['kin_phone'] as String?,
        kinRelationship: json['kin_relationship'] as String?,
      );
}

class LabOrder {
  final String? testName;
  final String? status;
  final String? result;

  const LabOrder({this.testName, this.status, this.result});

  factory LabOrder.fromJson(Map<String, dynamic> json) => LabOrder(
        testName: json['test_name'] as String?,
        status: json['status'] as String?,
        result: json['result'] as String?,
      );
}

class Prescription {
  final String? drugName;
  final String? dosage;
  final String? frequency;
  final String? duration;
  final String? pharmacyStatus;

  const Prescription({this.drugName, this.dosage, this.frequency, this.duration, this.pharmacyStatus});

  factory Prescription.fromJson(Map<String, dynamic> json) => Prescription(
        drugName: json['drug_name'] as String?,
        dosage: json['dosage'] as String?,
        frequency: json['frequency'] as String?,
        duration: json['duration'] as String?,
        pharmacyStatus: json['pharmacy_status'] as String?,
      );
}

class NurseTaskHistory {
  final String? taskDescription;
  final String? status;

  const NurseTaskHistory({this.taskDescription, this.status});

  factory NurseTaskHistory.fromJson(Map<String, dynamic> json) => NurseTaskHistory(
        taskDescription: json['task_description'] as String?,
        status: json['status'] as String?,
      );
}
