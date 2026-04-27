import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'test_result_screen.dart';

class TestTakerScreen extends StatefulWidget {
  const TestTakerScreen({super.key, required this.testId});

  final String testId;

  @override
  State<TestTakerScreen> createState() => _TestTakerScreenState();
}

class _TestTakerScreenState extends State<TestTakerScreen> {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  Map<String, dynamic>? _test;
  List<Map<String, dynamic>> _questions = [];

  int _currentIndex = 0;
  int _timeLeft = 0;

  final Map<String, String> _answers = {};

  Timer? _timer;

  bool _loading = true;
  bool _started = false;
  bool _submitting = false;
  bool _submitted = false;

  int _score = 0;
  int _totalMarks = 0;
  double _percentage = 0;

  @override
  void initState() {
    super.initState();
    _loadTest();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadTest() async {
    try {
      final testSnap = await _db.collection('tests').doc(widget.testId).get();

      if (!testSnap.exists) {
        if (!mounted) return;
        setState(() => _loading = false);
        return;
      }

      final testData = {'id': testSnap.id, ...testSnap.data()!};

      final qSnap = await _db
          .collection('testQuestions')
          .where('testId', isEqualTo: widget.testId)
          .get();

      final qList = qSnap.docs.map((d) => {'id': d.id, ...d.data()}).toList();

      qList.sort((a, b) {
        final ao = (a['order'] ?? 0) as num;
        final bo = (b['order'] ?? 0) as num;
        return ao.compareTo(bo);
      });

      final duration = ((testData['durationMinutes'] ?? 30) as num).toInt();

      if (!mounted) return;
      setState(() {
        _test = testData;
        _questions = qList;
        _timeLeft = duration * 60;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  void _startTest() {
    if (_questions.isEmpty) return;

    setState(() => _started = true);

    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_timeLeft <= 1) {
        timer.cancel();
        _submitTest(autoSubmit: true);
      } else {
        if (mounted) {
          setState(() => _timeLeft--);
        }
      }
    });
  }

  Future<void> _submitTest({bool autoSubmit = false}) async {
    if (_submitting || _submitted || _test == null) return;

    setState(() => _submitting = true);
    _timer?.cancel();

    int score = 0;
    int correctCount = 0;

    final details = _questions.map((q) {
      final qId = q['id'].toString();
      final selected = _answers[qId];
      final correct = (q['correctOption'] ?? '').toString();
      final marks = ((q['marks'] ?? 1) as num).toInt();
      final isCorrect = selected == correct;

      if (isCorrect) {
        score += marks;
        correctCount++;
      }

      return {
        'questionId': qId,
        'questionText': (q['text'] ?? '').toString(),
        'selectedOption': selected,
        'correctOption': correct,
        'isCorrect': isCorrect,
        'explanation': (q['explanation'] ?? '').toString(),
        'marks': marks,
      };
    }).toList();

    final totalMarks = _questions.fold<int>(
      0,
      (sum, q) => sum + (((q['marks'] ?? 1) as num).toInt()),
    );

    final percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0.0;
    final user = _auth.currentUser;

    await _db.collection('testResults').add({
      'testId': _test!['id'],
      'testTitle': _test!['title'] ?? '',
      'userUid': user?.uid ?? '',
      'userPhone': user?.phoneNumber ?? '',
      'batchId': _test!['batchId'] ?? '',
      'subjectId': _test!['subjectId'] ?? '',
      'score': score,
      'totalMarks': totalMarks,
      'percentage': percentage,
      'correctCount': correctCount,
      'totalQuestions': _questions.length,
      'answers': _answers,
      'details': details,
      'createdAt': FieldValue.serverTimestamp(),
    });

    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => TestResultScreen(
          testTitle: _test!['title'] ?? '',
          score: score,
          totalMarks: totalMarks,
          percentage: percentage,
          details: details,
        ),
      ),
    );
  }

  String _formatTime(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Color get _primary => const Color(0xFF6C3BFF);
  Color get _cyan => const Color(0xFF00D4FF);
  Color get _dark => const Color(0xFF151A29);
  Color get _muted => const Color(0xFF6F768A);
  Color get _bg => const Color(0xFFF6F6FB);

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: _bg,
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_test == null) {
      return Scaffold(
        backgroundColor: _bg,
        appBar: AppBar(backgroundColor: _bg, elevation: 0),
        body: Center(
          child: Text(
            'Test not found',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700),
          ),
        ),
      );
    }

    if (!_started) return _instructionView();

    return _testTakingView();
  }

  Widget _instructionView() {
    final title = (_test?['title'] ?? 'Test').toString();
    final description = (_test?['description'] ?? '').toString();
    final duration = ((_test?['durationMinutes'] ?? 30) as num).toInt();
    final totalMarks = (_test?['totalMarks'] ?? 0).toString();
    final isPremium = _test?['isPremium'] == true;

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        surfaceTintColor: _bg,
        elevation: 0,
        title: Text(
          'Test Instructions',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: _dark,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
              ),
              borderRadius: BorderRadius.circular(26),
              boxShadow: [
                BoxShadow(
                  color: _primary.withOpacity(0.25),
                  blurRadius: 18,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _whitePill(isPremium ? 'Premium Test' : 'Free Test'),
                const SizedBox(height: 16),
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    height: 1.15,
                  ),
                ),
                if (description.trim().isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    description,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Colors.white.withOpacity(0.85),
                      height: 1.45,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _statCard(Icons.timer_rounded, '$duration min', 'Duration'),
              const SizedBox(width: 10),
              _statCard(
                Icons.quiz_rounded,
                '${_questions.length}',
                'Questions',
              ),
              const SizedBox(width: 10),
              _statCard(Icons.emoji_events_rounded, totalMarks, 'Marks'),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFE8EAF2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Before you start',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: _dark,
                  ),
                ),
                const SizedBox(height: 12),
                _rule('Timer starts immediately after pressing Start Test.'),
                _rule('Each question has four options.'),
                _rule(
                  'You can move between questions using the question palette.',
                ),
                _rule('The test auto-submits when time ends.'),
              ],
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 54,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: ElevatedButton.icon(
                onPressed: _questions.isEmpty ? null : _startTest,
                icon: const Icon(Icons.play_arrow_rounded),
                label: Text(
                  _questions.isEmpty ? 'No Questions Added' : 'Start Test',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _testTakingView() {
    final q = _questions[_currentIndex];
    final qId = q['id'].toString();
    final progress = (_currentIndex + 1) / _questions.length;
    final urgent = _timeLeft <= 60;

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        surfaceTintColor: _bg,
        elevation: 0,
        title: Text(
          'Question ${_currentIndex + 1}/${_questions.length}',
          style: GoogleFonts.inter(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: _dark,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: urgent ? const Color(0xFFFFE8E8) : Colors.white,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: urgent
                    ? const Color(0xFFFFB4B4)
                    : const Color(0xFFE8EAF2),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.timer_rounded,
                  size: 16,
                  color: urgent ? Colors.red : _primary,
                ),
                const SizedBox(width: 5),
                Text(
                  _formatTime(_timeLeft),
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: urgent ? Colors.red : _dark,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: const Color(0xFFE8EAF2),
                valueColor: AlwaysStoppedAnimation<Color>(_primary),
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              children: [
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFFE8EAF2)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 12,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Text(
                    '${_currentIndex + 1}. ${(q['text'] ?? '').toString()}',
                    style: GoogleFonts.inter(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: _dark,
                      height: 1.45,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                ...['A', 'B', 'C', 'D'].map((opt) {
                  final text = (q['option$opt'] ?? '').toString();
                  if (text.trim().isEmpty) return const SizedBox.shrink();

                  final selected = _answers[qId] == opt;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () {
                        setState(() {
                          _answers[qId] = opt;
                        });
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: selected
                              ? const Color(0xFFF3EEFF)
                              : Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: selected
                                ? _primary
                                : const Color(0xFFE8EAF2),
                            width: selected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 34,
                              height: 34,
                              decoration: BoxDecoration(
                                gradient: selected
                                    ? const LinearGradient(
                                        colors: [
                                          Color(0xFF6C3BFF),
                                          Color(0xFF00D4FF),
                                        ],
                                      )
                                    : null,
                                color: selected
                                    ? null
                                    : const Color(0xFFF7F8FC),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                opt,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                  color: selected ? Colors.white : _muted,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                text,
                                style: GoogleFonts.inter(
                                  fontSize: 14.5,
                                  fontWeight: FontWeight.w700,
                                  color: _dark,
                                  height: 1.35,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: List.generate(_questions.length, (index) {
                    final id = _questions[index]['id'].toString();
                    final active = index == _currentIndex;
                    final answered = _answers.containsKey(id);

                    return InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => setState(() => _currentIndex = index),
                      child: Container(
                        width: 36,
                        height: 36,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: active
                              ? _primary
                              : answered
                              ? const Color(0xFFE8F8EE)
                              : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: active
                                ? _primary
                                : answered
                                ? const Color(0xFF22C55E)
                                : const Color(0xFFE8EAF2),
                          ),
                        ),
                        child: Text(
                          '${index + 1}',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            color: active
                                ? Colors.white
                                : answered
                                ? const Color(0xFF22C55E)
                                : _muted,
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFE8EAF2))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _currentIndex > 0
                          ? () => setState(() => _currentIndex--)
                          : null,
                      icon: const Icon(Icons.arrow_back_rounded, size: 18),
                      label: const Text('Previous'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _currentIndex < _questions.length - 1
                          ? () => setState(() => _currentIndex++)
                          : () => _submitTest(),
                      icon: Icon(
                        _currentIndex < _questions.length - 1
                            ? Icons.arrow_forward_rounded
                            : Icons.check_circle_rounded,
                        size: 18,
                      ),
                      label: Text(
                        _currentIndex < _questions.length - 1
                            ? 'Next'
                            : _submitting
                            ? 'Submitting...'
                            : 'Submit',
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _primary,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: _primary.withOpacity(0.5),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _whitePill(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.18),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withOpacity(0.25)),
      ),
      child: Text(
        text,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _statCard(IconData icon, String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE8EAF2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: _primary, size: 22),
            const SizedBox(height: 8),
            Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: _dark,
              ),
            ),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: _muted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _rule(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.check_circle_rounded,
            size: 17,
            color: Color(0xFF22C55E),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: _muted,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _resultStat(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: _dark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: _muted,
            ),
          ),
        ],
      ),
    );
  }
}
