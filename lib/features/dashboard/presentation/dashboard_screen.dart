import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:cuphy_app/features/batches/presentation/my_batches_screen.dart';
import 'package:cuphy_app/features/subjects/presentation/batch_subjects_screen.dart';
import 'package:cuphy_app/features/lectures/presentation/lecture_player_screen.dart';
import 'package:cuphy_app/features/tests/presentation/test_result_screen.dart';
import 'my_performance_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  bool _loading = true;
  List<Map<String, dynamic>> _enrolledBatches = [];
  Set<String> _premiumBatchIds = {};

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        if (!mounted) return;
        setState(() => _loading = false);
        return;
      }

      final access = await _loadUserAccess(user);
      final enrolledIds = access.enrolledBatchIds;
      final premiumIds = access.premiumBatchIds;

      final batchSnap = await _db.collection('batches').get();

      final batches = batchSnap.docs
          .map((doc) => {'id': doc.id, ...doc.data()})
          .where((batch) {
            final batchId = batch['id'].toString();
            return enrolledIds.contains(batchId) &&
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
        _enrolledBatches = batches;
        _premiumBatchIds = premiumIds;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<_UserAccess> _loadUserAccess(User user) async {
    final enrolledBatchIds = <String>{};
    final premiumBatchIds = <String>{};

    final enrollmentMap = <String, Map<String, dynamic>>{};
    final subscriptionMap = <String, Map<String, dynamic>>{};

    try {
      final enrollByUid = await _db
          .collection('enrollments')
          .where('userUid', isEqualTo: user.uid)
          .get();

      for (final doc in enrollByUid.docs) {
        enrollmentMap[doc.id] = {'id': doc.id, ...doc.data()};
      }
    } catch (_) {}

    try {
      final subByUid = await _db
          .collection('subscriptions')
          .where('userUid', isEqualTo: user.uid)
          .get();

      for (final doc in subByUid.docs) {
        subscriptionMap[doc.id] = {'id': doc.id, ...doc.data()};
      }
    } catch (_) {}

    for (final enrollment in enrollmentMap.values) {
      final batchId = enrollment['batchId']?.toString();
      if (batchId != null && batchId.isNotEmpty) {
        enrolledBatchIds.add(batchId);
      }
    }

    final now = DateTime.now();

    for (final sub in subscriptionMap.values) {
      final batchId = sub['batchId']?.toString();
      if (batchId == null || batchId.isEmpty) continue;
      if (sub['active'] != true) continue;

      final expiryRaw = sub['expiryDate'];
      if (expiryRaw == null) {
        premiumBatchIds.add(batchId);
        continue;
      }

      DateTime? expiry;
      if (expiryRaw is Timestamp) {
        expiry = expiryRaw.toDate();
      } else {
        expiry = DateTime.tryParse(expiryRaw.toString());
      }

      if (expiry == null || !expiry.isBefore(now)) {
        premiumBatchIds.add(batchId);
      }
    }

    return _UserAccess(
      enrolledBatchIds: enrolledBatchIds,
      premiumBatchIds: premiumBatchIds,
    );
  }

  Future<void> _continueLecture() async {
    final user = _auth.currentUser;
    if (user == null) return;

    try {
      final userDoc = await _db.collection('users').doc(user.uid).get();
      final data = userDoc.data();

      final lastLecture = data?['lastLecture'];

      if (lastLecture is! Map) {
        _toast('No recent lecture found');
        return;
      }

      final lectureId = (lastLecture['lectureId'] ?? '').toString();
      final title = (lastLecture['title'] ?? 'Lecture').toString();
      final youtubeVideoId = (lastLecture['youtubeVideoId'] ?? '').toString();
      final subjectName = (lastLecture['subjectName'] ?? '').toString();
      final batchName = (lastLecture['batchName'] ?? '').toString();

      if (youtubeVideoId.isEmpty) {
        _toast('Recent lecture data is incomplete');
        return;
      }

      final lecture = {
        'id': lectureId.isEmpty ? youtubeVideoId : lectureId,
        'title': title,
        'youtubeVideoId': youtubeVideoId,
      };

      if (!mounted) return;

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => LecturePlayerScreen(
            lectures: [lecture],
            initialIndex: 0,
            subjectName: subjectName,
            batchName: batchName,
            heroTag: 'lecture_${lecture['id']}',
          ),
        ),
      );
    } catch (_) {
      _toast('Continue Last Lecture is not available yet');
    }
  }

  void _openBatch(Map<String, dynamic> batch) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BatchSubjectsScreen(batchId: batch['id'].toString()),
      ),
    );
  }

  void _openAllBatches() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const MyBatchesScreen()),
    );
  }

  void _toast(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F6FB),
      body: RefreshIndicator(
        onRefresh: _loadDashboard,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(12, 6, 12, 18),
          children: [
            const _GreetingHero(),
            const SizedBox(height: 14),
            StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
              stream: _auth.currentUser == null
                  ? null
                  : _db
                        .collection('users')
                        .doc(_auth.currentUser!.uid)
                        .snapshots(),
              builder: (context, snapshot) {
                final data = snapshot.data?.data();
                final lastLecture = data?['lastLecture'];

                if (lastLecture is! Map) {
                  return const SizedBox.shrink();
                }

                final title = (lastLecture['title'] ?? 'Continue Last Lecture')
                    .toString();
                final subjectName = (lastLecture['subjectName'] ?? '')
                    .toString();

                return _ContinueLearningCard(
                  title: title,
                  subtitle: subjectName.isEmpty
                      ? 'Jump back into your most recent study session'
                      : subjectName,
                  onTap: _continueLecture,
                );
              },
            ),
            const SizedBox(height: 16),
            _SectionHeader(
              title: 'My Batches',
              subtitle: 'Your enrolled learning spaces',
              actionLabel: 'View all',
              onActionTap: _openAllBatches,
            ),
            const SizedBox(height: 10),
            _loading
                ? const _BatchLoadingStrip()
                : _MyBatchesSection(
                    batches: _enrolledBatches,
                    premiumBatchIds: _premiumBatchIds,
                    onBatchTap: _openBatch,
                  ),
            const SizedBox(height: 16),
            const _SectionHeader(
              title: 'Student Analytics',
              subtitle: 'Your current learning snapshot',
            ),
            const SizedBox(height: 10),
            _AnalyticsSection(
              enrolledCount: _enrolledBatches.length,
              premiumCount: _premiumBatchIds.length,
            ),
            const SizedBox(height: 16),
            const _SectionHeader(
              title: 'PERFORMANCE',
              subtitle: 'TEST-MISTAKE-LEARN-TEST',
            ),
            const SizedBox(height: 10),
            const _RecentTestsDropdown(),
          ],
        ),
      ),
    );
  }
}

class _UserAccess {
  const _UserAccess({
    required this.enrolledBatchIds,
    required this.premiumBatchIds,
  });

  final Set<String> enrolledBatchIds;
  final Set<String> premiumBatchIds;
}

class _GreetingHero extends StatelessWidget {
  const _GreetingHero();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF8F7FF), Color(0xFFF1EEFF), Color(0xFFEAF7FF)],
        ),
        border: Border.all(color: const Color(0xFFE8EAF2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.045),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              gradient: const LinearGradient(
                colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
              ),
            ),
            alignment: Alignment.center,
            child: const Icon(
              Icons.auto_awesome_rounded,
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
                  'Welcome back',
                  style: GoogleFonts.inter(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF737B90),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Keep your physics momentum strong',
                  style: GoogleFonts.inter(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF151A29),
                    letterSpacing: -0.4,
                    height: 1.15,
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

class _ContinueLearningCard extends StatelessWidget {
  const _ContinueLearningCard({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(26),
        onTap: onTap,
        child: Ink(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(26),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF6C3BFF).withOpacity(0.24),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.16),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(
                  Icons.play_circle_fill_rounded,
                  color: Colors.white,
                  size: 32,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Continue Watching',
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: Colors.white.withOpacity(0.82),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 13.2,
                        fontWeight: FontWeight.w500,
                        color: Colors.white.withOpacity(0.86),
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.14),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.arrow_forward_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.subtitle,
    this.actionLabel,
    this.onActionTap,
  });

  final String title;
  final String subtitle;
  final String? actionLabel;
  final VoidCallback? onActionTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF151A29),
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                style: GoogleFonts.inter(
                  fontSize: 13.2,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF737B90),
                ),
              ),
            ],
          ),
        ),
        if (actionLabel != null)
          TextButton(
            onPressed: onActionTap,
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF6C3BFF),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            ),
            child: Text(
              actionLabel!,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF6C3BFF),
              ),
            ),
          ),
      ],
    );
  }
}

class _BatchLoadingStrip extends StatelessWidget {
  const _BatchLoadingStrip();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 168,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: 3,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (_, __) => Container(
          width: 250,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
          ),
        ),
      ),
    );
  }
}

class _MyBatchesSection extends StatelessWidget {
  const _MyBatchesSection({
    required this.batches,
    required this.premiumBatchIds,
    required this.onBatchTap,
  });

  final List<Map<String, dynamic>> batches;
  final Set<String> premiumBatchIds;
  final ValueChanged<Map<String, dynamic>> onBatchTap;

  @override
  Widget build(BuildContext context) {
    if (batches.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFFE8EAF2)),
        ),
        child: Column(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFFF3EEFF),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.menu_book_rounded,
                color: Color(0xFF6C3BFF),
                size: 26,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'No enrolled batches yet',
              style: GoogleFonts.inter(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF151A29),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Enroll in a batch to see it here.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF737B90),
                height: 1.45,
              ),
            ),
          ],
        ),
      );
    }

    return SizedBox(
      height: 190,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: batches.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final batch = batches[index];
          final batchId = batch['id'].toString();
          return _BatchCard(
            batch: batch,
            isPremium: premiumBatchIds.contains(batchId),
            onTap: () => onBatchTap(batch),
          );
        },
      ),
    );
  }
}

class _BatchCard extends StatelessWidget {
  const _BatchCard({
    required this.batch,
    required this.isPremium,
    required this.onTap,
  });

  final Map<String, dynamic> batch;
  final bool isPremium;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final name = (batch['name'] ?? batch['batchName'] ?? 'Unnamed Batch')
        .toString();

    final semester = (batch['semester'] ?? '-').toString();

    final description = (batch['description'] ?? batch['desc'] ?? '')
        .toString()
        .trim();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Ink(
          width: 255,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            color: Colors.white,
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
                height: 8,
                decoration: const BoxDecoration(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                  gradient: LinearGradient(
                    colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF3EEFF),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              'Semester $semester',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF6C3BFF),
                              ),
                            ),
                          ),
                          const Spacer(),
                          if (isPremium)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 9,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE8F8EE),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                'Premium',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF169A65),
                                ),
                              ),
                            )
                          else
                            const Icon(
                              Icons.arrow_outward_rounded,
                              color: Color(0xFF151A29),
                              size: 18,
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 16.5,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF151A29),
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        description.isEmpty
                            ? 'Open subjects, lectures, notes and tests.'
                            : description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 12.6,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF737B90),
                          height: 1.4,
                        ),
                      ),
                      const Spacer(),
                      Row(
                        children: [
                          Text(
                            'Open Batch',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF6C3BFF),
                            ),
                          ),
                          const Spacer(),
                          const Icon(
                            Icons.arrow_forward_rounded,
                            color: Color(0xFF6C3BFF),
                            size: 20,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AnalyticsSection extends StatelessWidget {
  const _AnalyticsSection({
    required this.enrolledCount,
    required this.premiumCount,
  });

  final int enrolledCount;
  final int premiumCount;

  Future<Map<String, dynamic>> _loadData() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return {'tests': 0, 'avgScore': 0.0};
    }

    final snap = await FirebaseFirestore.instance
        .collection('testResults')
        .where('userUid', isEqualTo: user.uid)
        .get();

    final results = snap.docs.map((doc) => doc.data()).toList();

    double avgScore = 0;

    if (results.isNotEmpty) {
      double totalPercent = 0;

      for (final result in results) {
        final raw = result['percentage'];
        final percent = raw is num
            ? raw.toDouble()
            : double.tryParse('$raw') ?? 0;

        totalPercent += percent;
      }

      avgScore = totalPercent / results.length;
    }

    return {'tests': results.length, 'avgScore': avgScore};
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _loadData(),
      builder: (context, snapshot) {
        final tests = snapshot.data?['tests'] ?? 0;
        final avgScore = snapshot.data?['avgScore'] ?? 0.0;

        return Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: _AnalyticsCard(
                    title: 'My Batches',
                    value: '$enrolledCount',
                    icon: Icons.school_rounded,
                    iconBg: const Color(0xFFF3EEFF),
                    iconColor: const Color(0xFF6C3BFF),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _AnalyticsCard(
                    title: 'Premium',
                    value: '$premiumCount',
                    icon: Icons.workspace_premium_rounded,
                    iconBg: const Color(0xFFE8F8EE),
                    iconColor: const Color(0xFF22C55E),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _AnalyticsCard(
                    title: 'Tests',
                    value: '$tests',
                    icon: Icons.assignment_turned_in_rounded,
                    iconBg: const Color(0xFFE7F0FF),
                    iconColor: const Color(0xFF3B82F6),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _AnalyticsCard(
                    title: 'Avg Score',
                    value: '${(avgScore as double).toStringAsFixed(1)}%',
                    icon: Icons.trending_up_rounded,
                    iconBg: const Color(0xFFFFF1E7),
                    iconColor: const Color(0xFFF97316),
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}

class _AnalyticsCard extends StatelessWidget {
  const _AnalyticsCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.iconBg,
    required this.iconColor,
  });

  final String title;
  final String value;
  final IconData icon;
  final Color iconBg;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE8EAF2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.045),
            blurRadius: 14,
            offset: const Offset(0, 7),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(15),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(height: 14),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF151A29),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF151A29),
            ),
          ),
        ],
      ),
    );
  }
}

class _RecentTestsDropdown extends StatefulWidget {
  const _RecentTestsDropdown();

  @override
  State<_RecentTestsDropdown> createState() => _RecentTestsDropdownState();
}

class _RecentTestsDropdownState extends State<_RecentTestsDropdown> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE8EAF2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 7),
          ),
        ],
      ),
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(22),
            onTap: () {
              setState(() {
                _expanded = !_expanded;
              });
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3EEFF),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.assignment_turned_in_rounded,
                      color: Color(0xFF6C3BFF),
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Recent Test Results',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF151A29),
                      ),
                    ),
                  ),
                  AnimatedRotation(
                    turns: _expanded ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: Color(0xFF7C8193),
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox(),
            secondChild: const _RecentTestList(),
            crossFadeState: _expanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 200),
          ),
        ],
      ),
    );
  }
}

class _RecentTestList extends StatelessWidget {
  const _RecentTestList();

  Future<List<Map<String, dynamic>>> _loadResults() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return [];

    final snap = await FirebaseFirestore.instance
        .collection('testResults')
        .where('userUid', isEqualTo: user.uid)
        .get();

    final results = snap.docs.map((doc) {
      return {'id': doc.id, ...doc.data()};
    }).toList();

    results.sort((a, b) {
      final at = a['createdAt'];
      final bt = b['createdAt'];

      final ad = at is Timestamp
          ? at.toDate()
          : DateTime.fromMillisecondsSinceEpoch(0);

      final bd = bt is Timestamp
          ? bt.toDate()
          : DateTime.fromMillisecondsSinceEpoch(0);

      return bd.compareTo(ad);
    });

    return results.take(5).toList();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _loadResults(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator()),
          );
        }

        if (snapshot.hasError) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Unable to load test results',
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.red,
              ),
            ),
          );
        }

        final results = snapshot.data ?? [];

        if (results.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'No test attempts yet',
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF737B90),
              ),
            ),
          );
        }

        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
          child: Column(
            children: [
              ...results.map((data) {
                final title = (data['testTitle'] ?? 'Test').toString();

                final percent = data['percentage'] is num
                    ? (data['percentage'] as num).toDouble()
                    : double.tryParse('${data['percentage']}') ?? 0.0;

                final score = data['score'] is num
                    ? (data['score'] as num).toInt()
                    : int.tryParse('${data['score']}') ?? 0;

                final total = data['totalMarks'] is num
                    ? (data['totalMarks'] as num).toInt()
                    : int.tryParse('${data['totalMarks']}') ?? 0;

                final details = data['details'] is List
                    ? data['details'] as List
                    : [];

                return InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => TestResultScreen(
                          testTitle: title,
                          score: score,
                          totalMarks: total,
                          percentage: percent,
                          details: details,
                        ),
                      ),
                    );
                  },
                  child: Container(
                    margin: const EdgeInsets.only(top: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7F8FC),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.bar_chart_rounded,
                          color: Color(0xFF6C3BFF),
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF151A29),
                            ),
                          ),
                        ),
                        Text(
                          '${percent.toStringAsFixed(1)}%',
                          style: GoogleFonts.inter(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF6C3BFF),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const MyPerformanceScreen(),
                    ),
                  );
                },
                child: Text(
                  'View Full Performance →',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF6C3BFF),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
