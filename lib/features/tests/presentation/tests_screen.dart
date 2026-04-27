import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class TestsScreen extends StatelessWidget {
  const TestsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F6FB),
      body: SafeArea(
        top: false,
        child: Center(
          child: Text(
            'Tests screen coming next',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF151A29),
            ),
          ),
        ),
      ),
    );
  }
}
