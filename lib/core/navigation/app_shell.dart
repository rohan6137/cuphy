import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/services.dart';

import '../../features/auth/logic/auth_controller.dart';
import '../../features/batches/presentation/batches_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/notes/presentation/all_notes_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/support/presentation/help_support_screen.dart';
import '../../features/tests/presentation/all_tests_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell>
    with WidgetsBindingObserver {
  int _currentIndex = 0;
  DateTime? _lastBackPressed;

  late final List<Widget> _pages = const [
    HomeScreen(),
    BatchesScreen(),
    DashboardScreen(),
    AllNotesScreen(),
    AllTestsScreen(),
  ];

  bool _checkingSession = false;
  bool _maintenanceMode = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _listenMaintenanceMode();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAppSession();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkAppSession();
    }
  }

  void _listenMaintenanceMode() {
    FirebaseFirestore.instance
        .collection('appSettings')
        .doc('main')
        .snapshots()
        .listen((doc) {
          final data = doc.data();

          if (!mounted || data == null) return;

          setState(() {
            _maintenanceMode = data['maintenanceMode'] == true;
          });
        });
  }

  Future<void> _checkAppSession() async {
    if (_checkingSession) return;
    _checkingSession = true;

    try {
      final authService = ref.read(authServiceProvider);
      final isValid = await authService.isCurrentAppSessionValid();

      if (!isValid && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Another device login detected'),
            behavior: SnackBarBehavior.floating,
          ),
        );

        await Future.delayed(const Duration(milliseconds: 600));
        await authService.forceLogoutLocalOnly();
      }
    } catch (_) {
      // Do not break app flow if session check fails.
    } finally {
      _checkingSession = false;
    }
  }

  void _onTap(int index) {
    if (_currentIndex == index) return;
    setState(() {
      _currentIndex = index;
    });
  }

  void _showComingSoon(String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label will be connected next'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_maintenanceMode) {
      return Scaffold(
        backgroundColor: const Color(0xFFF6F6FB),
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Container(
                width: double.infinity,
                constraints: const BoxConstraints(maxWidth: 420),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFE8EAF2)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.08),
                      blurRadius: 22,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: const Color(0xFF6C3BFF).withOpacity(0.10),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(
                        Icons.settings_rounded,
                        size: 34,
                        color: Color(0xFF6C3BFF),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'CUPHY',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF151A29),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Physics Made Powerful',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF697089),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'The platform is temporarily under maintenance.\nPlease check back soon.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.45,
                        color: Color(0xFF697089),
                      ),
                    ),
                    const SizedBox(height: 22),
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton(
                        onPressed: () async {
                          await ref.read(authControllerProvider).logout();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6C3BFF),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          'Logout',
                          style: TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;

        if (_currentIndex != 0) {
          setState(() {
            _currentIndex = 0;
          });
          return;
        }

        final now = DateTime.now();
        final shouldExit =
            _lastBackPressed != null &&
            now.difference(_lastBackPressed!) < const Duration(seconds: 2);

        if (shouldExit) {
          SystemNavigator.pop();
          return;
        }
        _lastBackPressed = now;

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Press back again to exit'),
            behavior: SnackBarBehavior.floating,
            duration: Duration(seconds: 2),
          ),
        );
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF6F6FB),
        appBar: AppBar(
          automaticallyImplyLeading: false,
          backgroundColor: const Color(0xFFF6F6FB),
          surfaceTintColor: const Color(0xFFF6F6FB),
          elevation: 0,
          scrolledUnderElevation: 0,
          toolbarHeight: 60,
          titleSpacing: 12,
          title: const _HeaderBrand(),
          actions: [
            _HeaderBell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const NotificationsScreen(),
                  ),
                );
              },
            ),
            const SizedBox(width: 8),
            _HeaderProfile(ref: ref),
            const SizedBox(width: 10),
          ],
        ),
        body: IndexedStack(index: _currentIndex, children: _pages),
        bottomNavigationBar: SafeArea(
          top: false,
          child: Container(
            margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFE8EAF2)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.08),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              children: [
                _NavItem(
                  index: 0,
                  currentIndex: _currentIndex,
                  icon: Icons.home_rounded,
                  label: 'Home',
                  onTap: _onTap,
                ),
                _NavItem(
                  index: 1,
                  currentIndex: _currentIndex,
                  icon: Icons.auto_stories_rounded,
                  label: 'Batches',
                  onTap: _onTap,
                ),
                _NavItem(
                  index: 2,
                  currentIndex: _currentIndex,
                  icon: Icons.dashboard_rounded,
                  label: 'Dash',
                  onTap: _onTap,
                ),
                _NavItem(
                  index: 3,
                  currentIndex: _currentIndex,
                  icon: Icons.note_alt_rounded,
                  label: 'Notes',
                  onTap: _onTap,
                ),
                _NavItem(
                  index: 4,
                  currentIndex: _currentIndex,
                  icon: Icons.quiz_rounded,
                  label: 'Tests',
                  onTap: _onTap,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HeaderBrand extends StatelessWidget {
  const _HeaderBrand();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SvgPicture.asset(
          'assets/logo/cp_logo.svg',
          width: 34,
          height: 34,
          fit: BoxFit.contain,
        ),
        const SizedBox(width: 10),
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
          ).createShader(bounds),
          child: Text(
            'CUPHY',
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
              color: Colors.white,
            ),
          ),
        ),
      ],
    );
  }
}

class _HeaderBell extends StatelessWidget {
  const _HeaderBell({required this.onTap});

  final VoidCallback onTap;

  Future<bool> _shouldShowNotification(
    User user,
    Map<String, dynamic> data,
  ) async {
    final targetType = (data['targetType'] ?? 'all').toString().toLowerCase();

    if (targetType == 'all') return true;

    if (targetType == 'user') {
      final possibleUserIds = [
        data['targetValue'],
        data['targetUserUid'],
        data['targetUserId'],
        data['targetUid'],
        data['userUid'],
      ].map((e) => (e ?? '').toString()).where((e) => e.isNotEmpty).toList();

      return possibleUserIds.contains(user.uid);
    }

    if (targetType == 'batch') {
      final batchId =
          (data['targetValue'] ??
                  data['targetBatchId'] ??
                  data['batchId'] ??
                  '')
              .toString();

      if (batchId.isEmpty) return false;

      // 🔥 Check subscriptions
      final subSnap = await FirebaseFirestore.instance
          .collection('subscriptions')
          .where('userUid', isEqualTo: user.uid)
          .where('batchId', isEqualTo: batchId)
          .limit(1)
          .get();

      for (final doc in subSnap.docs) {
        final sub = doc.data();

        final allowed =
            sub['expiredByAdmin'] != true &&
            (sub['active'] == true ||
                sub['premiumUnlocked'] == true ||
                sub['paymentStatus'] == 'paid');

        if (allowed) return true;
      }

      // 🔥 Check enrollments
      final enrollmentSnap = await FirebaseFirestore.instance
          .collection('enrollments')
          .where('userUid', isEqualTo: user.uid)
          .where('batchId', isEqualTo: batchId)
          .limit(1)
          .get();

      for (final doc in enrollmentSnap.docs) {
        final enrollment = doc.data();

        final allowed =
            enrollment['expiredByAdmin'] != true &&
            enrollment['active'] != false;

        if (allowed) return true;
      }

      return false;
    }

    return false;
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;

    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('notifications')
          .where('isActive', isEqualTo: true)
          .snapshots(),
      builder: (context, notifSnap) {
        if (!notifSnap.hasData || user == null) {
          return _buildBell(0);
        }

        return StreamBuilder<QuerySnapshot>(
          stream: FirebaseFirestore.instance
              .collection('users')
              .doc(user.uid)
              .collection('notificationReads')
              .snapshots(),
          builder: (context, readSnap) {
            final accountCreatedAt = user.metadata.creationTime;

            return FutureBuilder<List<QueryDocumentSnapshot>>(
              future: () async {
                final filtered = <QueryDocumentSnapshot>[];

                for (final doc in notifSnap.data!.docs) {
                  final data = doc.data() as Map<String, dynamic>;
                  final createdAt = data['createdAt'];

                  if (accountCreatedAt != null) {
                    if (createdAt is! Timestamp) continue;

                    final notificationTime = createdAt.toDate();

                    if (notificationTime.isBefore(accountCreatedAt)) {
                      continue;
                    }
                  }

                  final allowed = await _shouldShowNotification(user, data);

                  if (allowed) {
                    filtered.add(doc);
                  }
                }

                return filtered;
              }(),
              builder: (context, filteredSnap) {
                if (!filteredSnap.hasData) {
                  return _buildBell(0);
                }

                final readIds = (readSnap.data?.docs ?? [])
                    .map((d) => d.id)
                    .toSet();

                final unread = filteredSnap.data!
                    .where((doc) => !readIds.contains(doc.id))
                    .length;

                return _buildBell(unread);
              },
            );
          },
        );
      },
    );
  }

  Widget _buildBell(int count) {
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE8EAF2)),
            ),
            child: const Icon(
              Icons.notifications_none_rounded,
              size: 22,
              color: Color(0xFF151A29),
            ),
          ),
          if (count > 0)
            Positioned(
              right: -3,
              top: -3,
              child: Container(
                constraints: const BoxConstraints(minWidth: 18),
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF3B30),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
                child: Text(
                  count > 99 ? '99+' : '$count',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _HeaderProfile extends StatelessWidget {
  const _HeaderProfile({required this.ref});

  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      color: Colors.white,
      elevation: 10,
      offset: const Offset(0, 50),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      onSelected: (value) async {
        switch (value) {
          case 'profile':
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            );
            break;
          case 'support':
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const HelpSupportScreen()),
            );
            break;
          case 'logout':
            await ref.read(authControllerProvider).logout();
            break;
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem<String>(
          enabled: false,
          height: 58,
          child: Row(
            children: [
              const CircleAvatar(
                radius: 16,
                backgroundImage: NetworkImage(
                  'https://api.dicebear.com/7.x/adventurer/png?seed=CUPHYStudent',
                ),
                backgroundColor: Color(0xFFF3EEFF),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Student',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF151A29),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Physics learner',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF7C8193),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem<String>(
          value: 'profile',
          child: _MenuRow(icon: Icons.person_outline_rounded, label: 'Profile'),
        ),
        PopupMenuItem<String>(
          value: 'support',
          child: _MenuRow(
            icon: Icons.support_agent_rounded,
            label: 'Help & Support',
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem<String>(
          value: 'logout',
          child: _MenuRow(
            icon: Icons.logout_rounded,
            label: 'Logout',
            danger: true,
          ),
        ),
      ],
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: const Color(0xFFE8EAF2)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: const CircleAvatar(
          radius: 19,
          backgroundImage: NetworkImage(
            'https://api.dicebear.com/7.x/adventurer/png?seed=CUPHYStudent',
          ),
          backgroundColor: Color(0xFFF3EEFF),
        ),
      ),
    );
  }
}

class _MenuRow extends StatelessWidget {
  const _MenuRow({
    required this.icon,
    required this.label,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? const Color(0xFFFF3B30) : const Color(0xFF151A29);

    return Row(
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 12),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.index,
    required this.currentIndex,
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final int index;
  final int currentIndex;
  final IconData icon;
  final String label;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final isActive = index == currentIndex;

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => onTap(index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: isActive
                ? const LinearGradient(
                    colors: [Color(0xFF6C3BFF), Color(0xFF00D4FF)],
                  )
                : null,
            boxShadow: isActive
                ? [
                    BoxShadow(
                      color: const Color(0xFF6C3BFF).withOpacity(0.18),
                      blurRadius: 12,
                      offset: const Offset(0, 5),
                    ),
                  ]
                : null,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 20,
                color: isActive ? Colors.white : const Color(0xFF7C8193),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  color: isActive ? Colors.white : const Color(0xFF7C8193),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
