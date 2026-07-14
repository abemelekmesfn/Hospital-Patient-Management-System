import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/api_service.dart';
import 'core/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/nurse_provider.dart';
import 'screens/login_screen.dart';
import 'screens/nurse_home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.instance.init();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => NurseProvider()),
      ],
      child: const HpmsNurseApp(),
    ),
  );
}

class HpmsNurseApp extends StatefulWidget {
  const HpmsNurseApp({super.key});

  @override
  State<HpmsNurseApp> createState() => _HpmsNurseAppState();
}

class _HpmsNurseAppState extends State<HpmsNurseApp> {
  bool _initialized = false;
  bool _loggedIn = false;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final auth = context.read<AuthProvider>();
    final success = await auth.tryRestoreSession();
    if (mounted) {
      setState(() {
        _loggedIn = success;
        _initialized = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const MaterialApp(
        home: Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      );
    }

    return MaterialApp(
      title: 'HPMS Nurse Mobile',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      navigatorKey: navigatorKey,
      initialRoute: _loggedIn ? '/nurse' : '/login',
      routes: {
        '/login': (_) => const LoginScreen(),
        '/nurse': (_) => const NurseHomeScreen(),
      },
    );
  }
}
