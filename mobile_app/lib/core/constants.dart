import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// All design tokens extracted from the web Nurse page CSS.
/// Keeps every color, spacing & font reference in one place.
class AppColors {
  AppColors._();

  // ── Primary (TopNav, brand) ──────────────────────────
  static const Color primaryIndigo = Color(0xFF1A237E);
  static const Color primaryIndigoLight = Color(0xFF3949AB);
  static const Color accentBlue = Color(0xFF3B82F6);

  // ── Backgrounds ──────────────────────────────────────
  static const Color scaffoldBg = Color(0xFFF8FAFC);
  static const Color cardBg = Colors.white;
  static const Color sidebarBg = Colors.white;
  static const Color modalHeaderBg = Color(0xFFFAFAFA);

  // ── Text ─────────────────────────────────────────────
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);
  static const Color textDark = Color(0xFF1F2937);
  static const Color textSlate = Color(0xFF334155);

  // ── Borders ──────────────────────────────────────────
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderLight = Color(0xFFCBD5E1);
  static const Color borderCard = Color(0xFFE2E8F0);

  // ── Priority bars ────────────────────────────────────
  static const Color priorityLow = Color(0xFF2E7D32);
  static const Color priorityMedium = Color(0xFFF9A825);
  static const Color priorityUrgent = Color(0xFFEF6C00);
  static const Color priorityCritical = Color(0xFFC62828);

  // ── Buttons ──────────────────────────────────────────
  static const Color buttonBlueStart = Color(0xFF2563EB);
  static const Color buttonBlueEnd = Color(0xFF1D4ED8);
  static const Color commitGreenStart = Color(0xFF10B981);
  static const Color commitGreenEnd = Color(0xFF059669);
  static const Color vitalsBlueStart = Color(0xFF1565C0);
  static const Color vitalsBlueEnd = Color(0xFF0D47A1);
  static const Color saveGreen = Color(0xFF2E7D32);
  static const Color disabledBg = Color(0xFFCBD5E1);
  static const Color disabledText = Color(0xFF64748B);

  // ── Queue card active ────────────────────────────────
  static const Color activeGradientStart = Color(0xFFEFF6FF);
  static const Color activeGradientEnd = Colors.white;

  // ── Toast ────────────────────────────────────────────
  static const Color toastSuccess = Color(0xFF2E7D32);

  // ── Misc ─────────────────────────────────────────────
  static const Color error = Color(0xFFC62828);
  static const Color avatarBg = Color(0x2EFFFFFF); // rgba(255,255,255,0.18)
  static const Color backdropColor = Color(0x990F172A); // rgba(15,23,42,0.6)

  /// Returns the left‑bar colour for a given priority string.
  static Color priorityColor(String? priority) {
    switch (priority) {
      case 'LOW':
        return priorityLow;
      case 'MEDIUM':
        return priorityMedium;
      case 'URGENT':
        return priorityUrgent;
      case 'CRITICAL':
        return priorityCritical;
      default:
        return const Color(0xFF9E9E9E);
    }
  }
}

class AppSpacing {
  AppSpacing._();
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;
}

class ApiConfig {
  ApiConfig._();

  /// For Android emulator → host machine localhost.
  /// For Web → use localhost directly.
  /// Change to your LAN IP for physical devices (e.g. '192.168.x.x').
  static const String baseUrl = kIsWeb ? 'http://localhost:8000/api/' : 'http://10.0.2.2:8000/api/';
  static const String tokenRefreshUrl = kIsWeb ? 'http://localhost:8000/api/token/refresh/' : 'http://10.0.2.2:8000/api/token/refresh/';
}
