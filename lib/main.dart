import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import 'features/auth/data/auth_service.dart';
import 'features/splash/presentation/splash_screen.dart';
import 'core/notifications/push_notification_service.dart';
import 'core/navigation/app_navigator.dart';
import 'core/navigation/app_shell.dart';
import 'features/auth/presentation/login_screen.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 👇 KEEP native splash visible
  await Future.delayed(const Duration(milliseconds: 800));

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  await PushNotificationService.init();

  runApp(const ProviderScope(child: CuphyApp()));
}

class CuphyApp extends StatelessWidget {
  const CuphyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: appNavigatorKey,
      title: 'CUPHY',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.light,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF6F6FB),
        textTheme: GoogleFonts.interTextTheme(),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6C3BFF),
          brightness: Brightness.light,
        ),
      ),
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final AuthService _authService = AuthService();

  bool _hasShownStartupSplash = false;
  bool _forceLogoutInProgress = false;

  Stream<DocumentSnapshot<Map<String, dynamic>>> _userDocStream(User user) {
    return FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .snapshots();
  }

  Future<void> _forceLogout() async {
    if (_forceLogoutInProgress) return;
    _forceLogoutInProgress = true;

    await _authService.forceLogoutLocalOnly();

    if (!mounted) return;

    _hasShownStartupSplash = false;
    _forceLogoutInProgress = false;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('This account was logged in on another device.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _loader() {
    return const Scaffold(
      backgroundColor: Color(0xFFF6F6FB),
      body: Center(child: CircularProgressIndicator()),
    );
  }

  Widget _loggedInApp() {
    if (!_hasShownStartupSplash) {
      _hasShownStartupSplash = true;

      return const SplashScreen(nextScreen: AppShell(key: ValueKey('app')));
    }

    return const AppShell(key: ValueKey('app'));
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, authSnapshot) {
        if (authSnapshot.connectionState == ConnectionState.waiting) {
          return _loader();
        }

        final firebaseUser = authSnapshot.data;

        if (firebaseUser == null) {
          _hasShownStartupSplash = false;
          return const LoginScreen(key: ValueKey('login'));
        }

        return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
          stream: _userDocStream(firebaseUser),
          builder: (context, userDocSnapshot) {
            if (!userDocSnapshot.hasData) {
              return _loader();
            }

            return FutureBuilder<String>(
              future: _authService.getLocalAppSessionId(),
              builder: (context, localSnapshot) {
                if (!localSnapshot.hasData) {
                  return _loader();
                }

                final localSessionId = localSnapshot.data ?? '';
                final data = userDocSnapshot.data?.data();
                final serverSessionId = (data?['activeAppSessionId'] ?? '')
                    .toString();

                if (localSessionId.isEmpty || serverSessionId.isEmpty) {
                  return _loader();
                }

                if (serverSessionId != localSessionId) {
                  Future.microtask(_forceLogout);
                  return _loader();
                }

                return _loggedInApp();
              },
            );
          },
        );
      },
    );
  }
}
