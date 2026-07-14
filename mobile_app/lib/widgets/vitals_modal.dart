import 'package:flutter/material.dart';
import '../core/constants.dart';
import '../models/vitals.dart';

/// Vitals modal matching nurse-vitals-modal CSS.
/// Glassmorphic backdrop, pop-in animation, four vital fields,
/// Cancel / Save only / Save & Commit actions.
class VitalsModal extends StatefulWidget {
  final int visitId;
  final Vitals initialVitals;
  final Future<void> Function(int visitId, Map<String, dynamic> body) onSave;
  final Future<void> Function(int visitId) onCommit;

  const VitalsModal({
    super.key,
    required this.visitId,
    required this.initialVitals,
    required this.onSave,
    required this.onCommit,
  });

  @override
  State<VitalsModal> createState() => _VitalsModalState();
}

class _VitalsModalState extends State<VitalsModal> with SingleTickerProviderStateMixin {
  late final TextEditingController _pulseCtrl;
  late final TextEditingController _bpCtrl;
  late final TextEditingController _tempCtrl;
  late final TextEditingController _rrCtrl;
  bool _busy = false;

  late AnimationController _animCtrl;
  late Animation<double> _scaleAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = TextEditingController(text: widget.initialVitals.pulse);
    _bpCtrl = TextEditingController(text: widget.initialVitals.bloodPressure);
    _tempCtrl = TextEditingController(text: widget.initialVitals.temperature);
    _rrCtrl = TextEditingController(text: widget.initialVitals.respiratoryRate);

    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _scaleAnim = Tween(begin: 0.95, end: 1.0).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeOutCubic),
    );
    _fadeAnim = Tween(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut),
    );
    _animCtrl.forward();
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _bpCtrl.dispose();
    _tempCtrl.dispose();
    _rrCtrl.dispose();
    _animCtrl.dispose();
    super.dispose();
  }

  Map<String, dynamic> _buildBody() {
    final body = <String, dynamic>{};
    if (_pulseCtrl.text.trim().isNotEmpty) body['pulse'] = _pulseCtrl.text.trim();
    if (_bpCtrl.text.trim().isNotEmpty) body['blood_pressure'] = _bpCtrl.text.trim();
    if (_tempCtrl.text.trim().isNotEmpty) body['temperature'] = _tempCtrl.text.trim();
    if (_rrCtrl.text.trim().isNotEmpty) body['respiratory_rate'] = _rrCtrl.text.trim();
    return body;
  }

  Future<void> _handleSave() async {
    final body = _buildBody();
    if (body.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter at least one vital to save.')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      await widget.onSave(widget.visitId, body);
      if (mounted) Navigator.of(context).pop('saved');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not save vitals. $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _handleCommit() async {
    // First save, then commit
    final body = _buildBody();
    setState(() => _busy = true);
    try {
      if (body.isNotEmpty) {
        await widget.onSave(widget.visitId, body);
      }
      await widget.onCommit(widget.visitId);
      if (mounted) Navigator.of(context).pop('committed');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to commit vitals. $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnim,
      child: ScaleTransition(
        scale: _scaleAnim,
        child: Dialog(
          insetPadding: const EdgeInsets.all(24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 25,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.95),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  decoration: const BoxDecoration(
                    color: AppColors.modalHeaderBg,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                    border: Border(bottom: BorderSide(color: Color(0xFFE5E7EB))),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Record vitals',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryIndigo,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Color(0xFF424242)),
                        onPressed: _busy ? null : () => Navigator.of(context).pop(),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),

                // Body — vital fields
                Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    children: [
                      _VitalField(label: 'Pulse (bpm)', controller: _pulseCtrl, keyboardType: TextInputType.number),
                      const SizedBox(height: 12),
                      _VitalField(label: 'Blood pressure', controller: _bpCtrl, hint: '120/80'),
                      const SizedBox(height: 12),
                      _VitalField(label: 'Temperature (°C)', controller: _tempCtrl, keyboardType: const TextInputType.numberWithOptions(decimal: true)),
                      const SizedBox(height: 12),
                      _VitalField(label: 'Respiratory rate', controller: _rrCtrl, keyboardType: TextInputType.number),
                    ],
                  ),
                ),

                // Actions
                Container(
                  padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
                  decoration: const BoxDecoration(
                    color: AppColors.modalHeaderBg,
                    border: Border(top: BorderSide(color: Color(0xFFEEEEEE))),
                    borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      // Cancel
                      OutlinedButton(
                        onPressed: _busy ? null : () => Navigator.of(context).pop(),
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          side: const BorderSide(color: Color(0xFFCCCCCC)),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        ),
                        child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(width: 10),
                      // Save only
                      ElevatedButton(
                        onPressed: _busy ? null : _handleSave,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.saveGreen,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        ),
                        child: Text(_busy ? 'Saving…' : 'Save only',
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(width: 10),
                      // Save & Commit
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: !_busy
                              ? const LinearGradient(
                                  colors: [AppColors.commitGreenStart, AppColors.commitGreenEnd],
                                )
                              : null,
                          color: _busy ? AppColors.disabledBg : null,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: !_busy
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
                            onTap: _busy ? null : _handleCommit,
                            borderRadius: BorderRadius.circular(8),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              child: Text(
                                _busy ? 'Committing...' : 'Save & Commit',
                                style: TextStyle(
                                  color: _busy ? AppColors.disabledText : Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _VitalField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final String? hint;

  const _VitalField({
    required this.label,
    required this.controller,
    this.keyboardType,
    this.hint,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 4),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            hintText: hint,
            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFFCCCCCC)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFFCCCCCC)),
            ),
          ),
          style: const TextStyle(fontSize: 14),
        ),
      ],
    );
  }
}
