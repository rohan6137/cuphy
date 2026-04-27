// FULL REPLACEMENT: lib/features/auth/data/auth_service.dart
import 'dart:async';
import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthService {
  AuthService();

  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  static const _storage = FlutterSecureStorage();
  static const _appSessionKey = 'cuphy_app_session_id';
  static const _internalEmailDomain = 'cuphy-user.local';

  String? _verificationId;

  String _normalizePhone(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return '';
    if (digits.startsWith('91') && digits.length >= 12) return '+$digits';
    if (digits.length == 10) return '+91$digits';
    if (raw.trim().startsWith('+')) return '+$digits';
    return '+$digits';
  }

  String _normalizeEmail(String email) => email.trim().toLowerCase();

  String _internalEmailFromPhone(String phone) {
    final normalized = _normalizePhone(phone);
    final digits = normalized.replaceAll(RegExp(r'\D'), '');
    return '$digits@$_internalEmailDomain';
  }

  bool _isInternalGeneratedEmail(String email) {
    return email.trim().toLowerCase().endsWith('@$_internalEmailDomain');
  }

  String _generateSessionId() {
    final random = Random.secure().nextInt(999999999);
    return '${DateTime.now().millisecondsSinceEpoch}_$random';
  }

  Future<String> getLocalAppSessionId() async {
    return await _storage.read(key: _appSessionKey) ?? '';
  }

  Future<void> _saveLocalAppSessionId(String sessionId) async {
    await _storage.write(key: _appSessionKey, value: sessionId);
  }

  Future<void> _clearLocalAppSessionId() async {
    await _storage.delete(key: _appSessionKey);
  }

  Future<void> attachAppSession() async {
    final user = _auth.currentUser;
    if (user == null) return;

    final sessionId = _generateSessionId();
    await _saveLocalAppSessionId(sessionId);

    await _firestore.collection('users').doc(user.uid).set({
      'activeAppSessionId': sessionId,
      'lastAppLoginAt': FieldValue.serverTimestamp(),
      'lastLoginAt': FieldValue.serverTimestamp(),
      'lastPlatform': 'app',
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  Future<bool> isCurrentAppSessionValid() async {
    final user = _auth.currentUser;
    if (user == null) return false;

    final localSessionId = await getLocalAppSessionId();
    if (localSessionId.isEmpty) return false;

    final snap = await _firestore.collection('users').doc(user.uid).get();
    final data = snap.data();
    if (data == null) return false;

    final serverSessionId = (data['activeAppSessionId'] ?? '').toString();
    return serverSessionId.isNotEmpty && serverSessionId == localSessionId;
  }

  Future<void> clearAppSessionIfCurrent() async {
    final user = _auth.currentUser;
    final localSessionId = await getLocalAppSessionId();

    if (user != null && localSessionId.isNotEmpty) {
      final userRef = _firestore.collection('users').doc(user.uid);
      final snap = await userRef.get();
      final data = snap.data();

      final serverSessionId = (data?['activeAppSessionId'] ?? '').toString();

      if (serverSessionId == localSessionId) {
        await userRef.set({
          'activeAppSessionId': '',
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      }
    }

    await _clearLocalAppSessionId();
  }

  Future<void> forceLogoutLocalOnly() async {
    await _clearLocalAppSessionId();
    await _auth.signOut();
  }

  Future<Map<String, dynamic>?> _findUserByPhone(String phone) async {
    final normalized = _normalizePhone(phone);

    final query = await _firestore
        .collection('users')
        .where('phone', isEqualTo: normalized)
        .limit(1)
        .get();

    if (query.docs.isEmpty) return null;
    return query.docs.first.data();
  }

  Future<Map<String, dynamic>?> _findUserByEmail(String email) async {
    final normalized = _normalizeEmail(email);

    final query = await _firestore
        .collection('users')
        .where('email', isEqualTo: normalized)
        .limit(1)
        .get();

    if (query.docs.isEmpty) return null;
    return query.docs.first.data();
  }

  Future<String> _resolvePhoneFromIdentifier(String identifier) async {
    final raw = identifier.trim();

    if (raw.contains('@')) {
      final found = await _findUserByEmail(raw);
      if (found == null) {
        throw Exception(
          'Account not found. Please check your mobile number or email.',
        );
      }

      final phone = (found['phone'] ?? '').toString();
      if (phone.isEmpty) {
        throw Exception('No linked phone number found for this account.');
      }

      return _normalizePhone(phone);
    }

    final phone = _normalizePhone(raw);
    if (phone.isEmpty) {
      throw Exception('Enter a valid mobile number.');
    }

    return phone;
  }

  Future<UserCredential> login({
    required String identifier,
    required String password,
  }) async {
    final raw = identifier.trim();

    if (raw.isEmpty) {
      throw Exception('Enter mobile/email and password');
    }

    if (raw.contains('@')) {
      final found = await _findUserByEmail(raw);
      if (found == null) {
        throw Exception('No account found with this email address.');
      }

      if (found['isActive'] == false) {
        throw Exception('Your account is inactive. Please contact admin.');
      }

      final linkedPhone = _normalizePhone((found['phone'] ?? '').toString());
      if (linkedPhone.isEmpty) {
        throw Exception('No linked phone number found for this account.');
      }

      final internalEmail = _internalEmailFromPhone(linkedPhone);

      final credential = await _auth.signInWithEmailAndPassword(
        email: internalEmail,
        password: password,
      );

      await attachAppSession();
      return credential;
    }

    final normalizedPhone = _normalizePhone(raw);
    final internalEmail = _internalEmailFromPhone(normalizedPhone);

    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: internalEmail,
        password: password,
      );

      final found = await _findUserByPhone(normalizedPhone);
      if (found == null) {
        await _auth.signOut();
        throw Exception('Account not found. Register first.');
      }

      if (found['isActive'] == false) {
        await _auth.signOut();
        throw Exception('Your account is inactive. Please contact admin.');
      }

      await attachAppSession();
      return credential;
    } catch (error) {
      final found = await _findUserByPhone(normalizedPhone);

      final fallbackEmail = (found?['email'] ?? '')
          .toString()
          .trim()
          .toLowerCase();

      if (fallbackEmail.isNotEmpty &&
          !_isInternalGeneratedEmail(fallbackEmail)) {
        final credential = await _auth.signInWithEmailAndPassword(
          email: fallbackEmail,
          password: password,
        );

        await attachAppSession();
        return credential;
      }

      rethrow;
    }
  }

  Future<void> sendOtp({
    required String identifier,
    bool forSignup = false,
    String? signupEmail,
  }) async {
    final cleanIdentifier = identifier.trim();

    final phoneNumber = cleanIdentifier.contains('@')
        ? await _resolvePhoneFromIdentifier(cleanIdentifier)
        : _normalizePhone(cleanIdentifier);

    if (phoneNumber.isEmpty) {
      throw Exception('Enter a valid mobile number.');
    }

    final found = await _findUserByPhone(phoneNumber);

    if (forSignup && found != null) {
      throw Exception('This mobile number is already registered.');
    }

    if (forSignup && signupEmail != null && signupEmail.trim().isNotEmpty) {
      final existingEmailUser = await _findUserByEmail(signupEmail.trim());

      if (existingEmailUser != null) {
        throw Exception('This email is already linked with another account.');
      }
    }

    if (!forSignup && found == null) {
      throw Exception('Account not found. Register first.');
    }

    if (!forSignup && found?['isActive'] == false) {
      throw Exception('Your account is inactive. Please contact admin.');
    }

    final completer = Completer<void>();

    await _auth.verifyPhoneNumber(
      phoneNumber: phoneNumber,
      verificationCompleted: (PhoneAuthCredential credential) async {
        await _auth.signInWithCredential(credential);
        if (!completer.isCompleted) completer.complete();
      },
      verificationFailed: (FirebaseAuthException e) {
        if (!completer.isCompleted) {
          completer.completeError(
            Exception(e.message ?? 'OTP verification failed'),
          );
        }
      },
      codeSent: (String verificationId, int? resendToken) {
        _verificationId = verificationId;
        if (!completer.isCompleted) completer.complete();
      },
      codeAutoRetrievalTimeout: (String verificationId) {
        _verificationId = verificationId;
      },
      timeout: const Duration(seconds: 60),
    );

    return completer.future;
  }

  Future<void> verifyOtp({required String otp}) async {
    if (_verificationId == null || _verificationId!.isEmpty) {
      throw Exception('OTP not requested');
    }

    final credential = PhoneAuthProvider.credential(
      verificationId: _verificationId!,
      smsCode: otp.trim(),
    );

    await _auth.signInWithCredential(credential);
    await attachAppSession();

    await Future.delayed(const Duration(milliseconds: 500));
  }

  Future<void> createUserAfterOtp({
    required String name,
    required String phone,
    required String password,
    String? email,
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw Exception('OTP not verified');
    }

    final normalizedPhone = _normalizePhone(phone);
    final internalEmail = _internalEmailFromPhone(normalizedPhone);
    final optionalEmail = email == null ? '' : _normalizeEmail(email);

    final existingByPhone = await _findUserByPhone(normalizedPhone);
    if (existingByPhone != null) {
      throw Exception('This mobile number is already registered.');
    }

    final providers = user.providerData.map((e) => e.providerId).toSet();

    if (!providers.contains('password')) {
      final credential = EmailAuthProvider.credential(
        email: internalEmail,
        password: password,
      );

      await user.linkWithCredential(credential);
    }

    await user.updateDisplayName(name.trim());

    await _firestore.collection('users').doc(user.uid).set({
      'uid': user.uid,
      'fullName': name.trim(),
      'email': optionalEmail,
      'phone': normalizedPhone,
      'role': 'student',
      'isAdmin': false,
      'isActive': true,
      'profilePicture': '',
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
      'lastLoginAt': FieldValue.serverTimestamp(),
      'lastPlatform': 'app',
    }, SetOptions(merge: true));
  }

  Future<void> logout() async {
    try {
      await clearAppSessionIfCurrent();
    } catch (_) {
      // Logout must continue even if Firestore session clear fails.
    } finally {
      await _clearLocalAppSessionId();
      await _auth.signOut();
    }
  }

  User? get currentUser => _auth.currentUser;
}
