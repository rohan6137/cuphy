import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../tests/presentation/test_taker_screen.dart';
import '../../lectures/presentation/lecture_player_screen.dart';

class SubjectDetailScreen extends StatefulWidget {
  const SubjectDetailScreen({
    super.key,
    required this.batchId,
    required this.subjectId,
  });

  final String batchId;
  final String subjectId;

  @override
  State<SubjectDetailScreen> createState() => _SubjectDetailScreenState();
}

class _SubjectDetailScreenState extends State<SubjectDetailScreen>
    with SingleTickerProviderStateMixin {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  bool _loading = true;

  Map<String, dynamic>? _batch;
  Map<String, dynamic>? _subject;

  List<Map<String, dynamic>> _lectures = [];
  List<Map<String, dynamic>> _notes = [];
  List<Map<String, dynamic>> _pyqs = [];
  List<Map<String, dynamic>> _tests = [];

  bool _isEnrolled = false;
  bool _hasPremium = false;

  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadSubjectData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadSubjectData() async {
    try {
      setState(() => _loading = true);

      final batchSnap = await _db
          .collection('batches')
          .doc(widget.batchId)
          .get();
      final subjectSnap = await _db
          .collection('subjects')
          .doc(widget.subjectId)
          .get();

      if (!batchSnap.exists || !subjectSnap.exists) {
        if (!mounted) return;
        setState(() {
          _batch = null;
          _subject = null;
          _loading = false;
        });
        return;
      }

      final batch = {'id': batchSnap.id, ...batchSnap.data()!};
      final subject = {'id': subjectSnap.id, ...subjectSnap.data()!};

      if (batch['isActive'] == false ||
          batch['isVisible'] == false ||
          subject['isVisible'] == false) {
        if (!mounted) return;
        setState(() {
          _batch = null;
          _subject = null;
          _loading = false;
        });
        return;
      }

      final lecturesSnap = await _db
          .collection('lectures')
          .where('batchId', isEqualTo: widget.batchId)
          .where('subjectId', isEqualTo: widget.subjectId)
          .get();

      final notesSnap = await _db
          .collection('notes')
          .where('batchId', isEqualTo: widget.batchId)
          .where('subjectId', isEqualTo: widget.subjectId)
          .get();

      final pyqSnap = await _db
          .collection('pyqs')
          .where('batchId', isEqualTo: widget.batchId)
          .where('subjectId', isEqualTo: widget.subjectId)
          .get();

      final testsSnap = await _db
          .collection('tests')
          .where('batchId', isEqualTo: widget.batchId)
          .where('subjectId', isEqualTo: widget.subjectId)
          .get();

      final lectures = lecturesSnap.docs
          .map((d) => {'id': d.id, ...d.data()})
          .where((i) => i['isVisible'] != false)
          .toList();

      final notes = notesSnap.docs
          .map((d) => {'id': d.id, ...d.data()})
          .where((i) => i['isVisible'] != false)
          .toList();

      final pyqs = pyqSnap.docs
          .map((d) => {'id': d.id, ...d.data()})
          .where((i) => i['isVisible'] != false)
          .toList();

      final tests = testsSnap.docs
          .map((d) => {'id': d.id, ...d.data()})
          .where((i) => i['isVisible'] != false)
          .toList();

      int byOrder(Map<String, dynamic> a, Map<String, dynamic> b) {
        final ao = (a['order'] ?? 0) as num;
        final bo = (b['order'] ?? 0) as num;
        return ao.compareTo(bo);
      }

      lectures.sort(byOrder);
      notes.sort(byOrder);
      pyqs.sort(byOrder);
      tests.sort(byOrder);

      await _loadAccess();

      if (!mounted) return;
      setState(() {
        _batch = batch;
        _subject = subject;
        _lectures = lectures;
        _notes = notes;
        _pyqs = pyqs;
        _tests = tests;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _batch = null;
        _subject = null;
        _lectures = [];
        _notes = [];
        _pyqs = [];
        _tests = [];
        _loading = false;
      });
    }
  }

  Future<void> _loadAccess() async {
    _isEnrolled = false;
    _hasPremium = false;

    final user = _auth.currentUser;
    if (user == null) return;

    final enrollmentMap = <String, Map<String, dynamic>>{};
    final subscriptionMap = <String, Map<String, dynamic>>{};

    try {
      final snap = await _db
          .collection('enrollments')
          .where('userUid', isEqualTo: user.uid)
          .where('batchId', isEqualTo: widget.batchId)
          .get();

      for (final doc in snap.docs) {
        enrollmentMap[doc.id] = {'id': doc.id, ...doc.data()};
      }
    } catch (_) {}

    try {
      final snap = await _db
          .collection('subscriptions')
          .where('userUid', isEqualTo: user.uid)
          .where('batchId', isEqualTo: widget.batchId)
          .get();

      for (final doc in snap.docs) {
        subscriptionMap[doc.id] = {'id': doc.id, ...doc.data()};
      }
    } catch (_) {}

    _isEnrolled = enrollmentMap.isNotEmpty;

    final now = DateTime.now();
    for (final sub in subscriptionMap.values) {
      if (sub['active'] != true) continue;

      final expiryRaw = sub['expiryDate'];
      if (expiryRaw == null) {
        _hasPremium = true;
        break;
      }

      DateTime? expiry;
      if (expiryRaw is Timestamp) {
        expiry = expiryRaw.toDate();
      } else {
        expiry = DateTime.tryParse(expiryRaw.toString());
      }

      if (expiry == null || !expiry.isBefore(now)) {
        _hasPremium = true;
        break;
      }
    }
  }

  bool _isItemFree(Map<String, dynamic> item) {
    if (item['isFree'] == true) return true;
    if (item['isPremium'] == true) return false;
    if (item['isFree'] == false) return false;
    return true;
  }

  String _getFileUrl(Map<String, dynamic> item) {
    final candidates = [
      item['fileUrl'],
      item['pdfUrl'],
      item['url'],
      item['link'],
      item['driveUrl'],
      item['downloadUrl'],
    ];

    for (final raw in candidates) {
      final value = (raw ?? '').toString().trim();
      if (value.isNotEmpty) return value;
    }

    return '';
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.tryParse(url);

    if (uri == null || !uri.hasScheme) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invalid file link'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);

    if (!opened && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to open file'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _openItem(String label, Map<String, dynamic> item) async {
    final title = (item['title'] ?? item['name'] ?? label).toString();
    final isFree = _isItemFree(item);

    if (!isFree) {
      if (!_isEnrolled) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Enroll in this batch to continue'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      if (!_hasPremium) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Buy premium to unlock this content'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }
    }

    if (label == 'Lecture') {
      final index = _lectures.indexWhere((e) => e['id'] == item['id']);
      if (index == -1) return;

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => LecturePlayerScreen(
            lectures: _lectures,
            initialIndex: index,
            subjectName:
                (_subject?['subjectName'] ??
                        _subject?['name'] ??
                        _subject?['title'] ??
                        '')
                    .toString(),
            batchName: (_batch?['name'] ?? _batch?['batchName'] ?? '')
                .toString(),
            heroTag: 'lecture_${item['id']}',
          ),
        ),
      );
      return;
    }

    if (label == 'Note' || label == 'PYQ') {
      final fileUrl = _getFileUrl(item);

      if (fileUrl.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$title file link is missing'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      await _openUrl(fileUrl);
      return;
    }

    if (label == 'Test') {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => TestTakerScreen(testId: item['id'])),
      );
      return;
    }
  }

  Widget _buildTab(String title, int count) {
    return Tab(
      height: 40,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(title),
            const SizedBox(width: 4),
            Text('($count)', style: const TextStyle(fontSize: 10.5)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final subjectNameRaw =
        _subject?['subjectName'] ??
        _subject?['name'] ??
        _subject?['title'] ??
        '';

    final subjectName = subjectNameRaw.toString().trim().isEmpty
        ? 'Subject'
        : subjectNameRaw.toString().trim();

    final batchName = (_batch?['name'] ?? _batch?['batchName'] ?? '')
        .toString();

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6FB),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF6F6FB),
        surfaceTintColor: const Color(0xFFF6F6FB),
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 12,
        title: Text(
          subjectName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.inter(
            fontSize: 19,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF151A29),
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _subject == null || _batch == null
          ? Center(
              child: Text(
                'Subject not found',
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF151A29),
                ),
              ),
            )
          : Column(
              children: [
                if (batchName.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.school_rounded,
                          size: 14,
                          color: Color(0xFF6C3BFF),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            batchName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF6F768A),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE8EAF2)),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicatorSize: TabBarIndicatorSize.tab,
                      dividerColor: Colors.transparent,
                      labelColor: Colors.white,
                      unselectedLabelColor: const Color(0xFF6F768A),
                      labelStyle: GoogleFonts.inter(
                        fontSize: 12.4,
                        fontWeight: FontWeight.w700,
                      ),
                      unselectedLabelStyle: GoogleFonts.inter(
                        fontSize: 12.2,
                        fontWeight: FontWeight.w600,
                      ),
                      indicator: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        gradient: const LinearGradient(
                          colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
                        ),
                      ),
                      tabs: [
                        _buildTab('Lectures', _lectures.length),
                        _buildTab('Notes', _notes.length),
                        _buildTab('PYQ', _pyqs.length),
                        _buildTab('Tests', _tests.length),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _LectureList(
                        items: _lectures,
                        hasPremium: _hasPremium,
                        isItemFree: _isItemFree,
                        onTap: (item) => _openItem('Lecture', item),
                      ),
                      _ContentList(
                        emptyText: 'No notes available',
                        items: _notes,
                        icon: Icons.description_outlined,
                        actionIcon: Icons.open_in_new_rounded,
                        hasPremium: _hasPremium,
                        isItemFree: _isItemFree,
                        onTap: (item) => _openItem('Note', item),
                      ),
                      _ContentList(
                        emptyText: 'No PYQs available',
                        items: _pyqs,
                        icon: Icons.quiz_outlined,
                        actionIcon: Icons.open_in_new_rounded,
                        hasPremium: _hasPremium,
                        isItemFree: _isItemFree,
                        onTap: (item) => _openItem('PYQ', item),
                      ),
                      _ContentList(
                        emptyText: 'No tests available',
                        items: _tests,
                        icon: Icons.assignment_outlined,
                        actionIcon: Icons.arrow_forward_rounded,
                        hasPremium: _hasPremium,
                        isItemFree: _isItemFree,
                        onTap: (item) => _openItem('Test', item),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _LectureList extends StatelessWidget {
  const _LectureList({
    required this.items,
    required this.hasPremium,
    required this.isItemFree,
    required this.onTap,
  });

  final List<Map<String, dynamic>> items;
  final bool hasPremium;
  final bool Function(Map<String, dynamic>) isItemFree;
  final ValueChanged<Map<String, dynamic>> onTap;

  String? _extractYoutubeId(String? url) {
    if (url == null || url.trim().isEmpty) return null;

    final uri = Uri.tryParse(url.trim());
    if (uri == null) return null;

    if (uri.host.contains('youtu.be') && uri.pathSegments.isNotEmpty) {
      return uri.pathSegments.first;
    }

    if (uri.queryParameters.containsKey('v')) {
      return uri.queryParameters['v'];
    }

    final segments = uri.pathSegments;

    final embedIndex = segments.indexOf('embed');
    if (embedIndex != -1 && embedIndex + 1 < segments.length) {
      return segments[embedIndex + 1];
    }

    final shortsIndex = segments.indexOf('shorts');
    if (shortsIndex != -1 && shortsIndex + 1 < segments.length) {
      return segments[shortsIndex + 1];
    }

    return null;
  }

  String? _thumbnailFromLecture(Map<String, dynamic> item) {
    final directId = (item['youtubeVideoId'] ?? '').toString().trim();
    if (directId.isNotEmpty) {
      return 'https://img.youtube.com/vi/$directId/hqdefault.jpg';
    }

    final candidates = [
      item['videoUrl'],
      item['youtubeUrl'],
      item['url'],
      item['link'],
      item['embedUrl'],
    ];

    for (final candidate in candidates) {
      final id = _extractYoutubeId(candidate?.toString());
      if (id != null && id.isNotEmpty) {
        return 'https://img.youtube.com/vi/$id/hqdefault.jpg';
      }
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const _EmptyBox(text: 'No lectures available');
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 18),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final item = items[index];
        final title = (item['title'] ?? item['name'] ?? 'Lecture').toString();
        final description = (item['description'] ?? '').toString().trim();
        final duration = (item['duration'] ?? '').toString().trim();
        final isFree = isItemFree(item);
        final isUnlocked = isFree || hasPremium;
        final heroTag = 'lecture_${item['id']}';

        return InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: () => onTap(item),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFE8EAF2)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 10,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              children: [
                Hero(
                  tag: heroTag,
                  child: Material(
                    color: Colors.transparent,
                    child: _LectureThumbnail(
                      thumbnailUrl: _thumbnailFromLecture(item),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _StatusBadge(
                              isFree: isFree,
                              isUnlocked: isUnlocked,
                            ),
                            if (duration.isNotEmpty) _SmallPill(text: duration),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 15.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF151A29),
                          ),
                        ),
                        if (description.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(
                            description,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 12.5,
                              color: const Color(0xFF6F768A),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                Container(
                  margin: const EdgeInsets.only(right: 12),
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: isUnlocked
                        ? const LinearGradient(
                            colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
                          )
                        : const LinearGradient(
                            colors: [Color(0xFF1F2937), Color(0xFF111827)],
                          ),
                  ),
                  child: Icon(
                    isUnlocked ? Icons.play_arrow_rounded : Icons.lock_rounded,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _LectureThumbnail extends StatelessWidget {
  const _LectureThumbnail({required this.thumbnailUrl});

  final String? thumbnailUrl;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      height: 95,
      margin: const EdgeInsets.only(left: 12, top: 12, bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.antiAlias,
      child: thumbnailUrl != null
          ? Image.network(
              thumbnailUrl!,
              fit: BoxFit.cover,
              alignment: Alignment.center,
              errorBuilder: (_, __, ___) => _fallback(),
            )
          : _fallback(),
    );
  }

  Widget _fallback() {
    return Container(
      color: const Color(0xFFF3EEFF),
      alignment: Alignment.center,
      child: const Icon(
        Icons.play_circle_outline_rounded,
        size: 40,
        color: Color(0xFF6C3BFF),
      ),
    );
  }
}

class _ContentList extends StatelessWidget {
  const _ContentList({
    required this.emptyText,
    required this.items,
    required this.icon,
    required this.actionIcon,
    required this.hasPremium,
    required this.isItemFree,
    required this.onTap,
  });

  final String emptyText;
  final List<Map<String, dynamic>> items;
  final IconData icon;
  final IconData actionIcon;
  final bool hasPremium;
  final bool Function(Map<String, dynamic>) isItemFree;
  final ValueChanged<Map<String, dynamic>> onTap;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return _EmptyBox(text: emptyText);
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 18),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final item = items[index];
        final title = (item['title'] ?? item['name'] ?? 'Item').toString();
        final description = (item['description'] ?? '').toString().trim();
        final year = (item['year'] ?? '').toString().trim();
        final free = isItemFree(item);
        final unlocked = free || hasPremium;

        return Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => onTap(item),
            child: Ink(
              padding: const EdgeInsets.all(15),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE8EAF2)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.035),
                    blurRadius: 10,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFF3EEFF), Color(0xFFEAF7FF)],
                      ),
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: Icon(icon, color: const Color(0xFF6C3BFF), size: 23),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _StatusBadge(isFree: free, isUnlocked: unlocked),
                            if (year.isNotEmpty) _SmallPill(text: year),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 14.8,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF151A29),
                            height: 1.25,
                          ),
                        ),
                        if (description.isNotEmpty) ...[
                          const SizedBox(height: 5),
                          Text(
                            description,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 12.4,
                              fontWeight: FontWeight.w500,
                              color: const Color(0xFF6F768A),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      gradient: unlocked
                          ? const LinearGradient(
                              colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
                            )
                          : const LinearGradient(
                              colors: [Color(0xFF1F2937), Color(0xFF111827)],
                            ),
                    ),
                    child: Icon(
                      unlocked ? actionIcon : Icons.lock_rounded,
                      size: 20,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.isFree, required this.isUnlocked});

  final bool isFree;
  final bool isUnlocked;

  @override
  Widget build(BuildContext context) {
    final label = isFree
        ? 'Free'
        : isUnlocked
        ? 'Unlocked'
        : 'Premium';

    final bg = isFree
        ? const Color(0xFFE8F8EE)
        : isUnlocked
        ? const Color(0xFFE7F0FF)
        : const Color(0xFFFFF1E7);

    final fg = isFree
        ? const Color(0xFF22C55E)
        : isUnlocked
        ? const Color(0xFF3B82F6)
        : const Color(0xFFF97316);

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
          fontWeight: FontWeight.w800,
          color: fg,
        ),
      ),
    );
  }
}

class _SmallPill extends StatelessWidget {
  const _SmallPill({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F8FC),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF667085),
        ),
      ),
    );
  }
}

class _EmptyBox extends StatelessWidget {
  const _EmptyBox({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(12, 0, 12, 18),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: const Color(0xFFE8EAF2)),
          ),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF737B90),
            ),
          ),
        ),
      ],
    );
  }
}
