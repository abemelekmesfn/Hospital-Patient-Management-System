import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/constants.dart';
import '../models/patient_history.dart';

class PatientHistoryScreen extends StatefulWidget {
  final int patientId;

  const PatientHistoryScreen({super.key, required this.patientId});

  @override
  State<PatientHistoryScreen> createState() => _PatientHistoryScreenState();
}

class _PatientHistoryScreenState extends State<PatientHistoryScreen> {
  PatientHistory? _data;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    try {
      final res = await ApiService.instance.get('patients/${widget.patientId}/history/');
      if (mounted) {
        setState(() {
          _data = PatientHistory.fromJson(res.data as Map<String, dynamic>);
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Could not load patient history.';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      appBar: AppBar(
        title: const Text('Patient history'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primaryIndigo,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null || _data == null) {
      return Center(
        child: Text(
          _error ?? 'No data',
          style: const TextStyle(color: AppColors.error, fontSize: 15),
        ),
      );
    }

    final patient = _data!.patient;
    final visits = _data!.visits;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 920),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Patient Card
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AppColors.borderCard),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        patient.title,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryIndigo,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 24,
                        runSpacing: 12,
                        children: [
                          _DetailItem(label: 'Hospital ID', value: patient.hospitalId),
                          _DetailItem(label: 'Age', value: patient.age?.toString()),
                          _DetailItem(label: 'Sex', value: patient.sex),
                          _DetailItem(label: 'Phone', value: patient.phone),
                          _DetailItem(label: 'Date of birth', value: patient.dateOfBirth),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              if (visits.isEmpty)
                const Text(
                  'No previous visits recorded for this patient.',
                  style: TextStyle(color: AppColors.textSecondary),
                )
              else
                ...visits.map((v) => _VisitCard(visit: v)),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailItem extends StatelessWidget {
  final String label;
  final String? value;

  const _DetailItem({required this.label, this.value});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 140,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              letterSpacing: 0.5,
              color: AppColors.primaryIndigoLight,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value?.isNotEmpty == true ? value! : '—',
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

class _VisitCard extends StatelessWidget {
  final VisitHistory visit;

  const _VisitCard({required this.visit});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.borderCard),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Visit ${visit.id}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryIndigo,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_formatDate(visit.arrivalTime)} · Status: ${visit.status}',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                if (visit.doctorName != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8EAF6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Dr. ${visit.doctorName}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primaryIndigoLight,
                      ),
                    ),
                  ),
              ],
            ),
            const Divider(height: 24),

            // Triage
            if (visit.triage != null) _buildTriage(visit.triage!),

            // Consultation
            if (visit.consultation != null) _buildConsultation(visit.consultation!),

            // Labs
            if (visit.labOrders.isNotEmpty) _buildLabs(visit.labOrders),

            // Prescriptions
            if (visit.prescriptions.isNotEmpty) _buildRx(visit.prescriptions),
            
            // Nurse Tasks
            if (visit.nurseTasks.isNotEmpty) _buildNurseTasks(visit.nurseTasks),
          ],
        ),
      ),
    );
  }

  Widget _buildTriage(TriageData triage) {
    return _Section(
      title: 'Triage',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.priorityColor(triage.priority).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  triage.priority ?? '',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.priorityColor(triage.priority),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(_formatDate(triage.recordedAt)),
            ],
          ),
          const SizedBox(height: 6),
          Text('Chief complaint: ${triage.chiefComplaint ?? '—'}'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 16,
            children: [
              Text('Temp: ${triage.temperature ?? '—'} °C'),
              Text('BP: ${triage.bloodPressure ?? '—'}'),
              Text('Pulse: ${triage.pulse ?? '—'}'),
              Text('RR: ${triage.respiratoryRate ?? '—'}'),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildConsultation(ConsultationData c) {
    return _Section(
      title: 'Examination',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Examined by: ${c.doctorName ?? '—'} · ${_formatDate(c.examinedAt)}'),
          const SizedBox(height: 4),
          Text('Diagnosis: ${c.diagnosis ?? '—'}'),
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F5F5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Physical exam / notes', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(c.physicalExam ?? '—'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabs(List<LabOrder> labs) {
    return _Section(
      title: 'Laboratory',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: labs.map((l) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('• ${l.testName} (${l.status})', style: const TextStyle(fontWeight: FontWeight.w600)),
                if (l.result != null && l.result!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(left: 12, top: 4),
                    child: Text(l.result!, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                  ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildRx(List<Prescription> rx) {
    return _Section(
      title: 'Prescriptions',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: rx.map((r) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text('• ${r.drugName} — ${r.dosage}, ${r.frequency}, ${r.duration} (${r.pharmacyStatus})'),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildNurseTasks(List<NurseTaskHistory> tasks) {
    return _Section(
      title: 'Nursing tasks',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: tasks.map((t) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text('• ${t.taskDescription} — ${t.status}'),
          );
        }).toList(),
      ),
    );
  }

  String _formatDate(String? iso) {
    if (iso == null) return '—';
    try {
      final d = DateTime.parse(iso).toLocal();
      return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;

  const _Section({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title.toUpperCase(),
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: AppColors.primaryIndigoLight,
            ),
          ),
          const SizedBox(height: 8),
          DefaultTextStyle(
            style: const TextStyle(fontSize: 14, color: AppColors.textDark, height: 1.4),
            child: child,
          ),
        ],
      ),
    );
  }
}
