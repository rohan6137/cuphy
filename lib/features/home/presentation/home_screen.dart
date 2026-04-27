import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../batches/presentation/batches_screen.dart';
import '../../dashboard/presentation/dashboard_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with AutomaticKeepAliveClientMixin {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  bool _loading = true;
  List<Map<String, dynamic>> _notices = [];

  final ScrollController _noticeScrollController = ScrollController();
  Timer? _noticeTimer;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadHomeData();
  }

  @override
  void dispose() {
    _noticeTimer?.cancel();
    _noticeScrollController.dispose();
    super.dispose();
  }

  Future<void> _loadHomeData() async {
    try {
      if (_notices.isEmpty) {
        setState(() {
          _loading = true;
        });
      }
      List<Map<String, dynamic>> notices = [];

      try {
        final noticeSnap = await _db.collection('notices').get();

        notices = noticeSnap.docs
            .map((doc) => {'id': doc.id, ...doc.data()})
            .where((notice) {
              if (notice['isVisible'] == false) return false;
              if (notice['type'] != null && notice['type'] != 'notice') {
                return false;
              }
              return true;
            })
            .toList();
      } catch (_) {}

      if (!mounted) return;

      setState(() {
        _notices = notices;
        _loading = false;
      });

      _startNoticeMarquee();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _notices = [];
        _loading = false;
      });
    }
  }

  void _startNoticeMarquee() {
    _noticeTimer?.cancel();

    if (_notices.isEmpty) return;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_noticeScrollController.hasClients) return;

      _noticeTimer = Timer.periodic(const Duration(milliseconds: 40), (timer) {
        if (!mounted || !_noticeScrollController.hasClients) return;

        final max = _noticeScrollController.position.maxScrollExtent;
        final current = _noticeScrollController.offset;
        double next = current + 1.0;

        if (next >= max) {
          next = 0;
        }

        _noticeScrollController.jumpTo(next);
      });
    });
  }

  String get _noticeText {
    final parts = _notices
        .map((n) => (n['title'] ?? '').toString().trim())
        .where((t) => t.isNotEmpty)
        .toList();

    if (parts.isEmpty) return '';
    return '${parts.join('   •   ')}   •   ${parts.join('   •   ')}';
  }

  void _openBatches() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const BatchesScreen()),
    );
  }

  void _openMyBatches() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const DashboardScreen()),
    );
  }

  void _comingSoon(String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label will open from your enrolled batch'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6FB),
      body: RefreshIndicator(
        onRefresh: _loadHomeData,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(12, 6, 12, 18),
          children: [
            if (_notices.isNotEmpty) ...[
              _NoticeTicker(
                controller: _noticeScrollController,
                text: _noticeText,
              ),
              const SizedBox(height: 12),
            ],
            _CompactHeroCard(onExplore: _openBatches),
            const SizedBox(height: 14),
            const _SectionTitle(
              title: 'Learning Contents',
              subtitle: 'Premium study tools inside every enrolled batch',
            ),
            const SizedBox(height: 10),
            _PremiumContentGrid(
              onLectures: () => _comingSoon('Lectures'),
              onNotes: () => _comingSoon('Notes'),
              onTests: () => _comingSoon('Tests'),
              onPyq: () => _comingSoon('PYQ'),
            ),
            const SizedBox(height: 14),
            const _SectionTitle(
              title: 'Why Students Like CUPHY',
              subtitle: 'Made for focused and affordable learning',
            ),
            const SizedBox(height: 10),
            const _MiniHighlights(),
            const SizedBox(height: 14),
            _BottomCtaCard(onTap: _openMyBatches),
          ],
        ),
      ),
    );
  }
}

class _NoticeTicker extends StatelessWidget {
  const _NoticeTicker({required this.controller, required this.text});

  final ScrollController controller;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 40,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF7C3AED), Color(0xFF8B5CF6)],
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.16),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              'NOTICE',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: ListView(
              controller: controller,
              scrollDirection: Axis.horizontal,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 10),
                    child: Text(
                      text,
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
    );
  }
}

class _CompactHeroCard extends StatelessWidget {
  const _CompactHeroCard({required this.onExplore});

  final VoidCallback onExplore;

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
            color: const Color(0xFF17124D).withOpacity(0.18),
            blurRadius: 22,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0xFF7C3AED).withOpacity(0.20),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: const Color(0xFF8B5CF6).withOpacity(0.30),
              ),
            ),
            child: Text(
              'For CU Physics Honours Students',
              style: GoogleFonts.inter(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: const Color(0xFFB59AFF),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'CUPHY',
            style: GoogleFonts.inter(
              fontSize: 34,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -1.1,
              height: 1,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Physics Made Powerful',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Video lectures, notes, tests, and semester-wise learning in one premium student app.',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Colors.white.withOpacity(0.78),
              height: 1.55,
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 46,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF6C3BFF).withOpacity(0.24),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: onExplore,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  'Explore Batches',
                  style: GoogleFonts.inter(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
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
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: GoogleFonts.inter(
              fontSize: 13.5,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF737B90),
            ),
          ),
        ],
      ),
    );
  }
}

class _PremiumContentGrid extends StatelessWidget {
  const _PremiumContentGrid({
    required this.onLectures,
    required this.onNotes,
    required this.onTests,
    required this.onPyq,
  });

  final VoidCallback onLectures;
  final VoidCallback onNotes;
  final VoidCallback onTests;
  final VoidCallback onPyq;

  @override
  Widget build(BuildContext context) {
    final items = [
      _PremiumContentItem(
        title: 'Lectures',
        subtitle: 'HD concept videos',
        tag: 'Watch',
        icon: Icons.play_circle_fill_rounded,
        gradient: const [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
        onTap: onLectures,
      ),
      _PremiumContentItem(
        title: 'Notes',
        subtitle: 'Clean study PDFs',
        tag: 'Read',
        icon: Icons.description_rounded,
        gradient: const [Color(0xFF7C3AED), Color(0xFFA78BFA)],
        onTap: onNotes,
      ),
      _PremiumContentItem(
        title: 'Tests',
        subtitle: 'Timed practice',
        tag: 'Practice',
        icon: Icons.assignment_turned_in_rounded,
        gradient: const [Color(0xFF0EA5E9), Color(0xFF22C55E)],
        onTap: onTests,
      ),
      _PremiumContentItem(
        title: 'PYQ',
        subtitle: 'Previous year questions',
        tag: 'Revise',
        icon: Icons.history_edu_rounded,
        gradient: const [Color(0xFFF97316), Color(0xFFEC4899)],
        onTap: onPyq,
      ),
    ];

    return GridView.builder(
      itemCount: items.length,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 0.98,
      ),
      itemBuilder: (context, index) {
        return _PremiumContentCard(item: items[index]);
      },
    );
  }
}

class _PremiumContentItem {
  final String title;
  final String subtitle;
  final String tag;
  final IconData icon;
  final List<Color> gradient;
  final VoidCallback onTap;

  _PremiumContentItem({
    required this.title,
    required this.subtitle,
    required this.tag,
    required this.icon,
    required this.gradient,
    required this.onTap,
  });
}

class _PremiumContentCard extends StatelessWidget {
  const _PremiumContentCard({required this.item});

  final _PremiumContentItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: item.gradient,
        ),
        boxShadow: [
          BoxShadow(
            color: item.gradient.first.withOpacity(0.22),
            blurRadius: 18,
            offset: const Offset(0, 9),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            bottom: -24,
            child: Icon(
              item.icon,
              size: 96,
              color: Colors.white.withOpacity(0.13),
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withOpacity(0.18)),
                    ),
                    child: Icon(item.icon, color: Colors.white, size: 24),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 5,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      item.tag,
                      style: GoogleFonts.inter(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Text(
                item.title,
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                item.subtitle,
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: Colors.white.withOpacity(0.82),
                  height: 1.35,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniHighlights extends StatelessWidget {
  const _MiniHighlights();

  @override
  Widget build(BuildContext context) {
    final items = [
      (
        icon: Icons.workspace_premium_outlined,
        title: 'Premium Feel',
        text: 'Clean UI with focused learning flow',
      ),
      (
        icon: Icons.school_outlined,
        title: 'Semester-wise',
        text: 'Content stays organized and easy to follow',
      ),
      (
        icon: Icons.timer_outlined,
        title: 'Save Time',
        text: 'Important materials available quickly',
      ),
    ];

    return Column(
      children: items
          .map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE9E9F2)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF3EEFF),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        item.icon,
                        color: const Color(0xFF6C3BFF),
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.title,
                            style: GoogleFonts.inter(
                              fontSize: 14.8,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF151A29),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item.text,
                            style: GoogleFonts.inter(
                              fontSize: 12.8,
                              fontWeight: FontWeight.w500,
                              color: const Color(0xFF737B90),
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _BottomCtaCard extends StatelessWidget {
  const _BottomCtaCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 20, 18, 20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF201658), Color(0xFF6C3BFF)],
        ),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.verified_user_outlined,
            color: Color(0xFFB59AFF),
            size: 34,
          ),
          const SizedBox(height: 12),
          Text(
            'Start Learning Smarter',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Open your enrolled batches and continue lectures, notes, tests, and PYQs from one clean study space.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13.8,
              fontWeight: FontWeight.w500,
              color: Colors.white.withOpacity(0.76),
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 46,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
                ),
              ),
              child: ElevatedButton(
                onPressed: onTap,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  'Get Started',
                  style: GoogleFonts.inter(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
