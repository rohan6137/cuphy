import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'subject_detail_screen.dart';

class BatchSubjectsScreen extends StatefulWidget {
  const BatchSubjectsScreen({super.key, required this.batchId});

  final String batchId;

  @override
  State<BatchSubjectsScreen> createState() => _BatchSubjectsScreenState();
}

class _BatchSubjectsScreenState extends State<BatchSubjectsScreen> {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  bool _loading = true;
  Map<String, dynamic>? _batch;
  List<Map<String, dynamic>> _subjects = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      setState(() => _loading = true);

      final batchSnap = await _db
          .collection('batches')
          .doc(widget.batchId)
          .get();

      if (!batchSnap.exists) {
        if (!mounted) return;
        setState(() {
          _batch = null;
          _subjects = [];
          _loading = false;
        });
        return;
      }

      final batch = {'id': batchSnap.id, ...batchSnap.data()!};

      if (batch['isVisible'] == false || batch['isActive'] == false) {
        if (!mounted) return;
        setState(() {
          _batch = null;
          _subjects = [];
          _loading = false;
        });
        return;
      }

      final subjectSnap = await _db
          .collection('subjects')
          .where('batchId', isEqualTo: widget.batchId)
          .where('isVisible', isEqualTo: true)
          .get();

      final subjects = subjectSnap.docs
          .map((doc) => {'id': doc.id, ...doc.data()})
          .toList();

      subjects.sort((a, b) {
        final aOrder = (a['order'] ?? 0) as num;
        final bOrder = (b['order'] ?? 0) as num;
        return aOrder.compareTo(bOrder);
      });

      if (!mounted) return;
      setState(() {
        _batch = batch;
        _subjects = subjects;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _batch = null;
        _subjects = [];
        _loading = false;
      });
    }
  }

  String _getSubjectName(Map<String, dynamic> subject) {
    final value =
        subject['subjectName'] ?? subject['name'] ?? subject['title'] ?? '';

    final text = value.toString().trim();
    return text.isEmpty ? 'Unnamed Subject' : text;
  }

  String _getSubjectDescription(Map<String, dynamic> subject) {
    return (subject['description'] ??
            subject['desc'] ??
            subject['subtitle'] ??
            '')
        .toString()
        .trim();
  }

  void _openSubject(Map<String, dynamic> subject) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SubjectDetailScreen(
          batchId: widget.batchId,
          subjectId: subject['id'].toString(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final batchName =
        (_batch?['name'] ?? _batch?['batchName'] ?? 'Batch Subjects')
            .toString();

    final semester = (_batch?['semester'] ?? '-').toString();

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6FB),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF6F6FB),
        surfaceTintColor: const Color(0xFFF6F6FB),
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          batchName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: GoogleFonts.inter(
            fontSize: 19,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF151A29),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 18),
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFFF8F7FF),
                    Color(0xFFF1EEFF),
                    Color(0xFFEAF7FF),
                  ],
                ),
                border: Border.all(color: const Color(0xFFE8EAF2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Semester $semester',
                    style: GoogleFonts.inter(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF6C3BFF),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Choose a subject',
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF151A29),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Open lectures, notes, PYQs and tests subject-wise.',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF6F768A),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            if (_loading)
              const _SubjectLoadingList()
            else if (_subjects.isEmpty)
              const _SubjectEmptyState()
            else
              ..._subjects.map(
                (subject) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _SubjectCard(
                    title: _getSubjectName(subject),
                    description: _getSubjectDescription(subject),
                    onTap: () => _openSubject(subject),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SubjectCard extends StatelessWidget {
  const _SubjectCard({
    required this.title,
    required this.description,
    required this.onTap,
  });

  final String title;
  final String description;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Ink(
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
                  color: const Color(0xFFF3EEFF),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(
                  Icons.auto_stories_rounded,
                  color: Color(0xFF6C3BFF),
                  size: 26,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 16.2,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF151A29),
                        height: 1.2,
                      ),
                    ),
                    if (description.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 12.8,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF6F768A),
                          height: 1.4,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.arrow_forward_ios_rounded,
                size: 16,
                color: Color(0xFF7C8193),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SubjectLoadingList extends StatelessWidget {
  const _SubjectLoadingList();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(
        5,
        (index) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          height: 88,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
          ),
        ),
      ),
    );
  }
}

class _SubjectEmptyState extends StatelessWidget {
  const _SubjectEmptyState();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.library_books_rounded,
            size: 40,
            color: Color(0xFF6C3BFF),
          ),
          const SizedBox(height: 10),
          Text(
            "No subjects available",
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
