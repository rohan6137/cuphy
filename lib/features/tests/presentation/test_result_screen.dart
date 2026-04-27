import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TestResultScreen extends StatelessWidget {
  const TestResultScreen({
    super.key,
    required this.testTitle,
    required this.score,
    required this.totalMarks,
    required this.percentage,
    required this.details,
  });

  final String testTitle;
  final int score;
  final int totalMarks;
  final double percentage;
  final List<dynamic> details;

  Color get _bg => const Color(0xFFF6F6FB);
  Color get _dark => const Color(0xFF151A29);
  Color get _muted => const Color(0xFF6F768A);

  @override
  Widget build(BuildContext context) {
    final passed = percentage >= 60;

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _bg,
        surfaceTintColor: _bg,
        elevation: 0,
        title: Text(
          'Result Review',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: _dark,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(26),
              border: Border.all(
                color: passed
                    ? const Color(0xFF22C55E)
                    : const Color(0xFFF97316),
                width: 1.4,
              ),
            ),
            child: Column(
              children: [
                Icon(
                  passed
                      ? Icons.check_circle_rounded
                      : Icons.trending_up_rounded,
                  size: 58,
                  color: passed
                      ? const Color(0xFF22C55E)
                      : const Color(0xFFF97316),
                ),
                const SizedBox(height: 12),
                Text(
                  passed ? 'Well Done!' : 'Keep Practicing!',
                  style: GoogleFonts.inter(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: _dark,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  testTitle,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: _muted,
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    _resultStat('Score', '$score'),
                    _resultStat('Total', '$totalMarks'),
                    _resultStat('Percent', '${percentage.toStringAsFixed(1)}%'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Answer Review',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: _dark,
            ),
          ),
          const SizedBox(height: 12),
          ...details.asMap().entries.map((entry) {
            final index = entry.key;
            final d = entry.value as Map<String, dynamic>;
            final isCorrect = d['isCorrect'] == true;

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(15),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isCorrect
                      ? const Color(0xFF22C55E)
                      : const Color(0xFFEF4444),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${index + 1}. ${d['questionText'] ?? ''}',
                    style: GoogleFonts.inter(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800,
                      color: _dark,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Your answer: ${d['selectedOption'] ?? 'Not answered'}',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: isCorrect
                          ? const Color(0xFF22C55E)
                          : const Color(0xFFEF4444),
                    ),
                  ),
                  if (!isCorrect) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Correct answer: ${d['correctOption'] ?? ''}',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF22C55E),
                      ),
                    ),
                  ],
                  if ((d['explanation'] ?? '')
                      .toString()
                      .trim()
                      .isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      d['explanation'].toString(),
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        color: _muted,
                        height: 1.4,
                      ),
                    ),
                  ],
                ],
              ),
            );
          }),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6C3BFF),
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(50),
            ),
            child: const Text('Back to Subject'),
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
