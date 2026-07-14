import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'constants.dart';

/// Global navigator key used for auth‑related redirects (e.g. token expiry).
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

/// Singleton HTTP client mirroring the web axios.js interceptor logic.
class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();

  late final Dio dio;
  bool _initialised = false;

  Future<void> init() async {
    if (_initialised) return;
    _initialised = true;

    debugPrint('[ApiService] Initializing with baseUrl: ${ApiConfig.baseUrl}');

    dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    // ── Request interceptor: attach Bearer token ───────
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('access');
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        debugPrint('[API] ${options.method} ${options.uri}');
        handler.next(options);
      },

      onResponse: (response, handler) {
        debugPrint('[API] ✓ ${response.statusCode} ${response.requestOptions.uri}');
        handler.next(response);
      },

      // ── Error interceptor: auto‑refresh on 401 ────
      onError: (error, handler) async {
        debugPrint('[API] ✗ ${error.response?.statusCode} ${error.requestOptions.uri} – ${error.message}');

        if (error.response?.statusCode == 401 &&
            error.response?.data is Map &&
            (error.response?.data as Map)['code'] == 'token_not_valid' &&
            error.requestOptions.extra['_retry'] != true) {
          error.requestOptions.extra['_retry'] = true;

          final prefs = await SharedPreferences.getInstance();
          final refreshToken = prefs.getString('refresh');

          if (refreshToken == null || refreshToken.isEmpty) {
            await _clearAndRedirect(prefs);
            return handler.reject(error);
          }

          try {
            final refreshDio = Dio();
            final res = await refreshDio.post(
              ApiConfig.tokenRefreshUrl,
              data: {'refresh': refreshToken},
            );
            final newAccess = res.data['access'] as String;
            await prefs.setString('access', newAccess);
            debugPrint('[API] Token refreshed successfully');

            // Retry original request with new token
            final opts = error.requestOptions;
            opts.headers['Authorization'] = 'Bearer $newAccess';
            final retryRes = await dio.fetch(opts);
            return handler.resolve(retryRes);
          } catch (refreshErr) {
            debugPrint('[API] Token refresh failed: $refreshErr');
            await _clearAndRedirect(prefs);
            return handler.reject(error);
          }
        }
        handler.next(error);
      },
    ));
  }

  Future<void> _clearAndRedirect(SharedPreferences prefs) async {
    await prefs.remove('access');
    await prefs.remove('refresh');
    await prefs.remove('hpms_user');
    navigatorKey.currentState?.pushNamedAndRemoveUntil('/login', (_) => false);
  }

  // ── Convenience helpers ──────────────────────────────
  Future<Response> get(String path, {Map<String, dynamic>? queryParams}) =>
      dio.get(path, queryParameters: queryParams);

  Future<Response> post(String path, {dynamic data}) =>
      dio.post(path, data: data);

  Future<Response> patch(String path, {dynamic data}) =>
      dio.patch(path, data: data);
}
