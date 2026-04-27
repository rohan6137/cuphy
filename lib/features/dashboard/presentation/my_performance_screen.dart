import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../tests/presentation/test_result_screen.dart';

class MyPerformanceScreen extends StatelessWidget {
  const MyPerformanceScreen({super.key});

  User? get user => FirebaseAuth.instance.currentUser;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F6FB),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF6F6FB),
        elevation: 0,
        title: Text(
          'My Performance',
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF151A29),
          ),
        ),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance
            .collection('testResults')
            .where('userUid', isEqualTo: user?.uid)
            .snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final docs = snapshot.data!.docs;

          if (docs.isEmpty) {
            return Center(
              child: Text(
                'No tests attempted yet',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF7C8193),
                ),
              ),
            );
          }

          // 🔥 sort locally (no rules issue)
          docs.sort((a, b) {
            final aTime = a['createdAt'];
            final bTime = b['createdAt'];

            final aMillis = aTime is Timestamp
                ? aTime.millisecondsSinceEpoch
                : 0;
            final bMillis = bTime is Timestamp
                ? bTime.millisecondsSinceEpoch
                : 0;

            return bMillis.compareTo(aMillis);
          });

          return ListView.builder(
            padding: const EdgeInsets.all(14),
            itemCount: docs.length,
            itemBuilder: (context, i) {
              final data = docs[i].data() as Map<String, dynamic>;

              final title = data['testTitle'] ?? 'Test';
              final score = data['score'] ?? 0;
              final total = data['totalMarks'] ?? 0;
              final percent = data['percentage'] ?? 0.0;
              final details = data['details'] ?? [];

              final createdAt = data['createdAt'];

              return GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => TestResultScreen(
                        testTitle: title,
                        score: score,
                        totalMarks: total,
                        percentage: percent.toDouble(),
                        details: details,
                      ),
                    ),
                  );
                },
                child: Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: const Color(0xFFE8EAF2)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Center(
                          child: Text(
                            '${percent.toStringAsFixed(0)}%',
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF151A29),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Score: $score / $total',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: const Color(0xFF7C8193),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _formatDate(createdAt),
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: const Color(0xFF9AA0B4),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios, size: 16),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  String _formatDate(dynamic ts) {
    if (ts is! Timestamp) return '';
    final d = ts.toDate();
    return '${d.day}/${d.month}/${d.year}';
  }
}
