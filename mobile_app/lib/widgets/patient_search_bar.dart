import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants.dart';
import '../providers/nurse_provider.dart';

/// Patient search bar matching NavPatientSearch.jsx.
/// Debounced search (260ms), dropdown overlay, "patient does not exist" state.
class PatientSearchBar extends StatefulWidget {
  final void Function(Map<String, dynamic> patient)? onSelect;

  const PatientSearchBar({super.key, this.onSelect});

  @override
  State<PatientSearchBar> createState() => _PatientSearchBarState();
}

class _PatientSearchBarState extends State<PatientSearchBar> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final _layerLink = LayerLink();

  Timer? _debounce;
  List<Map<String, dynamic>> _results = [];
  bool _loading = false;
  bool _showEmpty = false;
  OverlayEntry? _overlay;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onQueryChanged);
    _focusNode.addListener(_onFocusChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _removeOverlay();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onQueryChanged() {
    _debounce?.cancel();
    final q = _controller.text.trim();
    if (q.isEmpty) {
      setState(() {
        _results = [];
        _showEmpty = false;
      });
      _removeOverlay();
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 260), () => _doSearch(q));
  }

  void _onFocusChanged() {
    if (_focusNode.hasFocus) {
      if (_results.isNotEmpty || _showEmpty) _showOverlay();
    } else {
      _removeOverlay();
    }
  }

  Future<void> _doSearch(String q) async {
    setState(() => _loading = true);
    final provider = context.read<NurseProvider>();
    final list = await provider.searchPatients(q);
    if (!mounted) return;
    setState(() {
      _results = list;
      _showEmpty = list.isEmpty;
      _loading = false;
    });
    if (list.isNotEmpty || _showEmpty) {
      _showOverlay();
    } else {
      _removeOverlay();
    }
  }

  void _showOverlay() {
    _removeOverlay();
    final overlay = OverlayEntry(builder: (_) => _buildDropdown());
    _overlay = overlay;
    Overlay.of(context).insert(overlay);
  }

  void _removeOverlay() {
    _overlay?.remove();
    _overlay = null;
  }

  void _pick(Map<String, dynamic> patient) {
    _controller.clear();
    _results = [];
    _showEmpty = false;
    _removeOverlay();
    widget.onSelect?.call(patient);
  }

  String _patientLabel(Map<String, dynamic> p) {
    final dn = (p['display_name'] as String? ?? '').trim();
    if (dn.isNotEmpty) return dn;
    final first = (p['first_name'] as String? ?? '').trim();
    final last = (p['last_name'] as String? ?? '').trim();
    final name = '$first $last'.trim();
    if (name.isNotEmpty) return name;
    return p['hospital_id'] as String? ?? 'Patient';
  }

  Widget _buildDropdown() {
    final renderBox = context.findRenderObject() as RenderBox?;
    final width = renderBox?.size.width ?? 300;

    return Positioned(
      width: width,
      child: CompositedTransformFollower(
        link: _layerLink,
        offset: const Offset(0, 46),
        showWhenUnlinked: false,
        child: Material(
          elevation: 8,
          borderRadius: BorderRadius.circular(8),
          color: Colors.white,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 240),
            child: _showEmpty && !_loading
                ? const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Text(
                      'the patient does not exist',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  )
                : ListView.builder(
                    shrinkWrap: true,
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    itemCount: _results.length,
                    itemBuilder: (_, i) {
                      final p = _results[i];
                      return InkWell(
                        onTap: () => _pick(p),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _patientLabel(p),
                                style: const TextStyle(
                                  color: AppColors.primaryIndigo,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                              if (p['hospital_id'] != null)
                                Text(
                                  p['hospital_id'] as String,
                                  style: TextStyle(
                                    color: AppColors.primaryIndigoLight,
                                    fontSize: 12,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      child: SizedBox(
        height: 40,
        child: TextField(
          controller: _controller,
          focusNode: _focusNode,
          style: const TextStyle(color: Colors.white, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'search patient',
            hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.72)),
            filled: true,
            fillColor: Colors.white.withValues(alpha: 0.14),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.35)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.35)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.55)),
            ),
            isDense: true,
            prefixIcon: Icon(Icons.search, color: Colors.white.withValues(alpha: 0.72), size: 18),
          ),
        ),
      ),
    );
  }
}
