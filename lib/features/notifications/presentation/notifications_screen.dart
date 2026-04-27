import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../subjects/presentation/batch_subjects_screen.dart';
import '../../lectures/presentation/lecture_player_screen.dart';
import '../../subjects/presentation/subject_detail_screen.dart';
import '../../tests/presentation/test_taker_screen.dart';
import '../../support/presentation/help_support_screen.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  Color get _bg => const Color(0xFFF6F6FB);
  Color get _dark => const Color(0xFF151A29);
  Color get _muted => const Color(0xFF6F768A);

  String _formatDate(Timestamp? ts) {
    if (ts == null) return '';
    final d = ts.toDate();
    return "${d.day}/${d.month} ${d.hour}:${d.minute.toString().padLeft(2, '0')}";
  }

  Future<void> _markRead(User user, String notificationId) async {
    await FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('notificationReads')
        .doc(notificationId)
        .set({'readAt': FieldValue.serverTimestamp()});
  }

  String _fileUrl(Map<String, dynamic> data) {
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

  Future<void> _openExternalUrl(BuildContext context, String url) async {
    final uri = Uri.tryParse(url);

    if (uri == null || !uri.hasScheme) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Invalid file link')));
      return;
    }

    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);

    if (!opened && context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Unable to open file')));
    }
  }

  Future<void> _openBatch(BuildContext context, String batchId) async {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => BatchSubjectsScreen(batchId: batchId)),
    );
  }

  Future<void> _openSubjectContent(
    BuildContext context, {
    required String collection,
    required String entityId,
  }) async {
    final db = FirebaseFirestore.instance;

    final snap = await db.collection(collection).doc(entityId).get();

    if (!snap.exists) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Content not found')));
      return;
    }

    final item = {'id': snap.id, ...snap.data()!};

    final batchId = (item['batchId'] ?? '').toString();
    final subjectId = (item['subjectId'] ?? '').toString();

    if (batchId.isEmpty || subjectId.isEmpty) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Content target is incomplete')),
      );
      return;
    }

    if (!context.mounted) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            SubjectDetailScreen(batchId: batchId, subjectId: subjectId),
      ),
    );
  }

  Future<void> _openLecture(BuildContext context, String lectureId) async {
    final db = FirebaseFirestore.instance;

    final lectureSnap = await db.collection('lectures').doc(lectureId).get();

    if (!lectureSnap.exists) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Lecture not found')));
      return;
    }

    final lecture = {'id': lectureSnap.id, ...lectureSnap.data()!};
    final batchId = (lecture['batchId'] ?? '').toString();
    final subjectId = (lecture['subjectId'] ?? '').toString();

    if (batchId.isEmpty || subjectId.isEmpty) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lecture target is incomplete')),
      );
      return;
    }

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

    if (index < 0) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Lecture is not available')));
      return;
    }

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

    if (!context.mounted) return;

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

  Future<void> _openNoteOrPyq(
    BuildContext context, {
    required String collection,
    required String entityId,
  }) async {
    final snap = await FirebaseFirestore.instance
        .collection(collection)
        .doc(entityId)
        .get();

    if (!snap.exists) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('File not found')));
      return;
    }

    final data = {'id': snap.id, ...snap.data()!};
    final url = _fileUrl(data);

    if (url.isEmpty) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('File link is missing')));
      return;
    }

    if (!context.mounted) return;
    await _openExternalUrl(context, url);
  }

  Future<void> _handleNotificationTap(
    BuildContext context, {
    required User user,
    required String notificationId,
    required Map<String, dynamic> data,
  }) async {
    await _markRead(user, notificationId);

    final routeType = (data['routeType'] ?? data['contentType'] ?? '')
        .toString()
        .toLowerCase();

    final entityId = (data['entityId'] ?? '').toString();

    if (routeType == 'dashboard') {
      Navigator.pop(context);
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
      await _openBatch(context, entityId);
      return;
    }

    if (routeType == 'lecture' && entityId.isNotEmpty) {
      await _openLecture(context, entityId);
      return;
    }

    if (routeType == 'note' && entityId.isNotEmpty) {
      await _openNoteOrPyq(context, collection: 'notes', entityId: entityId);
      return;
    }

    if (routeType == 'pyq' && entityId.isNotEmpty) {
      await _openNoteOrPyq(context, collection: 'pyqs', entityId: entityId);
      return;
    }

    if (routeType == 'test' && entityId.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => TestTakerScreen(testId: entityId)),
      );
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Unable to open this notification')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        elevation: 0,
        title: Text(
          "Notifications",
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: _dark,
          ),
        ),
      ),
      body: user == null
          ? const Center(child: Text("Login required"))
          : StreamBuilder<QuerySnapshot>(
              stream: FirebaseFirestore.instance
                  .collection('notifications')
                  .where('isActive', isEqualTo: true)
                  .orderBy('createdAt', descending: true)
                  .limit(50)
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                final accountCreatedAt = user.metadata.creationTime;

                final allDocs = snapshot.data?.docs ?? [];

                final docs = allDocs.where((doc) {
                  final data = doc.data() as Map<String, dynamic>;
                  final createdAt = data['createdAt'];

                  if (accountCreatedAt == null) return true;
                  if (createdAt is! Timestamp) return false;

                  final notificationTime = createdAt.toDate();

                  return notificationTime.isAfter(accountCreatedAt) ||
                      notificationTime.isAtSameMomentAs(accountCreatedAt);
                }).toList();

                if (docs.isEmpty) {
                  return Center(
                    child: Text(
                      "No notifications yet",
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: _muted,
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(14),
                  itemCount: docs.length,
                  itemBuilder: (context, index) {
                    final doc = docs[index];
                    final data = doc.data() as Map<String, dynamic>;

                    final title = (data['title'] ?? '').toString();
                    final message = (data['message'] ?? '').toString();
                    final createdAt = data['createdAt'] as Timestamp?;

                    return StreamBuilder<DocumentSnapshot>(
                      stream: FirebaseFirestore.instance
                          .collection('users')
                          .doc(user.uid)
                          .collection('notificationReads')
                          .doc(doc.id)
                          .snapshots(),
                      builder: (context, readSnap) {
                        final isRead = readSnap.data?.exists ?? false;

                        return InkWell(
                          borderRadius: BorderRadius.circular(18),
                          onTap: () => _handleNotificationTap(
                            context,
                            user: user,
                            notificationId: doc.id,
                            data: data,
                          ),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: isRead
                                  ? Colors.white
                                  : const Color(0xFFF1EEFF),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: isRead
                                    ? const Color(0xFFE8EAF2)
                                    : const Color(0xFF6C3BFF).withOpacity(0.4),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(
                                  Icons.notifications_rounded,
                                  color: Color(0xFF6C3BFF),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        title,
                                        style: GoogleFonts.inter(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: _dark,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        message,
                                        style: GoogleFonts.inter(
                                          fontSize: 12.5,
                                          color: _muted,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        _formatDate(createdAt),
                                        style: GoogleFonts.inter(
                                          fontSize: 11,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (!isRead)
                                  const Padding(
                                    padding: EdgeInsets.only(top: 4),
                                    child: Icon(
                                      Icons.circle,
                                      size: 8,
                                      color: Color(0xFF6C3BFF),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                );
              },
            ),
    );
  }
}
