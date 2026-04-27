import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../subjects/presentation/batch_subjects_screen.dart';

class MyBatchesScreen extends StatefulWidget {
  const MyBatchesScreen({super.key});

  @override
  State<MyBatchesScreen> createState() => _MyBatchesScreenState();
}

class _MyBatchesScreenState extends State<MyBatchesScreen> {
  final _db = FirebaseFirestore.instance;
  final _auth = FirebaseAuth.instance;

  bool _loading = true;
  List<Map<String, dynamic>> _batches = [];
  Set<String> _premiumBatchIds = {};

  @override
  void initState() {
    super.initState();
    _loadMyBatches();
  }

  Future<void> _loadMyBatches() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        if (!mounted) return;
        setState(() => _loading = false);
        return;
      }

      final enrolledIds = <String>{};
      final premiumIds = <String>{};

      final enrollByUid = await _db
          .collection('enrollments')
          .where('userUid', isEqualTo: user.uid)
          .get();

      for (final doc in enrollByUid.docs) {
        final batchId = doc.data()['batchId']?.toString();
        if (batchId != null && batchId.isNotEmpty) {
          enrolledIds.add(batchId);
        }
      }

      final subByUid = await _db
          .collection('subscriptions')
          .where('userUid', isEqualTo: user.uid)
          .get();

      final now = DateTime.now();

      for (final doc in subByUid.docs) {
        final sub = doc.data();
        final batchId = sub['batchId']?.toString();

        if (batchId == null || batchId.isEmpty) continue;
        if (sub['active'] != true) continue;

        final expiryRaw = sub['expiryDate'];

        if (expiryRaw == null) {
          premiumIds.add(batchId);
          continue;
        }

        DateTime? expiry;

        if (expiryRaw is Timestamp) {
          expiry = expiryRaw.toDate();
        } else {
          expiry = DateTime.tryParse(expiryRaw.toString());
        }

        if (expiry == null || !expiry.isBefore(now)) {
          premiumIds.add(batchId);
        }
      }

      final batchSnap = await _db.collection('batches').get();

      final batches = batchSnap.docs
          .map((doc) => {'id': doc.id, ...doc.data()})
          .where((batch) {
            final id = batch['id'].toString();
            return enrolledIds.contains(id) &&
                batch['isVisible'] != false &&
                batch['isActive'] != false;
          })
          .toList();

      batches.sort((a, b) {
        final aSem = int.tryParse('${a['semester'] ?? 0}') ?? 0;
        final bSem = int.tryParse('${b['semester'] ?? 0}') ?? 0;
        return aSem.compareTo(bSem);
      });

      if (!mounted) return;

      setState(() {
        _batches = batches;
        _premiumBatchIds = premiumIds;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  void _openBatch(String batchId) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => BatchSubjectsScreen(batchId: batchId)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F6FB),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF6F6FB),
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF151A29)),
        title: Text(
          'My Batches',
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF151A29),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadMyBatches,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 18),
          children: [
            _Header(total: _batches.length),
            const SizedBox(height: 14),
            if (_loading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.only(top: 80),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_batches.isEmpty)
              const _EmptyState()
            else
              ..._batches.map((batch) {
                final batchId = batch['id'].toString();

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _MyBatchCard(
                    batch: batch,
                    isPremium: _premiumBatchIds.contains(batchId),
                    onTap: () => _openBatch(batchId),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.total});

  final int total;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF17124D), Color(0xFF2A216B), Color(0xFFB9B0D6)],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF17124D).withOpacity(0.16),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.14),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(
              Icons.auto_stories_rounded,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$total Enrolled ${total == 1 ? 'Batch' : 'Batches'}',
                  style: GoogleFonts.inter(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  'Open your active learning spaces and continue your semester journey.',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    height: 1.45,
                    fontWeight: FontWeight.w500,
                    color: Colors.white.withOpacity(0.82),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MyBatchCard extends StatelessWidget {
  const _MyBatchCard({
    required this.batch,
    required this.isPremium,
    required this.onTap,
  });

  final Map<String, dynamic> batch;
  final bool isPremium;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final name = (batch['name'] ?? batch['batchName'] ?? 'Batch').toString();
    final description = (batch['description'] ?? batch['desc'] ?? '')
        .toString()
        .trim();
    final semester = (batch['semester'] ?? '-').toString();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(26),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: const Color(0xFFE8EAF2)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 16,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                height: 10,
                decoration: const BoxDecoration(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
                  gradient: LinearGradient(
                    colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 58,
                      height: 58,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        gradient: const LinearGradient(
                          colors: [Color(0xFFF3EEFF), Color(0xFFEAF7FF)],
                        ),
                      ),
                      child: const Icon(
                        Icons.school_rounded,
                        color: Color(0xFF6C3BFF),
                        size: 30,
                      ),
                    ),
                    const SizedBox(width: 13),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _Badge(
                                text: 'Semester $semester',
                                bg: const Color(0xFFF3EEFF),
                                fg: const Color(0xFF6C3BFF),
                              ),
                              if (isPremium)
                                const _Badge(
                                  text: 'Premium',
                                  bg: Color(0xFFE8F8EE),
                                  fg: Color(0xFF169A65),
                                )
                              else
                                const _Badge(
                                  text: 'Enrolled',
                                  bg: Color(0xFFE7F0FF),
                                  fg: Color(0xFF3B82F6),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF151A29),
                              height: 1.2,
                            ),
                          ),
                          const SizedBox(height: 7),
                          Text(
                            description.isEmpty
                                ? 'Open subjects, lectures, notes and tests.'
                                : description,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              height: 1.45,
                              fontWeight: FontWeight.w500,
                              color: const Color(0xFF737B90),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Text(
                                'Open Batch',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF6C3BFF),
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Icon(
                                Icons.arrow_forward_rounded,
                                size: 18,
                                color: Color(0xFF6C3BFF),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.text, required this.bg, required this.fg});

  final String text;
  final Color bg;
  final Color fg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: fg,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 14),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE8EAF2)),
      ),
      child: Column(
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: const Color(0xFFF3EEFF),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(
              Icons.menu_book_rounded,
              color: Color(0xFF6C3BFF),
              size: 30,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'No enrolled batches yet',
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF151A29),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'After enrolling in a batch, it will appear here.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13,
              height: 1.45,
              color: const Color(0xFF737B90),
            ),
          ),
        ],
      ),
    );
  }
}
