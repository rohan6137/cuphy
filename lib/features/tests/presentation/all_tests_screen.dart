import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'test_taker_screen.dart';

class AllTestsScreen extends StatefulWidget {
  const AllTestsScreen({super.key});

  @override
  State<AllTestsScreen> createState() => _AllTestsScreenState();
}

class _AllTestsScreenState extends State<AllTestsScreen> {
  final _db = FirebaseFirestore.instance;

  bool _loading = true;
  String _semester = 'All';

  List<Map<String, dynamic>> _tests = [];
  final Map<String, Map<String, dynamic>> _batches = {};
  final Map<String, Map<String, dynamic>> _subjects = {};
  final Map<String, bool> _premiumAccessByBatch = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  bool _isPremiumTest(Map<String, dynamic> test) {
    return test['isPremium'] == true || test['isFree'] == false;
  }

  Future<void> _load() async {
    setState(() => _loading = true);

    try {
      final batchSnap = await _db.collection('batches').get();
      final subjectSnap = await _db.collection('subjects').get();
      final testsSnap = await _db.collection('tests').get();

      _batches.clear();
      _subjects.clear();
      _premiumAccessByBatch.clear();

      for (final doc in batchSnap.docs) {
        final data = {'id': doc.id, ...doc.data()};
        if (data['isVisible'] != false && data['isActive'] != false) {
          _batches[doc.id] = data;
        }
      }

      for (final doc in subjectSnap.docs) {
        final data = {'id': doc.id, ...doc.data()};
        if (data['isVisible'] != false) {
          _subjects[doc.id] = data;
        }
      }

      final tests = testsSnap.docs
          .map((doc) => {'id': doc.id, ...doc.data()})
          .where((test) {
            if (test['isVisible'] == false) return false;
            final batchId = test['batchId']?.toString() ?? '';
            final subjectId = test['subjectId']?.toString() ?? '';
            return _batches.containsKey(batchId) &&
                _subjects.containsKey(subjectId);
          })
          .toList();

      tests.sort((a, b) {
        final ba = _batches[a['batchId']] ?? {};
        final bb = _batches[b['batchId']] ?? {};

        final sa = int.tryParse('${ba['semester'] ?? 0}') ?? 0;
        final sb = int.tryParse('${bb['semester'] ?? 0}') ?? 0;

        if (sa != sb) return sa.compareTo(sb);

        final oa = int.tryParse('${a['order'] ?? 0}') ?? 0;
        final ob = int.tryParse('${b['order'] ?? 0}') ?? 0;
        return oa.compareTo(ob);
      });

      final premiumBatchIds = tests
          .where(_isPremiumTest)
          .map((test) => test['batchId']?.toString() ?? '')
          .where((id) => id.isNotEmpty)
          .toSet();

      for (final batchId in premiumBatchIds) {
        _premiumAccessByBatch[batchId] = await _hasPremiumAccess(batchId);
      }

      if (!mounted) return;
      setState(() {
        _tests = tests;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _tests = [];
        _premiumAccessByBatch.clear();
        _loading = false;
      });
    }
  }

  List<String> get _semesters {
    final set = _batches.values
        .map((b) => '${b['semester'] ?? ''}'.trim())
        .where((s) => s.isNotEmpty)
        .toSet()
        .toList();

    set.sort((a, b) => (int.tryParse(a) ?? 0).compareTo(int.tryParse(b) ?? 0));
    return ['All', ...set];
  }

  List<Map<String, dynamic>> get _filtered {
    if (_semester == 'All') return _tests;

    return _tests.where((test) {
      final batch = _batches[test['batchId']] ?? {};
      return '${batch['semester'] ?? ''}' == _semester;
    }).toList();
  }

  String _testTitle(Map<String, dynamic> test) {
    return (test['title'] ??
            test['name'] ??
            test['testTitle'] ??
            'Untitled Test')
        .toString();
  }

  Future<bool> _hasPremiumAccess(String batchId) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return false;

    final subMap = <String, Map<String, dynamic>>{};

    try {
      final uidSnap = await _db
          .collection('subscriptions')
          .where('userUid', isEqualTo: user.uid)
          .where('batchId', isEqualTo: batchId)
          .get();

      for (final doc in uidSnap.docs) {
        subMap[doc.id] = {'id': doc.id, ...doc.data()};
      }
    } catch (_) {}

    final now = DateTime.now();

    for (final sub in subMap.values) {
      if (sub['active'] != true) continue;

      final expiryRaw = sub['expiryDate'];

      if (expiryRaw == null) return true;

      DateTime? expiry;
      if (expiryRaw is Timestamp) {
        expiry = expiryRaw.toDate();
      } else {
        expiry = DateTime.tryParse(expiryRaw.toString());
      }

      if (expiry == null || !expiry.isBefore(now)) {
        return true;
      }
    }

    return false;
  }

  Future<void> _openTest(Map<String, dynamic> test) async {
    final batchId = test['batchId']?.toString() ?? '';
    final bool isPremium = _isPremiumTest(test);

    if (isPremium) {
      final allowed =
          _premiumAccessByBatch[batchId] ?? await _hasPremiumAccess(batchId);

      if (!allowed) {
        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Buy premium to unlock this test'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }
    }

    if (!mounted) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TestTakerScreen(testId: test['id'].toString()),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tests = _filtered;

    return Container(
      color: const Color(0xFFF6F6FB),
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(12, 6, 12, 18),
          children: [
            const _HeaderCard(
              title: 'All Tests',
              subtitle: 'Browse tests batch-wise and semester-wise',
              icon: Icons.quiz_rounded,
            ),
            const SizedBox(height: 14),
            _FilterBar(
              value: _semester,
              items: _semesters,
              onChanged: (v) => setState(() => _semester = v),
            ),
            const SizedBox(height: 14),
            if (_loading)
              const _LoadingList()
            else if (tests.isEmpty)
              const _EmptyCard(text: 'No tests available right now')
            else
              ...tests.map((test) {
                final batch = _batches[test['batchId']] ?? {};
                final subject = _subjects[test['subjectId']] ?? {};

                final batchId = test['batchId']?.toString() ?? '';
                final batchName =
                    (batch['name'] ?? batch['batchName'] ?? 'Batch').toString();
                final subjectName =
                    (subject['name'] ?? subject['subjectName'] ?? 'Subject')
                        .toString();
                final semester = (batch['semester'] ?? '-').toString();

                final duration =
                    (test['durationMinutes'] ?? test['duration'] ?? '-')
                        .toString();

                final totalMarks = (test['totalMarks'] ?? test['marks'] ?? '-')
                    .toString();

                final isPremium = _isPremiumTest(test);
                final hasAccess = _premiumAccessByBatch[batchId] ?? false;
                final isLocked = isPremium && !hasAccess;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _TestCard(
                    title: _testTitle(test),
                    batchName: batchName,
                    subjectName: subjectName,
                    semester: semester,
                    duration: duration,
                    totalMarks: totalMarks,
                    isPremium: isPremium,
                    isLocked: isLocked,
                    onTap: () => _openTest(test),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF17124D), Color(0xFF2A216B), Color(0xFFB9B0D6)],
        ),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 34),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 23,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  subtitle,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: Colors.white.withOpacity(0.78),
                    height: 1.4,
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

class _FilterBar extends StatelessWidget {
  const _FilterBar({
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String value;
  final List<String> items;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          'Semester',
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF151A29),
          ),
        ),
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE8EAF2)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              borderRadius: BorderRadius.circular(16),
              items: items.map((s) {
                return DropdownMenuItem(
                  value: s,
                  child: Text(s == 'All' ? 'All' : 'Semester $s'),
                );
              }).toList(),
              onChanged: (v) {
                if (v != null) onChanged(v);
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _TestCard extends StatelessWidget {
  const _TestCard({
    required this.title,
    required this.batchName,
    required this.subjectName,
    required this.semester,
    required this.duration,
    required this.totalMarks,
    required this.isPremium,
    required this.isLocked,
    required this.onTap,
  });

  final String title;
  final String batchName;
  final String subjectName;
  final String semester;
  final String duration;
  final String totalMarks;
  final bool isPremium;
  final bool isLocked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: isLocked
                  ? const Color(0xFF6C3BFF).withOpacity(0.25)
                  : const Color(0xFFE8EAF2),
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF151A29).withOpacity(0.05),
                blurRadius: 14,
                offset: const Offset(0, 8),
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
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Icon(
                  Icons.quiz_rounded,
                  color: Colors.white,
                  size: 26,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 15.5,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF151A29),
                            ),
                          ),
                        ),
                        if (isLocked) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFF3D6),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.lock_rounded,
                                  size: 13,
                                  color: Color(0xFFB87900),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Locked',
                                  style: GoogleFonts.inter(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFFB87900),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ] else if (isPremium) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEAFBF4),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.verified_rounded,
                                  size: 13,
                                  color: Color(0xFF0A9F6A),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Unlocked',
                                  style: GoogleFonts.inter(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w900,
                                    color: const Color(0xFF0A9F6A),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      '$batchName • $subjectName',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF737B90),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 7,
                      runSpacing: 6,
                      children: [
                        _MiniInfoChip(text: 'Semester $semester'),
                        _MiniInfoChip(text: '$duration min'),
                        _MiniInfoChip(text: '$totalMarks marks'),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(
                isLocked
                    ? Icons.lock_outline_rounded
                    : Icons.arrow_forward_rounded,
                color: isLocked
                    ? const Color(0xFFB87900)
                    : const Color(0xFF7C8193),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniInfoChip extends StatelessWidget {
  const _MiniInfoChip({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF3EEFF),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: GoogleFonts.inter(
          fontSize: 10.8,
          fontWeight: FontWeight.w800,
          color: const Color(0xFF6C3BFF),
        ),
      ),
    );
  }
}

class _LoadingList extends StatelessWidget {
  const _LoadingList();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        5,
        (_) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          height: 82,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
          ),
        ),
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Center(
        child: Text(
          text,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.w700,
            color: const Color(0xFF737B90),
          ),
        ),
      ),
    );
  }
}
