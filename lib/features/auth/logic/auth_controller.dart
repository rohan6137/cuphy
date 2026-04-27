import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../data/auth_service.dart';

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});

final authLoadingProvider = StateProvider<bool>((ref) => false);

final authErrorProvider = StateProvider<String?>((ref) => null);

final mustSetPasswordProvider = StateProvider<bool>((ref) => false);

class AuthController {
  AuthController(this.ref);

  final Ref ref;

  AuthService get _authService => ref.read(authServiceProvider);

  void _setLoading(bool value) {
    ref.read(authLoadingProvider.notifier).state = value;
  }

  void _setError(String? value) {
    ref.read(authErrorProvider.notifier).state = value;
  }

  Future<bool> login({
    required String identifier,
    required String password,
  }) async {
    try {
      _setLoading(true);
      _setError(null);
      ref.read(mustSetPasswordProvider.notifier).state = false;

      await _authService.login(
        identifier: identifier.trim(),
        password: password.trim(),
      );

      return true;
    } on FirebaseAuthException catch (e) {
      _setError(_mapFirebaseAuthError(e));
      return false;
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> sendOtp({
    required String identifier,
    bool forSignup = false,
    String? signupEmail,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      await _authService.sendOtp(
        identifier: identifier.trim(),
        forSignup: forSignup,
        signupEmail: signupEmail,
      );
      return true;
    } on FirebaseAuthException catch (e) {
      _setError(_mapFirebaseAuthError(e));
      return false;
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> completeSignupWithOtp({
    required String name,
    required String phone,
    required String password,
    String? email,
    required String otp,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      await _authService.verifyOtp(otp: otp.trim());

      await _authService.createUserAfterOtp(
        name: name.trim(),
        phone: phone.trim(),
        password: password.trim(),
        email: email == null || email.trim().isEmpty ? null : email.trim(),
      );

      ref.read(mustSetPasswordProvider.notifier).state = false;

      return true;
    } on FirebaseAuthException catch (e) {
      _setError(_mapFirebaseAuthError(e));
      return false;
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> verifyOtpOnly({required String otp}) async {
    try {
      _setLoading(true);
      _setError(null);

      await _authService.verifyOtp(otp: otp.trim());
      ref.read(mustSetPasswordProvider.notifier).state = true;

      return true;
    } on FirebaseAuthException catch (e) {
      _setError(_mapFirebaseAuthError(e));
      return false;
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> logout() async {
    try {
      _setLoading(true);
      _setError(null);
      ref.read(mustSetPasswordProvider.notifier).state = false;
      await _authService.logout();
    } on FirebaseAuthException catch (e) {
      _setError(_mapFirebaseAuthError(e));
    } catch (e) {
      _setError(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      _setLoading(false);
    }
  }

  String _mapFirebaseAuthError(FirebaseAuthException e) {
    switch (e.code) {
      case 'invalid-email':
        return 'Invalid email address.';
      case 'user-not-found':
        return 'User not found.';
      case 'wrong-password':
      case 'invalid-credential':
        return 'Incorrect credentials.';
      case 'email-already-in-use':
        return 'This email is already in use.';
      case 'weak-password':
        return 'Password is too weak.';
      case 'too-many-requests':
        return 'Too many attempts. Try again later.';
      case 'invalid-verification-code':
        return 'Invalid OTP.';
      case 'session-expired':
        return 'OTP expired. Please request a new one.';
      default:
        return e.message ?? 'Authentication failed.';
    }
  }
}

final authControllerProvider = Provider<AuthController>((ref) {
  return AuthController(ref);
});
