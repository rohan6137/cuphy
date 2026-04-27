import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../dashboard/presentation/dashboard_screen.dart';

import '../logic/auth_controller.dart';

enum AuthMode { login, signup, otpVerify, forgotPassword }

enum OtpFlow { signup, forgotPassword }

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final identifierController = TextEditingController();
  final passwordController = TextEditingController();
  final nameController = TextEditingController();
  final emailController = TextEditingController();
  final otpController = TextEditingController();

  AuthMode mode = AuthMode.login;
  OtpFlow? otpFlow;
  bool obscurePassword = true;

  String pendingName = '';
  String pendingPhone = '';
  String pendingEmail = '';
  String pendingPassword = '';
  String pendingForgotIdentifier = '';

  @override
  void dispose() {
    identifierController.dispose();
    passwordController.dispose();
    nameController.dispose();
    emailController.dispose();
    otpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authLoadingProvider);

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF17124D), Color(0xFF2E286D), Color(0xFFB9B0D6)],
            stops: [0.0, 0.48, 1.0],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 12),
                    const _BrandHeader(),
                    const SizedBox(height: 28),
                    Container(
                      padding: const EdgeInsets.fromLTRB(22, 24, 22, 18),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF7F7FB),
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.16),
                            blurRadius: 28,
                            offset: const Offset(0, 14),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Center(
                            child: Text(
                              _cardTitle(),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF1F1F26),
                                height: 1.1,
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          if (mode == AuthMode.login) _buildLogin(isLoading),
                          if (mode == AuthMode.signup) _buildSignup(isLoading),
                          if (mode == AuthMode.otpVerify) _buildOtp(isLoading),
                          if (mode == AuthMode.forgotPassword)
                            _buildForgot(isLoading),
                          const SizedBox(height: 6),
                          _buildFooter(),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _cardTitle() {
    switch (mode) {
      case AuthMode.login:
        return 'Student Login';
      case AuthMode.signup:
        return 'Create Account';
      case AuthMode.otpVerify:
        return otpFlow == OtpFlow.forgotPassword ? 'Verify OTP' : 'Verify OTP';
      case AuthMode.forgotPassword:
        return 'Forgot Password';
    }
  }

  Widget _buildLogin(bool isLoading) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Mobile Number or Email',
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w600,
            color: Color(0xFF20232B),
          ),
        ),
        const SizedBox(height: 8),
        _input(
          controller: identifierController,
          hint: '9876543210 or student@email.com',
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 18),
        const Text(
          'Password',
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w600,
            color: Color(0xFF20232B),
          ),
        ),
        const SizedBox(height: 8),
        _input(
          controller: passwordController,
          hint: '••••••••',
          isPassword: true,
        ),
        const SizedBox(height: 20),
        _primaryButton(
          'Student Sign In',
          onTap: _handleLogin,
          isLoading: isLoading,
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: isLoading
              ? null
              : () {
                  setState(() {
                    mode = AuthMode.forgotPassword;
                    otpController.clear();
                    otpFlow = null;
                  });
                },
          style: TextButton.styleFrom(
            foregroundColor: const Color(0xFF23242B),
            padding: const EdgeInsets.symmetric(vertical: 6),
          ),
          child: const Text(
            'Forgot Password?',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Color(0xFF23242B),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSignup(bool isLoading) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Full Name',
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w600,
            color: Color(0xFF20232B),
          ),
        ),
        const SizedBox(height: 8),
        _input(controller: nameController, hint: 'Enter your full name'),
        const SizedBox(height: 14),
        const Text(
          'Mobile Number',
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w600,
            color: Color(0xFF20232B),
          ),
        ),
        const SizedBox(height: 8),
        _input(
          controller: identifierController,
          hint: 'Enter mobile number',
          keyboardType: TextInputType.phone,
        ),
        const SizedBox(height: 14),
        const Text(
          'Email (optional)',
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w600,
            color: Color(0xFF20232B),
          ),
        ),
        const SizedBox(height: 8),
        _input(
          controller: emailController,
          hint: 'Enter linked email',
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 14),
        const Text(
          'Password',
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w600,
            color: Color(0xFF20232B),
          ),
        ),
        const SizedBox(height: 8),
        _input(
          controller: passwordController,
          hint: 'Create password',
          isPassword: true,
        ),
        const SizedBox(height: 20),
        _primaryButton('Send OTP', onTap: _handleSignup, isLoading: isLoading),
      ],
    );
  }

  Widget _buildOtp(bool isLoading) {
    final helperText = otpFlow == OtpFlow.signup
        ? 'Enter the OTP sent to your mobile number'
        : 'Enter the OTP sent for password recovery';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          helperText,
          style: const TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w500,
            color: Color(0xFF5D6477),
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Enter OTP',
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w600,
            color: Color(0xFF20232B),
          ),
        ),
        const SizedBox(height: 8),
        _otpInput(),
        const SizedBox(height: 20),
        _primaryButton('Verify OTP', onTap: _handleOtp, isLoading: isLoading),
      ],
    );
  }

  Widget _buildForgot(bool isLoading) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Mobile Number or Linked Email',
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w600,
            color: Color(0xFF20232B),
          ),
        ),
        const SizedBox(height: 8),
        _input(
          controller: identifierController,
          hint: 'Enter mobile number or email',
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 20),
        _primaryButton('Send OTP', onTap: _handleForgot, isLoading: isLoading),
      ],
    );
  }

  Widget _buildFooter() {
    switch (mode) {
      case AuthMode.login:
        return Column(
          children: [
            Divider(
              height: 24,
              color: const Color(0xFF1F1F26).withOpacity(0.10),
            ),
            TextButton(
              onPressed: () {
                setState(() {
                  mode = AuthMode.signup;
                  otpController.clear();
                  otpFlow = null;
                });
              },
              child: const Text(
                'Create Account',
                style: TextStyle(
                  color: Color(0xFF7C3AED),
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
          ],
        );

      case AuthMode.signup:
      case AuthMode.otpVerify:
      case AuthMode.forgotPassword:
        return TextButton(
          onPressed: () {
            setState(() {
              mode = AuthMode.login;
              otpController.clear();
              otpFlow = null;
            });
          },
          child: const Text(
            'Back to Login',
            style: TextStyle(
              color: Color(0xFF7C3AED),
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        );
    }
  }

  Widget _input({
    required TextEditingController controller,
    required String hint,
    bool isPassword = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: controller,
      obscureText: isPassword ? obscurePassword : false,
      keyboardType: keyboardType,
      style: const TextStyle(
        color: Color(0xFF20232B),
        fontSize: 15,
        fontWeight: FontWeight.w500,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(
          color: Color(0xFF8A8FA2),
          fontWeight: FontWeight.w400,
        ),
        filled: true,
        fillColor: const Color(0xFFF2F2F7),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 15,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFD5D8E2), width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF7C3AED), width: 1.4),
        ),
        suffixIcon: isPassword
            ? IconButton(
                onPressed: () {
                  setState(() {
                    obscurePassword = !obscurePassword;
                  });
                },
                icon: Icon(
                  obscurePassword ? Icons.visibility_off : Icons.visibility,
                  color: const Color(0xFF70758A),
                ),
              )
            : null,
      ),
    );
  }

  Widget _primaryButton(
    String text, {
    required VoidCallback onTap,
    required bool isLoading,
  }) {
    return SizedBox(
      height: 48,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: const LinearGradient(
            colors: [Color(0xFF7C3AED), Color(0xFF6D28D9)],
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF7C3AED).withOpacity(0.22),
              blurRadius: 14,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: isLoading ? null : onTap,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            disabledBackgroundColor: Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    color: Colors.white,
                  ),
                )
              : Text(
                  text,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
        ),
      ),
    );
  }

  Widget _otpInput() {
    return TextField(
      controller: otpController,
      keyboardType: TextInputType.number,
      maxLength: 6,
      textAlign: TextAlign.center,
      style: const TextStyle(
        color: Color(0xFF20232B),
        fontSize: 22,
        fontWeight: FontWeight.w700,
        letterSpacing: 10,
      ),
      decoration: InputDecoration(
        counterText: '',
        hintText: '------',
        hintStyle: const TextStyle(color: Color(0xFFC4C8D4), letterSpacing: 8),
        filled: true,
        fillColor: const Color(0xFFF2F2F7),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 18,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFD5D8E2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF7C3AED), width: 1.4),
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    final identifier = identifierController.text.trim();
    final password = passwordController.text.trim();

    if (identifier.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter mobile/email and password')),
      );
      return;
    }

    final controller = ref.read(authControllerProvider);

    final success = await controller.login(
      identifier: identifier,
      password: password,
    );

    if (!mounted) return;

    final error = ref.read(authErrorProvider);

    if (success) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Login successful')));
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error ?? 'Login failed')));
    }
  }

  Future<void> _handleSignup() async {
    final name = nameController.text.trim();
    final phone = identifierController.text.trim();
    final email = emailController.text.trim();
    final password = passwordController.text.trim();

    if (name.isEmpty || phone.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Fill all required fields')));
      return;
    }

    final success = await ref
        .read(authControllerProvider)
        .sendOtp(identifier: phone, forSignup: true, signupEmail: email);

    final error = ref.read(authErrorProvider);

    if (!mounted) return;

    if (success) {
      setState(() {
        pendingName = name;
        pendingPhone = phone;
        pendingEmail = email;
        pendingPassword = password;
        otpFlow = OtpFlow.signup;
        mode = AuthMode.otpVerify;
        otpController.clear();
      });

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('OTP sent successfully')));
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error ?? 'Failed to send OTP')));
    }
  }

  Future<void> _handleOtp() async {
    final otp = otpController.text.trim();

    if (otp.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid 6-digit OTP')),
      );
      return;
    }

    if (otpFlow == OtpFlow.signup) {
      final success = await ref
          .read(authControllerProvider)
          .completeSignupWithOtp(
            name: pendingName,
            phone: pendingPhone,
            password: pendingPassword,
            email: pendingEmail.isEmpty ? null : pendingEmail,
            otp: otp,
          );

      final error = ref.read(authErrorProvider);

      if (!mounted) return;

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Account created successfully')),
        );

        setState(() {
          mode = AuthMode.login;
          otpFlow = null;
          otpController.clear();
          identifierController.clear();
          passwordController.clear();
          nameController.clear();
          emailController.clear();
          pendingName = '';
          pendingPhone = '';
          pendingEmail = '';
          pendingPassword = '';
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error ?? 'OTP verification failed')),
        );
      }

      return;
    }

    if (otpFlow == OtpFlow.forgotPassword) {
      final success = await ref
          .read(authControllerProvider)
          .verifyOtpOnly(otp: otp);

      final error = ref.read(authErrorProvider);

      if (!mounted) return;

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'OTP verified. Please set a new password in Profile.',
            ),
          ),
        );

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const DashboardScreen()),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error ?? 'OTP verification failed')),
        );
      }
    }
  }

  Future<void> _handleForgot() async {
    final identifier = identifierController.text.trim();

    if (identifier.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter mobile number or linked email')),
      );
      return;
    }

    final success = await ref
        .read(authControllerProvider)
        .sendOtp(identifier: identifier);

    final error = ref.read(authErrorProvider);

    if (!mounted) return;

    if (success) {
      setState(() {
        pendingForgotIdentifier = identifier;
        otpFlow = OtpFlow.forgotPassword;
        mode = AuthMode.otpVerify;
        otpController.clear();
      });

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('OTP sent successfully')));
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error ?? 'Failed to send OTP')));
    }
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Image.asset('assets/images/cuphy_symbol.png', height: 84),
        const SizedBox(height: 12),
        Text(
          'CUPHY',
          style: GoogleFonts.inter(
            fontSize: 40,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.8,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Physics Made Powerful',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 15,
            color: Color(0xFFD4D0E4),
            fontWeight: FontWeight.w500,
            height: 1.1,
          ),
        ),
      ],
    );
  }
}
