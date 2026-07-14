import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_service.dart';
import '../models/user.dart';

/// Handles login / logout and persists JWT tokens + user data.
/// Mirrors the web Login.jsx + axios interceptor pattern.
class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _loading = false;
  String? _error;

  User? get user => _user;
  bool get loading => _loading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;

  /// Attempt to restore a session from SharedPreferences.
  Future<bool> tryRestoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access');
    final raw = prefs.getString('hpms_user');
    if (token != null && token.isNotEmpty && raw != null) {
      try {
        final json = jsonDecode(raw) as Map<String, dynamic>;
        final u = User.fromJson(json);
        if (u.role.toLowerCase() != 'nurse') return false;
        _user = u;
        notifyListeners();
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  }

  /// POST /api/login/  — same endpoint as the web app.
  Future<bool> login(String username, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();

    final user = username.trim();
    final pass = password;

    if (user.isEmpty || pass.isEmpty) {
      _error = 'Enter both Staff ID and password.';
      _loading = false;
      notifyListeners();
      return false;
    }

    try {
      final res = await ApiService.instance.post('login/', data: {
        'username': user,
        'password': pass,
      });

      final data = res.data as Map<String, dynamic>;
      final prefs = await SharedPreferences.getInstance();

      await prefs.setString('access', data['access'] as String);
      await prefs.setString('refresh', data['refresh'] as String);

      final userData = data['user'] as Map<String, dynamic>;
      await prefs.setString('hpms_user', jsonEncode(userData));

      final u = User.fromJson(userData);

      // Role gate — only nurses allowed
      if (u.role.toLowerCase() != 'nurse') {
        _error = 'This app is for nurses only. Your role: ${u.role}';
        _loading = false;
        notifyListeners();
        return false;
      }

      _user = u;
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _loading = false;
      // Extract the most useful error message (mirrors web error extraction)
      String msg = 'Invalid credentials. Check username and password.';
      if (e is DioException) {
        final data = e.response?.data;
        if (data is String && data.isNotEmpty) {
          msg = data;
        } else if (data is Map) {
          msg = (data['error'] ?? data['detail'] ?? msg) as String;
        } else if (e.type == DioExceptionType.connectionError ||
            e.type == DioExceptionType.connectionTimeout) {
          msg = 'Cannot reach the server. Is the backend running on port 8000?';
        }
      }
      _error = msg;
      notifyListeners();
      return false;
    }
  }

  /// Clear tokens and user data.
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access');
    await prefs.remove('refresh');
    await prefs.remove('hpms_user');
    _user = null;
    _error = null;
    notifyListeners();
  }
}


