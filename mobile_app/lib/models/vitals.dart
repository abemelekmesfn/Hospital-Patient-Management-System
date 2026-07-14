/// Vitals data matching the NurseVisitVitalsView response.
class Vitals {
  final String pulse;
  final String bloodPressure;
  final String temperature;
  final String respiratoryRate;

  const Vitals({
    this.pulse = '',
    this.bloodPressure = '',
    this.temperature = '',
    this.respiratoryRate = '',
  });

  factory Vitals.fromJson(Map<String, dynamic> json) => Vitals(
        pulse: _str(json['pulse']),
        bloodPressure: _str(json['blood_pressure']),
        temperature: _str(json['temperature']),
        respiratoryRate: _str(json['respiratory_rate']),
      );

  /// Builds the PATCH body; only includes non‑empty fields.
  Map<String, dynamic> toPatchBody({
    required String pulse,
    required String bp,
    required String temp,
    required String rr,
  }) {
    final body = <String, dynamic>{};
    if (pulse.trim().isNotEmpty) body['pulse'] = pulse.trim();
    if (bp.trim().isNotEmpty) body['blood_pressure'] = bp.trim();
    if (temp.trim().isNotEmpty) body['temperature'] = temp.trim();
    if (rr.trim().isNotEmpty) body['respiratory_rate'] = rr.trim();
    return body;
  }

  static String _str(dynamic v) => v != null ? v.toString() : '';
}
