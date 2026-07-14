import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../models/nurse_task.dart';
import '../providers/nurse_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/vitals_modal.dart';
import '../widgets/toast_overlay.dart';
import 'patient_history_screen.dart';

/// ─── Nurse Home Screen ────────────────────────────────────────────
/// Exact clone of Nurse.jsx — work queue on the left, task detail on
/// the right. On narrow screens the two panels toggle visibility,
/// matching the CSS `mobile-show-queue` / `mobile-hide-queue` logic.
class NurseHomeScreen extends StatefulWidget {
  const NurseHomeScreen({super.key});

  @override
  State<NurseHomeScreen> createState() => _NurseHomeScreenState();
}

class _NurseHomeScreenState extends State<NurseHomeScreen> {
  final _notesCtrl = TextEditingController();
  final _searchCtrl = TextEditingController();

  bool _showQueue = true; // mobile toggle
  List<Map<String, dynamic>> _searchResults = [];
  bool _searchLoading = false;
  String? _searchError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NurseProvider>().startPolling();
    });
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    _searchCtrl.dispose();
    context.read<NurseProvider>().stopPolling();
    super.dispose();
  }

  // ── Patient search (debounced inline) ───────────────────────────
  Future<void> _doSearch(String q) async {
    if (q.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _searchError = null;
      });
      return;
    }
    setState(() {
      _searchLoading = true;
      _searchError = null;
    });
    final results = await context.read<NurseProvider>().searchPatients(q);
    if (!mounted) return;
    setState(() {
      _searchResults = results;
      _searchLoading = false;
      _searchError = results.isEmpty ? 'Patient not found' : null;
    });
  }

  // ── Queue selection ─────────────────────────────────────────────
  void _selectPatient(String name) {
    context.read<NurseProvider>().selectPatient(name);
    _notesCtrl.clear();
    setState(() => _showQueue = false);
  }

  // ── Task status update ──────────────────────────────────────────
  Future<void> _updateStatus(int taskId, String status) async {
    try {
      await context.read<NurseProvider>().updateTaskStatus(taskId, status);
      if (mounted) {
        ToastOverlay.show(context, 'Task updated');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to update task: $e')));
      }
    }
  }

  // ── Commit notes ────────────────────────────────────────────────
  Future<void> _commitNotes(int visitId) async {
    final text = _notesCtrl.text.trim();
    if (text.isEmpty) return;
    try {
      await context.read<NurseProvider>().commitNotes(visitId, text);
      if (mounted) {
        ToastOverlay.show(context, 'Notes committed to doctor!');
        _notesCtrl.clear();
        setState(() {});
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to commit notes: $e')));
      }
    }
  }

  // ── Open vitals modal ───────────────────────────────────────────
  Future<void> _openVitalsModal(int visitId) async {
    final provider = context.read<NurseProvider>();
    final vitals = await provider.fetchVitals(visitId);
    if (!mounted) return;

    final result = await showDialog<String>(
      context: context,
      barrierColor: AppColors.backdropColor,
      builder: (_) => VitalsModal(
        visitId: visitId,
        initialVitals: vitals,
        onSave: provider.submitVitals,
        onCommit: provider.commitVitals,
      ),
    );

    if (mounted) {
      if (result == 'saved') {
        ToastOverlay.show(context, 'Vitals saved!');
      } else if (result == 'committed') {
        ToastOverlay.show(context, 'Vitals committed to doctor!');
      }
    }
  }

  // ── Logout ──────────────────────────────────────────────────────
  Future<void> _logout() async {
    context.read<NurseProvider>().stopPolling();
    await context.read<AuthProvider>().logout();
    if (mounted) {
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
    }
  }

  // ═══════════════════ BUILD ═══════════════════════════════════════
  @override
  Widget build(BuildContext context) {
    final nurse = context.watch<NurseProvider>();
    final auth = context.watch<AuthProvider>();
    final grouped = nurse.grouped;
    final selected = nurse.selectedPatient;
    final tasks = nurse.selectedPatientTasks;
    final visitId = nurse.selectedVisitId;
    final w = MediaQuery.of(context).size.width;
    final isWide = w > 768;

    return Scaffold(
      backgroundColor: AppColors.scaffoldBg,
      appBar: _buildAppBar(auth, nurse),
      body: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SizedBox(width: 300, child: _buildQueue(grouped, selected)),
                const VerticalDivider(width: 1, color: AppColors.border),
                Expanded(child: _buildDetail(selected, tasks, visitId)),
              ],
            )
          : _showQueue
          ? _buildQueue(grouped, selected)
          : _buildDetail(selected, tasks, visitId),
    );
  }

  // ── App bar (TopNav clone) ──────────────────────────────────────
  PreferredSizeWidget _buildAppBar(AuthProvider auth, NurseProvider nurse) {
    final user = auth.user;
    final initial = user?.initial ?? '?';
    final name = user?.displayName ?? 'Staff';

    return AppBar(
      automaticallyImplyLeading: false,
      backgroundColor: AppColors.primaryIndigo,
      elevation: 2,
      toolbarHeight: 56,
      title: Row(
        children: [
          // HPMS badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
            ),
            child: const Text(
              'HPMS',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 13,
                letterSpacing: 1.0,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 10),
          const Text(
            'Nurse',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 12),

          // Search bar
          Expanded(
            child: SizedBox(
              height: 36,
              child: TextField(
                controller: _searchCtrl,
                onChanged: _doSearch,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'search patient...',
                  hintStyle: TextStyle(
                    color: Colors.white.withValues(alpha: 0.6),
                    fontSize: 13,
                  ),
                  filled: true,
                  fillColor: Colors.white.withValues(alpha: 0.14),
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: Colors.white.withValues(alpha: 0.3),
                    ),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: Colors.white.withValues(alpha: 0.3),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: BorderSide(
                      color: Colors.white.withValues(alpha: 0.6),
                    ),
                  ),
                  prefixIcon: Icon(
                    Icons.search,
                    color: Colors.white.withValues(alpha: 0.7),
                    size: 18,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),

          // Avatar
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withValues(alpha: 0.18),
              border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
            ),
            alignment: Alignment.center,
            child: Text(
              initial,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 13,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 6),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 80),
            child: Text(
              name,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ),
          const SizedBox(width: 8),

          // Logout
          Material(
            color: Colors.white.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
            child: InkWell(
              onTap: _logout,
              borderRadius: BorderRadius.circular(8),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.22),
                  ),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.logout_rounded, size: 14, color: Colors.white),
                    SizedBox(width: 4),
                    Text(
                      'Log out',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      // Search results dropdown
      bottom: (_searchResults.isNotEmpty || _searchError != null)
          ? PreferredSize(
              preferredSize: Size.fromHeight(
                _searchError != null
                    ? 40
                    : (_searchResults.length * 52.0).clamp(0, 208),
              ),
              child: Container(
                width: double.infinity,
                color: Colors.white,
                constraints: const BoxConstraints(maxHeight: 208),
                child: _searchError != null
                    ? Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          _searchError!,
                          style: const TextStyle(
                            color: AppColors.error,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        itemCount: _searchResults.length,
                        itemBuilder: (_, i) {
                          final p = _searchResults[i];
                          final label =
                              (p['display_name'] as String?)?.isNotEmpty == true
                              ? p['display_name']
                              : '${p['first_name'] ?? ''} ${p['last_name'] ?? ''}'
                                    .trim();
                          return ListTile(
                            dense: true,
                            title: Text(
                              label.isNotEmpty ? label : 'Patient',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: AppColors.primaryIndigo,
                              ),
                            ),
                            subtitle: p['hospital_id'] != null
                                ? Text(
                                    p['hospital_id'] as String,
                                    style: const TextStyle(fontSize: 12),
                                  )
                                : null,
                            onTap: () {
                              _searchCtrl.clear();
                              setState(() {
                                _searchResults = [];
                                _searchError = null;
                              });
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => PatientHistoryScreen(
                                    patientId: p['id'] as int,
                                  ),
                                ),
                              );
                            },
                          );
                        },
                      ),
              ),
            )
          : null,
    );
  }

  // ── Left panel: Work Queue ──────────────────────────────────────
  Widget _buildQueue(Map<String, List<NurseTask>> grouped, String? selected) {
    return Container(
      color: AppColors.sidebarBg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          const Padding(
            padding: EdgeInsets.fromLTRB(24, 24, 24, 16),
            child: Text(
              'Work queue',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
          ),

          // Queue list
          Expanded(
            child: grouped.isEmpty
                ? const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      'No pending nurse tasks.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    itemCount: grouped.length,
                    itemBuilder: (_, i) {
                      final patient = grouped.keys.elementAt(i);
                      final taskList = grouped[patient]!;
                      final isActive = selected == patient;
                      final priority = taskList.isNotEmpty
                          ? taskList.first.priority
                          : null;
                      final activeCnt = taskList
                          .where((t) => t.status != 'DONE')
                          .length;
                      final doneCnt = taskList
                          .where((t) => t.status == 'DONE')
                          .length;
                      final pColor = AppColors.priorityColor(priority);

                      return GestureDetector(
                        onTap: () => _selectPatient(patient),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            gradient: isActive
                                ? const LinearGradient(
                                    colors: [
                                      AppColors.activeGradientStart,
                                      AppColors.activeGradientEnd,
                                    ],
                                  )
                                : null,
                            color: isActive ? null : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isActive
                                  ? AppColors.accentBlue
                                  : AppColors.borderCard,
                              width: isActive ? 2 : 1,
                            ),
                            boxShadow: isActive
                                ? [
                                    BoxShadow(
                                      color: AppColors.accentBlue.withValues(
                                        alpha: 0.15,
                                      ),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ]
                                : [
                                    BoxShadow(
                                      color: Colors.black.withValues(
                                        alpha: 0.05,
                                      ),
                                      blurRadius: 3,
                                      offset: const Offset(0, 1),
                                    ),
                                  ],
                          ),
                          child: Row(
                            children: [
                              // Priority dot
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: pColor,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      patient,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Text(
                                          '$activeCnt active',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Text(
                                          '$doneCnt done',
                                          style: const TextStyle(
                                            fontSize: 12,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              if (isActive)
                                const Icon(
                                  Icons.chevron_right,
                                  size: 20,
                                  color: AppColors.accentBlue,
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  // ── Right panel: Task detail ────────────────────────────────────
  Widget _buildDetail(String? selected, List<NurseTask> tasks, int? visitId) {
    if (selected == null) {
      return Container(
        color: AppColors.scaffoldBg,
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(40),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.borderLight,
                style: BorderStyle.solid,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 6,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Text(
              'Select a patient from your queue.',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ),
      );
    }

    return Container(
      color: AppColors.scaffoldBg,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // Back button (mobile only)
          if (MediaQuery.of(context).size.width <= 768)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Material(
                  color: AppColors.primaryIndigo,
                  borderRadius: BorderRadius.circular(6),
                  child: InkWell(
                    onTap: () => setState(() => _showQueue = true),
                    borderRadius: BorderRadius.circular(6),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.arrow_back, size: 16, color: Colors.white),
                          SizedBox(width: 6),
                          Text(
                            'Back to Queue',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),

          // Patient name heading
          Text(
            selected,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
            ),
          ),
          
          // Admission details
          if (tasks.isNotEmpty && tasks.first.isAdmitted)
            Container(
              margin: const EdgeInsets.only(top: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.activeGradientStart,
                border: Border.all(color: AppColors.accentBlue.withValues(alpha: 0.2)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('🏥', style: TextStyle(fontSize: 18)),
                      const SizedBox(width: 8),
                      const Text(
                        'Admission Details',
                        style: TextStyle(
                          color: AppColors.accentBlue,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('Ward: ${tasks.first.wardName ?? "—"}', style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text('Bed: ${tasks.first.bedNumber ?? "—"}', style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500)),
                  if (tasks.first.admissionNote != null && tasks.first.admissionNote!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Note: ${tasks.first.admissionNote}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, fontStyle: FontStyle.italic)),
                  ],
                ],
              ),
            ),
            
          const SizedBox(height: 20),

          // ─ Task list ─
          if (tasks.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: Text(
                'No tasks for this patient.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            )
          else
            ...tasks.asMap().entries.map((entry) {
              final idx = entry.key;
              final task = entry.value;
              return TweenAnimationBuilder<double>(
                key: ValueKey(task.id),
                tween: Tween(begin: 0, end: 1),
                duration: Duration(milliseconds: 400 + (idx * 80)),
                curve: Curves.easeOut,
                builder: (_, v, child) => Transform.translate(
                  offset: Offset(0, 10 * (1 - v)),
                  child: Opacity(opacity: v, child: child),
                ),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
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
                      // Info
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
                      // Buttons
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _GradientBtn(
                            label: 'Start',
                            enabled: task.status != 'IN_PROGRESS',
                            colors: const [
                              AppColors.buttonBlueStart,
                              AppColors.buttonBlueEnd,
                            ],
                            onTap: () => _updateStatus(task.id, 'IN_PROGRESS'),
                          ),
                          const SizedBox(height: 8),
                          _GradientBtn(
                            label: 'Complete',
                            enabled: task.status != 'DONE',
                            colors: const [
                              AppColors.buttonBlueStart,
                              AppColors.buttonBlueEnd,
                            ],
                            onTap: () => _updateStatus(task.id, 'DONE'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),

          // ─ Observation notes section ─
          const SizedBox(height: 24),
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
            controller: _notesCtrl,
            maxLines: 5,
            minLines: 4,
            onChanged: (_) => setState(() {}),
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
                borderSide: const BorderSide(
                  color: AppColors.accentBlue,
                  width: 2,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerRight,
            child: _GradientBtn(
              label: 'Commit to Doctor',
              enabled: _notesCtrl.text.trim().isNotEmpty && visitId != null,
              colors: const [
                AppColors.commitGreenStart,
                AppColors.commitGreenEnd,
              ],
              onTap: () => _commitNotes(visitId!),
              wide: false,
            ),
          ),

          // ─ Record vitals button ─
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: _GradientBtn(
              label: '+ Record vitals',
              enabled: visitId != null,
              colors: const [
                AppColors.vitalsBlueStart,
                AppColors.vitalsBlueEnd,
              ],
              onTap: () => _openVitalsModal(visitId!),
              wide: true,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Gradient action button — used for Start, Complete, Commit, Vitals
// ═══════════════════════════════════════════════════════════════════
class _GradientBtn extends StatelessWidget {
  final String label;
  final bool enabled;
  final List<Color> colors;
  final VoidCallback onTap;
  final bool wide;
  final double fontSize;
  final FontWeight fontWeight;

  const _GradientBtn({
    required this.label,
    required this.enabled,
    required this.colors,
    required this.onTap,
    this.wide = false,
    this.fontSize = 13,
    this.fontWeight = FontWeight.w600,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: wide ? double.infinity : null,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: enabled
              ? LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: colors,
                )
              : null,
          color: enabled ? null : AppColors.disabledBg,
          borderRadius: BorderRadius.circular(8),
          boxShadow: enabled
              ? [
                  BoxShadow(
                    color: colors.first.withValues(alpha: 0.2),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: enabled ? onTap : null,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: wide ? 16 : 18,
                vertical: wide ? 14 : 10,
              ),
              child: Center(
                child: Text(
                  label,
                  style: TextStyle(
                    color: enabled ? Colors.white : AppColors.disabledText,
                    fontSize: fontSize,
                    fontWeight: fontWeight,
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
