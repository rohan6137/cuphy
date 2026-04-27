import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../auth/logic/auth_controller.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();

  bool _editing = false;
  bool _saving = false;
  int? _semester;
  String _profilePicture = '';

  User? get firebaseUser => FirebaseAuth.instance.currentUser;

  DocumentReference<Map<String, dynamic>>? get userRef {
    final uid = firebaseUser?.uid;
    if (uid == null) return null;
    return FirebaseFirestore.instance.collection('users').doc(uid);
  }

  final List<String> _avatars = List.generate(
    8,
    (index) =>
        'https://api.dicebear.com/7.x/adventurer/png?seed=Physics${index + 1}',
  );

  void _fillForm(Map<String, dynamic> data) {
    _nameController.text = data['fullName'] ?? data['name'] ?? '';
    _phoneController.text = data['phone'] ?? firebaseUser?.phoneNumber ?? '';
    _emailController.text = data['email'] ?? firebaseUser?.email ?? '';
    _semester = data['semester'] is int ? data['semester'] : null;
    _profilePicture = data['profilePicture'] ?? '';
  }

  Future<void> _saveProfile() async {
    final refDoc = userRef;
    final currentUid = firebaseUser?.uid;
    if (refDoc == null || currentUid == null) return;

    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    final email = _emailController.text.trim().toLowerCase();

    if (name.isEmpty || phone.isEmpty) {
      _showSnack('Name and phone are required');
      return;
    }

    setState(() => _saving = true);

    try {
      if (email.isNotEmpty) {
        final emailQuery = await FirebaseFirestore.instance
            .collection('users')
            .where('email', isEqualTo: email)
            .limit(1)
            .get();

        if (emailQuery.docs.isNotEmpty &&
            emailQuery.docs.first.id != currentUid) {
          _showSnack('This email is already linked with another account');
          return;
        }
      }

      await refDoc.set({
        'fullName': name,
        'phone': phone,
        'email': email,
        'semester': _semester,
        'profilePicture': _profilePicture,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      setState(() => _editing = false);
      _showSnack('Profile updated successfully');
    } catch (e) {
      _showSnack('Unable to update profile');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _confirmLogout() async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return Container(
          margin: const EdgeInsets.all(14),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(26),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.logout_rounded,
                size: 38,
                color: Color(0xFFFF3B30),
              ),
              const SizedBox(height: 12),
              Text(
                'Logout from CUPHY?',
                style: GoogleFonts.inter(
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF151A29),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'You can login again anytime using your mobile/email and password.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: const Color(0xFF7C8193),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFF3B30),
                      ),
                      child: const Text(
                        'Logout',
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );

    if (result == true) {
      await ref.read(authControllerProvider).logout();
      if (mounted) Navigator.pop(context);
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final refDoc = userRef;
    final mustSetPassword = ref.watch(mustSetPasswordProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6FB),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF6F6FB),
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF151A29)),
        title: Text(
          'My Profile',
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF151A29),
          ),
        ),
      ),
      body: refDoc == null
          ? const Center(child: Text('User not logged in'))
          : StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
              stream: refDoc.snapshots(),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }

                final data = snapshot.data!.data() ?? {};

                if (!_editing && !_saving) {
                  _fillForm(data);
                }

                final displayName = _nameController.text.trim().isEmpty
                    ? 'Student'
                    : _nameController.text.trim();
                final role = data['role'] ?? 'student';
                final isActive = data['isActive'] != false;

                return ListView(
                  padding: const EdgeInsets.all(14),
                  children: [
                    _ProfileHero(
                      name: displayName,
                      phone: _phoneController.text,
                      email: _emailController.text,
                      image: _profilePicture,
                      role: role,
                      semester: _semester,
                    ),
                    const SizedBox(height: 14),
                    _InfoCard(
                      title: 'Account Status',
                      children: [
                        _StatusRow(
                          label: 'Account Type',
                          value: role.toString(),
                        ),
                        _StatusRow(
                          label: 'Status',
                          value: isActive ? 'Active' : 'Inactive',
                          valueColor: isActive ? Colors.green : Colors.red,
                        ),
                        const _StatusRow(
                          label: 'Premium Identity',
                          value: 'CUPHY Student',
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    _EditCard(
                      editing: _editing,
                      saving: _saving,
                      nameController: _nameController,
                      phoneController: _phoneController,
                      emailController: _emailController,
                      semester: _semester,
                      onSemesterChanged: (v) => setState(() => _semester = v),
                      onEditToggle: () {
                        setState(() {
                          if (_editing) _fillForm(data);
                          _editing = !_editing;
                        });
                      },
                      onSave: _saveProfile,
                    ),
                    const SizedBox(height: 14),
                    _AvatarCard(
                      editing: _editing,
                      avatars: _avatars,
                      selected: _profilePicture,
                      onSelect: (value) =>
                          setState(() => _profilePicture = value),
                    ),
                    const SizedBox(height: 14),
                    _SecurityCard(
                      onLogout: _confirmLogout,
                      mustSetPassword: mustSetPassword,
                      onPasswordSet: () {
                        ref.read(mustSetPasswordProvider.notifier).state =
                            false;
                      },
                    ),
                    const SizedBox(height: 24),
                  ],
                );
              },
            ),
    );
  }
}

class _ProfileHero extends StatelessWidget {
  const _ProfileHero({
    required this.name,
    required this.phone,
    required this.email,
    required this.image,
    required this.role,
    required this.semester,
  });

  final String name;
  final String phone;
  final String email;
  final String image;
  final String role;
  final int? semester;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6C3BFF).withOpacity(0.22),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 38,
            backgroundColor: Colors.white,
            backgroundImage: image.isNotEmpty ? NetworkImage(image) : null,
            child: image.isEmpty
                ? Text(
                    name[0].toUpperCase(),
                    style: GoogleFonts.inter(
                      fontSize: 30,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF6C3BFF),
                    ),
                  )
                : null,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 21,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  phone.isEmpty ? 'Mobile not added' : phone,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withOpacity(0.9),
                  ),
                ),
                if (email.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    email,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: Colors.white.withOpacity(0.85),
                    ),
                  ),
                ],
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  children: [
                    _HeroBadge(text: role),
                    if (semester != null) _HeroBadge(text: 'Sem $semester'),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroBadge extends StatelessWidget {
  const _HeroBadge({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        text.toUpperCase(),
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: Colors.white,
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return _WhiteCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionTitle(icon: Icons.verified_user_rounded, title: title),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({
    required this.label,
    required this.value,
    this.valueColor = const Color(0xFF151A29),
  });

  final String label;
  final String value;
  final Color valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 11),
      child: Row(
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 13,
              color: const Color(0xFF7C8193),
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }
}

class _EditCard extends StatelessWidget {
  const _EditCard({
    required this.editing,
    required this.saving,
    required this.nameController,
    required this.phoneController,
    required this.emailController,
    required this.semester,
    required this.onSemesterChanged,
    required this.onEditToggle,
    required this.onSave,
  });

  final bool editing;
  final bool saving;
  final TextEditingController nameController;
  final TextEditingController phoneController;
  final TextEditingController emailController;
  final int? semester;
  final ValueChanged<int?> onSemesterChanged;
  final VoidCallback onEditToggle;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return _WhiteCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const _SectionTitle(
                icon: Icons.person_rounded,
                title: 'Personal Information',
              ),
              const Spacer(),
              TextButton(
                onPressed: saving ? null : onEditToggle,
                child: Text(editing ? 'Cancel' : 'Edit'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _Field(
            label: 'Full Name',
            controller: nameController,
            enabled: editing,
          ),
          const SizedBox(height: 12),
          _Field(
            label: 'Mobile Number',
            controller: phoneController,
            enabled: editing,
          ),
          const SizedBox(height: 12),
          _Field(label: 'Email', controller: emailController, enabled: editing),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            value: semester,
            decoration: _inputDecoration('Semester'),
            items: List.generate(
              6,
              (i) => DropdownMenuItem(
                value: i + 1,
                child: Text('Semester ${i + 1}'),
              ),
            ),
            onChanged: editing ? onSemesterChanged : null,
          ),
          if (editing) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: saving ? null : onSave,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6C3BFF),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: saving
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        'Save Changes',
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AvatarCard extends StatelessWidget {
  const _AvatarCard({
    required this.editing,
    required this.avatars,
    required this.selected,
    required this.onSelect,
  });

  final bool editing;
  final List<String> avatars;
  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return _WhiteCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(
            icon: Icons.auto_awesome_rounded,
            title: 'Avatar',
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: avatars.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
            ),
            itemBuilder: (context, index) {
              final avatar = avatars[index];
              final active = selected == avatar;

              return GestureDetector(
                onTap: editing ? () => onSelect(avatar) : null,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: active
                          ? const Color(0xFF6C3BFF)
                          : Colors.transparent,
                      width: 2,
                    ),
                  ),
                  child: CircleAvatar(
                    backgroundColor: const Color(0xFFF3EEFF),
                    backgroundImage: NetworkImage(avatar),
                  ),
                ),
              );
            },
          ),
          if (!editing) ...[
            const SizedBox(height: 8),
            Text(
              'Tap Edit to change avatar',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: const Color(0xFF7C8193),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SecurityCard extends StatefulWidget {
  const _SecurityCard({
    required this.onLogout,
    required this.mustSetPassword,
    required this.onPasswordSet,
  });

  final VoidCallback onLogout;
  final bool mustSetPassword;
  final VoidCallback onPasswordSet;

  @override
  State<_SecurityCard> createState() => _SecurityCardState();
}

class _SecurityCardState extends State<_SecurityCard> {
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _loading = false;
  bool _showCurrent = false;
  bool _showNew = false;
  bool _showConfirm = false;

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  bool get _hasEmailPasswordProvider {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return false;

    return user.providerData.any(
      (provider) => provider.providerId == EmailAuthProvider.PROVIDER_ID,
    );
  }

  void _showSnack(String message, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
        backgroundColor: error ? const Color(0xFFFF3B30) : null,
      ),
    );
  }

  String _authErrorMessage(FirebaseAuthException e) {
    switch (e.code) {
      case 'wrong-password':
      case 'invalid-credential':
        return 'Current password is incorrect.';
      case 'weak-password':
        return 'New password is too weak. Use at least 6 characters.';
      case 'requires-recent-login':
        return 'Please logout and login again, then try changing password.';
      case 'too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'user-not-found':
        return 'User account not found.';
      default:
        return e.message ?? 'Unable to change password.';
    }
  }

  Future<void> _changePassword() async {
    final user = FirebaseAuth.instance.currentUser;

    if (user == null) {
      _showSnack('User not logged in.', error: true);
      return;
    }

    if (!_hasEmailPasswordProvider ||
        user.email == null ||
        user.email!.isEmpty) {
      _showSnack('Use Forgot Password via OTP to reset password', error: true);
      return;
    }

    final currentPassword = _currentPasswordController.text.trim();
    final newPassword = _newPasswordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    if ((!widget.mustSetPassword && currentPassword.isEmpty) ||
        newPassword.isEmpty ||
        confirmPassword.isEmpty) {
      _showSnack('Fill all password fields.', error: true);
      return;
    }

    if (newPassword.length < 6) {
      _showSnack('New password must be at least 6 characters.', error: true);
      return;
    }

    if (newPassword != confirmPassword) {
      _showSnack('Passwords do not match.', error: true);
      return;
    }

    if (!widget.mustSetPassword && currentPassword == newPassword) {
      _showSnack(
        'New password must be different from current password.',
        error: true,
      );
      return;
    }

    setState(() => _loading = true);

    try {
      if (!widget.mustSetPassword) {
        final credential = EmailAuthProvider.credential(
          email: user.email!,
          password: currentPassword,
        );

        await user.reauthenticateWithCredential(credential);
      }

      await user.updatePassword(newPassword);

      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();

      widget.onPasswordSet();

      if (!mounted) return;

      _showSnack(
        widget.mustSetPassword
            ? 'Password set successfully.'
            : 'Password changed successfully.',
      );
    } on FirebaseAuthException catch (e) {
      if (!mounted) return;
      _showSnack(_authErrorMessage(e), error: true);
    } catch (_) {
      if (!mounted) return;
      _showSnack('Unable to change password. Please try again.', error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  InputDecoration _passwordDecoration({
    required String label,
    required bool visible,
    required VoidCallback onToggle,
  }) {
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: const Color(0xFFF8FAFC),
      suffixIcon: IconButton(
        onPressed: onToggle,
        icon: Icon(
          visible ? Icons.visibility_rounded : Icons.visibility_off_rounded,
          color: const Color(0xFF7C8193),
        ),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE8EAF2)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE8EAF2)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFF6C3BFF), width: 1.4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final canChangePassword = _hasEmailPasswordProvider;

    return _WhiteCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionTitle(
            icon: Icons.lock_rounded,
            title: widget.mustSetPassword ? 'Set New Password' : 'Security',
          ),
          const SizedBox(height: 12),

          if (widget.mustSetPassword) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFF3B30).withOpacity(0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFFFF3B30).withOpacity(0.18),
                ),
              ),
              child: Text(
                'You logged in using OTP. Please set a new password for security.',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  height: 1.5,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF151A29),
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],

          if (!canChangePassword && !widget.mustSetPassword) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF6C3BFF).withOpacity(0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: const Color(0xFF6C3BFF).withOpacity(0.18),
                ),
              ),
              child: Text(
                'Use Forgot Password via OTP to reset password',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  height: 1.5,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF151A29),
                ),
              ),
            ),
          ] else ...[
            Text(
              widget.mustSetPassword
                  ? 'Create a new password for your CUPHY account.'
                  : 'Change your login password securely. You need your current password to continue.',
              style: GoogleFonts.inter(
                fontSize: 13,
                height: 1.5,
                color: const Color(0xFF7C8193),
              ),
            ),
            const SizedBox(height: 14),

            if (!widget.mustSetPassword) ...[
              TextField(
                controller: _currentPasswordController,
                obscureText: !_showCurrent,
                decoration: _passwordDecoration(
                  label: 'Current Password',
                  visible: _showCurrent,
                  onToggle: () => setState(() => _showCurrent = !_showCurrent),
                ),
              ),
              const SizedBox(height: 12),
            ],

            TextField(
              controller: _newPasswordController,
              obscureText: !_showNew,
              decoration: _passwordDecoration(
                label: widget.mustSetPassword
                    ? 'Set New Password'
                    : 'New Password',
                visible: _showNew,
                onToggle: () => setState(() => _showNew = !_showNew),
              ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _confirmPasswordController,
              obscureText: !_showConfirm,
              decoration: _passwordDecoration(
                label: 'Confirm New Password',
                visible: _showConfirm,
                onToggle: () => setState(() => _showConfirm = !_showConfirm),
              ),
            ),
            const SizedBox(height: 14),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _loading ? null : _changePassword,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6C3BFF),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: _loading
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        widget.mustSetPassword
                            ? 'Set New Password'
                            : 'Change Password',
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
              ),
            ),
          ],

          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: _loading ? null : widget.onLogout,
              icon: const Icon(Icons.logout_rounded, color: Color(0xFFFF3B30)),
              label: Text(
                'Logout',
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFFFF3B30),
                ),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFFFD3D0)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({
    required this.label,
    required this.controller,
    required this.enabled,
  });

  final String label;
  final TextEditingController controller;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      decoration: _inputDecoration(label),
    );
  }
}

InputDecoration _inputDecoration(String label) {
  return InputDecoration(
    labelText: label,
    filled: true,
    fillColor: const Color(0xFFF8FAFC),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: Color(0xFFE8EAF2)),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: Color(0xFFE8EAF2)),
    ),
    disabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(16),
      borderSide: const BorderSide(color: Color(0xFFE8EAF2)),
    ),
  );
}

class _WhiteCard extends StatelessWidget {
  const _WhiteCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE8EAF2)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 19, color: const Color(0xFF6C3BFF)),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF151A29),
          ),
        ),
      ],
    );
  }
}
