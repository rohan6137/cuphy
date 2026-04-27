import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../features/subjects/presentation/batch_subjects_screen.dart';
import '../../features/lectures/presentation/lecture_player_screen.dart';
import '../../features/subjects/presentation/subject_detail_screen.dart';
import '../../features/support/presentation/help_support_screen.dart';
import '../../features/tests/presentation/test_taker_screen.dart';
import '../navigation/app_navigator.dart';

class PushNotificationService {
  static final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  static Future<void> init() async {
    await _fcm.requestPermission(alert: true, badge: true, sound: true);

    final token = await _fcm.getToken();
    debugPrint('FCM TOKEN: $token');

    await _saveToken(token);

    _fcm.onTokenRefresh.listen(_saveToken);

    FirebaseMessaging.onMessage.listen((message) {
      debugPrint('Foreground notification: ${message.notification?.title}');
    });

    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      debugPrint('Notification clicked: ${jsonEncode(message.data)}');
      _handleTap(message.data);
    });

    final initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      debugPrint('Opened from terminated: ${jsonEncode(initialMessage.data)}');

      Future.delayed(const Duration(milliseconds: 900), () {
        _handleTap(initialMessage.data);
      });
    }
  }

  static Future<void> _saveToken(String? token) async {
    final user = FirebaseAuth.instance.currentUser;

    if (user == null || token == null || token.isEmpty) return;

    await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
      'fcmTokens': FieldValue.arrayUnion([token]),
      'lastFcmToken': token,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  static Future<void> _handleTap(Map<String, dynamic> data) async {
    final context = appNavigatorKey.currentContext;
    if (context == null) return;

    final routeType = (data['routeType'] ?? data['contentType'] ?? '')
        .toString()
        .toLowerCase();

    final entityId = (data['entityId'] ?? '').toString();

    if (routeType == 'dashboard') {
      return;
    }

    if (routeType == 'support') {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const HelpSupportScreen()),
      );
      return;
    }

    if (routeType == 'batch' && entityId.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => BatchSubjectsScreen(batchId: entityId),
        ),
      );
      return;
    }

    if (routeType == 'lecture' && entityId.isNotEmpty) {
      await _openLecture(context, entityId);
      return;
    }

    if (routeType == 'note' && entityId.isNotEmpty) {
      await _openFile(context, collection: 'notes', entityId: entityId);
      return;
    }

    if (routeType == 'pyq' && entityId.isNotEmpty) {
      await _openFile(context, collection: 'pyqs', entityId: entityId);
      return;
    }

    if (routeType == 'test' && entityId.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => TestTakerScreen(testId: entityId)),
      );
      return;
    }
  }

  static String _fileUrl(Map<String, dynamic> data) {
    final fields = [
      data['fileUrl'],
      data['pdfUrl'],
      data['url'],
      data['link'],
      data['driveUrl'],
      data['downloadUrl'],
      data['noteUrl'],
    ];

    for (final raw in fields) {
      final value = (raw ?? '').toString().trim();
      if (value.isNotEmpty) return value;
    }

    return '';
  }

  static Future<void> _openFile(
    BuildContext context, {
    required String collection,
    required String entityId,
  }) async {
    final snap = await FirebaseFirestore.instance
        .collection(collection)
        .doc(entityId)
        .get();

    if (!snap.exists) return;

    final data = {'id': snap.id, ...snap.data()!};
    final url = _fileUrl(data);

    if (url.isEmpty) return;

    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme) return;

    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  static Future<void> _openLecture(
    BuildContext context,
    String lectureId,
  ) async {
    final db = FirebaseFirestore.instance;

    final lectureSnap = await db.collection('lectures').doc(lectureId).get();
    if (!lectureSnap.exists) return;

    final lecture = {'id': lectureSnap.id, ...lectureSnap.data()!};

    final batchId = (lecture['batchId'] ?? '').toString();
    final subjectId = (lecture['subjectId'] ?? '').toString();

    if (batchId.isEmpty || subjectId.isEmpty) return;

    final lecturesSnap = await db
        .collection('lectures')
        .where('batchId', isEqualTo: batchId)
        .where('subjectId', isEqualTo: subjectId)
        .get();

    final lectures = lecturesSnap.docs
        .map((d) => {'id': d.id, ...d.data()})
        .where((i) => i['isVisible'] != false)
        .toList();

    lectures.sort((a, b) {
      final ao = (a['order'] ?? 0) as num;
      final bo = (b['order'] ?? 0) as num;
      return ao.compareTo(bo);
    });

    final index = lectures.indexWhere((e) => e['id'] == lectureId);
    if (index < 0) return;

    final batchSnap = await db.collection('batches').doc(batchId).get();
    final subjectSnap = await db.collection('subjects').doc(subjectId).get();

    final batchData = batchSnap.data() ?? {};
    final subjectData = subjectSnap.data() ?? {};

    final batchName = (batchData['name'] ?? batchData['batchName'] ?? '')
        .toString();

    final subjectName =
        (subjectData['subjectName'] ??
                subjectData['name'] ??
                subjectData['title'] ??
                '')
            .toString();

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LecturePlayerScreen(
          lectures: lectures,
          initialIndex: index,
          subjectName: subjectName,
          batchName: batchName,
          heroTag: 'lecture_$lectureId',
        ),
      ),
    );
  }
}
