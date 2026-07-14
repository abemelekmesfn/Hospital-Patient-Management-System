import 'dart:async';
import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../models/nurse_task.dart';
import '../models/vitals.dart';

/// State management for the nurse workspace — mirrors Nurse.jsx logic exactly.
class NurseProvider extends ChangeNotifier {
  List<NurseTask> _tasks = [];
  String? _selectedPatient;
  Timer? _pollTimer;
  String? lastError;

  List<NurseTask> get tasks => _tasks;

  // Grouped queue (patient_name → tasks)
  Map<String, List<NurseTask>> get grouped {
    final map = <String, List<NurseTask>>{};
    for (final task in _tasks) {
      map.putIfAbsent(task.patientName, () => []).add(task);
    }
    return map;
  }

  List<NurseTask> get selectedPatientTasks {
    if (_selectedPatient == null) return [];
    return _tasks.where((t) => t.patientName == _selectedPatient).toList();
  }

  String? get selectedPatient => _selectedPatient;

  int? get selectedVisitId {
    final t = selectedPatientTasks;
    return t.isNotEmpty ? t.first.visitId : null;
  }

  // ── Queue polling (every 4s, matching web) ───────────
  void startPolling() {
    fetchTasks();
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) => fetchTasks());
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> fetchTasks() async {
    try {
      final res = await ApiService.instance.get('nurse/queue/');
      final raw = res.data;
      if (raw is List) {
        _tasks = raw.map((e) => NurseTask.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        _tasks = [];
      }
      lastError = null;
      notifyListeners();
    } catch (e) {
      lastError = e.toString();
      debugPrint('[NurseProvider] fetchTasks ERROR: $e');
    }
  }

  void selectPatient(String name) {
    _selectedPatient = name;
    notifyListeners();
  }

  void clearSelection() {
    _selectedPatient = null;
    notifyListeners();
  }

  // ── Task status update ───────────────────────────────
  Future<void> updateTaskStatus(int taskId, String status) async {
    await ApiService.instance.post('nurse/update/$taskId/', data: {'status': status});
    await fetchTasks();
  }

  // ── Vitals ───────────────────────────────────────────
  Future<Vitals> fetchVitals(int visitId) async {
    try {
      final res = await ApiService.instance.get('nurse/visit/$visitId/vitals/');
      return Vitals.fromJson(res.data as Map<String, dynamic>);
    } catch (e) {
      debugPrint('[NurseProvider] fetchVitals ERROR: $e');
      return const Vitals();
    }
  }

  Future<void> submitVitals(int visitId, Map<String, dynamic> body) async {
    if (body.isEmpty) throw Exception('Enter at least one vital to save.');
    await ApiService.instance.patch('nurse/visit/$visitId/vitals/', data: body);
  }

  Future<void> commitVitals(int visitId) async {
    await ApiService.instance.post('nurse/commit-vitals/', data: {'visit_id': visitId});
  }

  // ── Notes ────────────────────────────────────────────
  Future<void> commitNotes(int visitId, String notes) async {
    await ApiService.instance.post('nurse/commit-notes/', data: {
      'visit_id': visitId,
      'notes': notes,
    });
  }

  // ── Patient search ───────────────────────────────────
  Future<List<Map<String, dynamic>>> searchPatients(String query) async {
    if (query.trim().isEmpty) return [];
    try {
      final res = await ApiService.instance.get(
        'patients/search/',
        queryParams: {'q': query.trim()},
      );
      if (res.data is List) {
        return (res.data as List).cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      debugPrint('[NurseProvider] searchPatients ERROR: $e');
      return [];
    }
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }
}
