import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../subjects/presentation/batch_subjects_screen.dart';
import '../../../core/payments/razorpay_service.dart';

class BatchesScreen extends StatefulWidget {
  const BatchesScreen({super.key});

  @override
  State<BatchesScreen> createState() => _BatchesScreenState();
}

class _BatchesScreenState extends State<BatchesScreen> {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  bool _loading = true;
  bool _accessLoading = true;

  List<Map<String, dynamic>> _allBatches = [];
  String _selectedSemester = 'All';

  final Set<String> _enrolledBatchIds = {};
  final Set<String> _premiumBatchIds = {};
  final Set<String> _busyBatchIds = {};

  @override
  void initState() {
    super.initState();
    _loadBatchesAndAccess();
  }

  Future<void> _loadBatchesAndAccess() async {
    try {
      setState(() {
        _loading = true;
        _accessLoading = true;
      });

      final snap = await _db.collection('batches').get();

      final batches = snap.docs
          .map((doc) => {'id': doc.id, ...doc.data()})
          .where((b) => b['isVisible'] != false && b['isActive'] != false)
          .toList();

      batches.sort((a, b) {
        final aSem = int.tryParse('${a['semester'] ?? 0}') ?? 0;
        final bSem = int.tryParse('${b['semester'] ?? 0}') ?? 0;
        return aSem.compareTo(bSem);
      });

      _allBatches = batches;

      await _loadUserAccess();

      if (!mounted) return;
      setState(() {
        _loading = false;
        _accessLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _accessLoading = false;
      });
    }
  }

  Future<void> _loadUserAccess() async {
    _enrolledBatchIds.clear();
    _premiumBatchIds.clear();

    final user = _auth.currentUser;
    if (user == null) return;

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
        _enrolledBatchIds.add(batchId);
      }
    }

    final now = DateTime.now();

    for (final sub in subscriptionMap.values) {
      final batchId = sub['batchId']?.toString();
      if (batchId == null || batchId.isEmpty) continue;
      if (sub['active'] != true) continue;

      final expiryRaw = sub['expiryDate'];

      if (expiryRaw == null) {
        _premiumBatchIds.add(batchId);
        continue;
      }

      DateTime? expiry;
      if (expiryRaw is Timestamp) {
        expiry = expiryRaw.toDate();
      } else {
        expiry = DateTime.tryParse(expiryRaw.toString());
      }

      if (expiry == null || !expiry.isBefore(now)) {
        _premiumBatchIds.add(batchId);
      }
    }
  }

  List<String> get _semesterOptions {
    final semesters = _allBatches
        .map((b) => '${b['semester'] ?? ''}'.trim())
        .where((s) => s.isNotEmpty)
        .toSet()
        .toList();

    semesters.sort((a, b) {
      final aNum = int.tryParse(a) ?? 0;
      final bNum = int.tryParse(b) ?? 0;
      return aNum.compareTo(bNum);
    });

    return ['All', ...semesters];
  }

  List<Map<String, dynamic>> get _filteredBatches {
    if (_selectedSemester == 'All') return _allBatches;
    return _allBatches
        .where((b) => '${b['semester'] ?? ''}' == _selectedSemester)
        .toList();
  }

  bool _isEnrolled(String batchId) => _enrolledBatchIds.contains(batchId);

  bool _hasPremium(String batchId) => _premiumBatchIds.contains(batchId);

  Future<void> _enrollBatch(Map<String, dynamic> batch) async {
    final user = _auth.currentUser;
    final batchId = batch['id'].toString();

    if (user == null) {
      _showToast('Please log in first');
      return;
    }

    if (_busyBatchIds.contains(batchId)) return;

    setState(() {
      _busyBatchIds.add(batchId);
    });

    try {
      final alreadyEnrolled = _isEnrolled(batchId);

      if (!alreadyEnrolled) {
        await _db.collection('enrollments').add({
          'batchId': batchId,
          'userUid': user.uid,
          'userPhone': user.phoneNumber ?? '',
          'createdAt': FieldValue.serverTimestamp(),
        });

        _enrolledBatchIds.add(batchId);
      }

      if (!mounted) return;
      setState(() {});
      _showToast('Batch enrolled successfully');
    } catch (_) {
      _showToast('Unable to enroll right now');
    } finally {
      if (!mounted) return;
      setState(() {
        _busyBatchIds.remove(batchId);
      });
    }
  }

  void _openFreeContent(Map<String, dynamic> batch) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BatchSubjectsScreen(batchId: batch['id'].toString()),
      ),
    );
  }

  void _buyPremium(Map<String, dynamic> batch) {
    final user = _auth.currentUser;

    if (user == null) {
      _showToast('Please log in first');
      return;
    }

    final batchId = batch['id'].toString();
    final batchName = (batch['name'] ?? batch['batchName'] ?? 'Batch')
        .toString();
    final semester = (batch['semester'] ?? '').toString();

    final rawPrice = batch['price'];
    final amount = rawPrice is num
        ? rawPrice.toInt()
        : int.tryParse(rawPrice.toString()) ?? 499;

    if (amount <= 0) {
      _showToast('Invalid batch price');
      return;
    }

    RazorpayService.startPayment(
      context: context,
      batchId: batchId,
      batchName: batchName,
      semester: semester,
      amount: amount,
      onSuccess: () async {
        await _loadBatchesAndAccess();
      },
    );
  }

  void _explore(Map<String, dynamic> batch) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BatchSubjectsScreen(batchId: batch['id'].toString()),
      ),
    );
  }

  void _showToast(String text) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    final batches = _filteredBatches;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6FB),
      body: RefreshIndicator(
        onRefresh: _loadBatchesAndAccess,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(12, 6, 12, 18),
          children: [
            const _PremiumHeader(),
            const SizedBox(height: 14),
            _FilterBar(
              selectedSemester: _selectedSemester,
              semesterOptions: _semesterOptions,
              onSemesterChanged: (value) {
                setState(() {
                  _selectedSemester = value;
                });
              },
            ),
            const SizedBox(height: 14),
            if (_loading)
              const _LoadingList()
            else if (batches.isEmpty)
              _EmptyState(selectedSemester: _selectedSemester)
            else
              ...batches.map((batch) {
                final batchId = batch['id'].toString();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _PremiumBatchCard(
                    batch: batch,
                    isEnrolled: _isEnrolled(batchId),
                    hasPremium: _hasPremium(batchId),
                    busy: _busyBatchIds.contains(batchId) || _accessLoading,
                    onEnroll: () => _enrollBatch(batch),
                    onAccessFree: () => _openFreeContent(batch),
                    onBuyPremium: () => _buyPremium(batch),
                    onExplore: () => _explore(batch),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _PremiumHeader extends StatelessWidget {
  const _PremiumHeader();

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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.12),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              'Structured Semester Learning',
              style: GoogleFonts.inter(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'Browse Batches',
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -0.6,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Choose your semester and open a premium learning path designed for CU Physics Honours students.',
            style: GoogleFonts.inter(
              fontSize: 13.2,
              fontWeight: FontWeight.w500,
              color: Colors.white.withOpacity(0.82),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({
    required this.selectedSemester,
    required this.semesterOptions,
    required this.onSemesterChanged,
  });

  final String selectedSemester;
  final List<String> semesterOptions;
  final ValueChanged<String> onSemesterChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            'Select Semester',
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF151A29),
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE8EAF2)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: selectedSemester,
              borderRadius: BorderRadius.circular(16),
              icon: const Icon(
                Icons.keyboard_arrow_down_rounded,
                color: Color(0xFF6C7285),
              ),
              style: GoogleFonts.inter(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF151A29),
              ),
              items: semesterOptions.map((semester) {
                return DropdownMenuItem<String>(
                  value: semester,
                  child: Text(
                    semester == 'All' ? 'All' : 'Semester $semester',
                    style: GoogleFonts.inter(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF151A29),
                    ),
                  ),
                );
              }).toList(),
              onChanged: (value) {
                if (value != null) onSemesterChanged(value);
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _PremiumBatchCard extends StatelessWidget {
  const _PremiumBatchCard({
    required this.batch,
    required this.isEnrolled,
    required this.hasPremium,
    required this.busy,
    required this.onEnroll,
    required this.onAccessFree,
    required this.onBuyPremium,
    required this.onExplore,
  });

  final Map<String, dynamic> batch;
  final bool isEnrolled;
  final bool hasPremium;
  final bool busy;
  final VoidCallback onEnroll;
  final VoidCallback onAccessFree;
  final VoidCallback onBuyPremium;
  final VoidCallback onExplore;

  @override
  Widget build(BuildContext context) {
    final name = (batch['name'] ?? batch['batchName'] ?? 'Batch').toString();
    final description = (batch['description'] ?? '').toString().trim();
    final semester = (batch['semester'] ?? '-').toString();
    final price = (batch['price'] ?? 0).toString();
    final originalPrice = batch['originalPrice'];
    final isFree = batch['isFree'] == true;
    final hasOffer =
        originalPrice != null && originalPrice.toString().trim().isNotEmpty;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: hasPremium ? onExplore : null,
        borderRadius: BorderRadius.circular(26),
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 54,
                          height: 54,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(18),
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF3EEFF), Color(0xFFEAF7FF)],
                            ),
                          ),
                          child: const Icon(
                            Icons.auto_stories_rounded,
                            color: Color(0xFF6C3BFF),
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _SmallBadge(
                                label: 'Semester $semester',
                                bg: const Color(0xFFF3EEFF),
                                fg: const Color(0xFF6C3BFF),
                              ),
                              if (isFree)
                                const _SmallBadge(
                                  label: 'FREE',
                                  bg: Color(0xFFE8F8EE),
                                  fg: Color(0xFF22C55E),
                                ),
                              if (hasOffer && !isFree)
                                const _SmallBadge(
                                  label: 'SALE',
                                  bg: Color(0xFFFFF1E7),
                                  fg: Color(0xFFF97316),
                                ),
                              if (hasPremium)
                                const _SmallBadge(
                                  label: '🔓 PREMIUM',
                                  bg: Color(0xFFE8F8EE),
                                  fg: Color(0xFF169A65),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 17.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF151A29),
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      description.isEmpty
                          ? 'Open this batch to explore subjects, lectures, notes and tests.'
                          : description,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF737B90),
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Text(
                          isFree ? 'Free' : '₹$price',
                          style: GoogleFonts.inter(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF6C3BFF),
                          ),
                        ),
                        if (hasOffer && !isFree) ...[
                          const SizedBox(width: 8),
                          Text(
                            '₹$originalPrice',
                            style: GoogleFonts.inter(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF8B91A3),
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 14),
                    if (!isEnrolled)
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: _GradientButton(
                          label: 'Enroll Now',
                          loading: busy,
                          onTap: onEnroll,
                        ),
                      )
                    else if (hasPremium)
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: _GradientButton(
                          label: 'Explore',
                          loading: busy,
                          onTap: onExplore,
                        ),
                      )
                    else
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 44,
                              child: OutlinedButton(
                                onPressed: busy ? null : onAccessFree,
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF151A29),
                                  side: const BorderSide(
                                    color: Color(0xFFDCE0EB),
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                ),
                                child: Text(
                                  'Access Free',
                                  style: GoogleFonts.inter(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SizedBox(
                              height: 44,
                              child: _GradientButton(
                                label: 'Buy Premium',
                                loading: busy,
                                onTap: onBuyPremium,
                              ),
                            ),
                          ),
                        ],
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

class _GradientButton extends StatelessWidget {
  const _GradientButton({
    required this.label,
    required this.onTap,
    required this.loading,
  });

  final String label;
  final VoidCallback onTap;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: ElevatedButton(
        onPressed: loading ? null : onTap,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          disabledBackgroundColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: loading
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  color: Colors.white,
                ),
              )
            : Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 12.8,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
      ),
    );
  }
}

class _SmallBadge extends StatelessWidget {
  const _SmallBadge({required this.label, required this.bg, required this.fg});

  final String label;
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
        label,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: fg,
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
        4,
        (index) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          height: 230,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(26),
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.selectedSemester});

  final String selectedSemester;

  @override
  Widget build(BuildContext context) {
    final text = selectedSemester == 'All'
        ? 'No batches available right now'
        : 'No batches found for Semester $selectedSemester';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.menu_book_rounded,
            size: 40,
            color: Color(0xFF6C3BFF),
          ),
          const SizedBox(height: 10),
          Text(
            text,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF151A29),
            ),
          ),
        ],
      ),
    );
  }
}
