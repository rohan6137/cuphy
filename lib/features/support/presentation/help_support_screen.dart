import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

class HelpSupportScreen extends StatefulWidget {
  const HelpSupportScreen({super.key});

  @override
  State<HelpSupportScreen> createState() => _HelpSupportScreenState();
}

class _HelpSupportScreenState extends State<HelpSupportScreen> {
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();

  final _categories = const [
    'Payment Issue',
    'Login Issue',
    'Lecture Problem',
    'Notes / PDF Issue',
    'Test / Quiz Issue',
    'Batch Access Issue',
    'Other',
  ];

  String _category = 'Payment Issue';
  bool _submitting = false;

  User? get user => FirebaseAuth.instance.currentUser;

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  String _digitsOnly(String value) => value.replaceAll(RegExp(r'\D'), '');

  Future<void> _submitTicket() async {
    final currentUser = user;
    if (currentUser == null) return;

    final subject = _subjectController.text.trim();
    final message = _messageController.text.trim();

    if (subject.isEmpty || message.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter subject and message'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      await FirebaseFirestore.instance.collection('supportTickets').add({
        'userUid': currentUser.uid,
        'uid': currentUser.uid,
        'userPhone': currentUser.phoneNumber ?? '',
        'userName': currentUser.displayName ?? 'Student',
        'category': _category,
        'subject': subject,
        'message': message,
        'status': 'open',
        'reply': '',
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
        'source': 'app',
        'isAuthenticated': true,
      });

      _subjectController.clear();
      _messageController.clear();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ticket submitted successfully'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not submit ticket: $e'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Stream<List<QueryDocumentSnapshot<Map<String, dynamic>>>> _ticketStream() {
    final currentUser = user;
    if (currentUser == null) return Stream.value([]);

    return FirebaseFirestore.instance
        .collection('supportTickets')
        .where('userUid', isEqualTo: currentUser.uid)
        .snapshots()
        .map((snap) {
          final list = snap.docs.toList();

          list.sort((a, b) {
            final aTime = a.data()['createdAt'];
            final bTime = b.data()['createdAt'];

            final aMillis = aTime is Timestamp
                ? aTime.millisecondsSinceEpoch
                : 0;
            final bMillis = bTime is Timestamp
                ? bTime.millisecondsSinceEpoch
                : 0;

            return bMillis.compareTo(aMillis);
          });

          return list;
        });
  }

  Stream<DocumentSnapshot<Map<String, dynamic>>> _settingsStream() {
    return FirebaseFirestore.instance
        .collection('appSettings')
        .doc('main')
        .snapshots();
  }

  String _dateText(dynamic value) {
    if (value is! Timestamp) return '';
    final d = value.toDate();
    return '${d.day}/${d.month}/${d.year}';
  }

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
      stream: _settingsStream(),
      builder: (context, settingsSnap) {
        final settings = settingsSnap.data?.data() ?? {};

        final supportEnabled = settings['supportEnabled'] != false;
        final supportTicketEnabled = settings['supportTicketEnabled'] != false;

        final whatsappNumber = _digitsOnly(
          (settings['supportWhatsappNumber'] ?? '').toString(),
        );
        final whatsappLabel =
            (settings['supportWhatsappLabel'] ?? 'Chat on WhatsApp').toString();

        final supportEmail = (settings['supportEmail'] ?? '').toString().trim();
        final emailLabel = (settings['supportEmailLabel'] ?? 'Email Support')
            .toString();

        final whatsappLink = whatsappNumber.isEmpty
            ? ''
            : 'https://wa.me/$whatsappNumber';
        final emailLink = supportEmail.isEmpty ? '' : 'mailto:$supportEmail';

        return Scaffold(
          resizeToAvoidBottomInset: true,
          backgroundColor: const Color(0xFFF6F6FB),
          appBar: AppBar(
            backgroundColor: const Color(0xFFF6F6FB),
            elevation: 0,
            scrolledUnderElevation: 0,
            iconTheme: const IconThemeData(color: Color(0xFF151A29)),
            title: Text(
              'Help & Support',
              style: GoogleFonts.inter(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF151A29),
              ),
            ),
          ),
          body: !supportEnabled
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text(
                      'Help & Support is currently disabled by admin.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF7C8193),
                      ),
                    ),
                  ),
                )
              : SafeArea(
                  child: SingleChildScrollView(
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: EdgeInsets.only(
                      bottom: MediaQuery.of(context).viewInsets.bottom + 18,
                    ),
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
                          child: Row(
                            children: [
                              Expanded(
                                child: _SupportActionCard(
                                  icon: Icons.chat_rounded,
                                  title: 'WhatsApp',
                                  label: whatsappLabel,
                                  enabled: whatsappLink.isNotEmpty,
                                  color: const Color(0xFF16A34A),
                                  onTap: whatsappLink.isEmpty
                                      ? null
                                      : () => _openUrl(whatsappLink),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _SupportActionCard(
                                  icon: Icons.email_rounded,
                                  title: 'Email',
                                  label: emailLabel,
                                  enabled: emailLink.isNotEmpty,
                                  color: const Color(0xFF6C3BFF),
                                  onTap: emailLink.isEmpty
                                      ? null
                                      : () => _openUrl(emailLink),
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (supportTicketEnabled)
                          Container(
                            margin: const EdgeInsets.all(14),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(22),
                              border: Border.all(
                                color: const Color(0xFFE8EAF2),
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.04),
                                  blurRadius: 14,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: Column(
                              children: [
                                DropdownButtonFormField<String>(
                                  value: _category,
                                  decoration: const InputDecoration(
                                    labelText: 'Category',
                                    border: OutlineInputBorder(),
                                  ),
                                  items: _categories
                                      .map(
                                        (item) => DropdownMenuItem(
                                          value: item,
                                          child: Text(item),
                                        ),
                                      )
                                      .toList(),
                                  onChanged: (value) {
                                    if (value != null) {
                                      setState(() => _category = value);
                                    }
                                  },
                                ),
                                const SizedBox(height: 12),
                                TextField(
                                  controller: _subjectController,
                                  decoration: const InputDecoration(
                                    labelText: 'Subject',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                TextField(
                                  controller: _messageController,
                                  maxLines: 4,
                                  decoration: const InputDecoration(
                                    labelText: 'Message',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                                const SizedBox(height: 14),
                                SizedBox(
                                  width: double.infinity,
                                  height: 48,
                                  child: ElevatedButton(
                                    onPressed: _submitting
                                        ? null
                                        : _submitTicket,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF6C3BFF),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                    ),
                                    child: _submitting
                                        ? const SizedBox(
                                            height: 18,
                                            width: 18,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.white,
                                            ),
                                          )
                                        : Text(
                                            'Submit Ticket',
                                            style: GoogleFonts.inter(
                                              fontWeight: FontWeight.w800,
                                              color: Colors.white,
                                            ),
                                          ),
                                  ),
                                ),
                              ],
                            ),
                          )
                        else
                          Padding(
                            padding: const EdgeInsets.all(14),
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                  color: const Color(0xFFE8EAF2),
                                ),
                              ),
                              child: Text(
                                'Ticket system is currently disabled. Please use WhatsApp or Email support.',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF7C8193),
                                ),
                              ),
                            ),
                          ),
                        StreamBuilder<
                          List<QueryDocumentSnapshot<Map<String, dynamic>>>
                        >(
                          stream: _ticketStream(),
                          builder: (context, snapshot) {
                            if (snapshot.hasError) {
                              return Padding(
                                padding: const EdgeInsets.all(20),
                                child: Text(
                                  'Unable to load tickets',
                                  style: GoogleFonts.inter(
                                    fontWeight: FontWeight.w700,
                                    color: Colors.red,
                                  ),
                                ),
                              );
                            }

                            if (!snapshot.hasData) {
                              return const Padding(
                                padding: EdgeInsets.all(20),
                                child: Center(
                                  child: CircularProgressIndicator(),
                                ),
                              );
                            }

                            final tickets = snapshot.data!;

                            if (tickets.isEmpty) {
                              return Padding(
                                padding: const EdgeInsets.all(20),
                                child: Text(
                                  'No tickets yet',
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF7C8193),
                                  ),
                                ),
                              );
                            }

                            return ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              padding: const EdgeInsets.fromLTRB(14, 0, 14, 18),
                              itemCount: tickets.length,
                              itemBuilder: (context, index) {
                                final data = tickets[index].data();

                                final subject =
                                    data['subject'] ?? 'Support Ticket';
                                final message = data['message'] ?? '';
                                final category = data['category'] ?? '';
                                final status = data['status'] ?? 'open';
                                final reply = data['reply'] ?? '';
                                final createdAt = data['createdAt'];

                                final resolved = status == 'resolved';

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(
                                      color: const Color(0xFFE8EAF2),
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        subject.toString(),
                                        style: GoogleFonts.inter(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w800,
                                          color: const Color(0xFF151A29),
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        category.toString(),
                                        style: GoogleFonts.inter(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: const Color(0xFF6C3BFF),
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        message.toString(),
                                        style: GoogleFonts.inter(
                                          fontSize: 13,
                                          height: 1.45,
                                          color: const Color(0xFF4B5163),
                                        ),
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 10,
                                              vertical: 5,
                                            ),
                                            decoration: BoxDecoration(
                                              color: resolved
                                                  ? Colors.green.withOpacity(
                                                      0.1,
                                                    )
                                                  : Colors.orange.withOpacity(
                                                      0.1,
                                                    ),
                                              borderRadius:
                                                  BorderRadius.circular(999),
                                            ),
                                            child: Text(
                                              resolved ? 'Resolved' : 'Open',
                                              style: GoogleFonts.inter(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w800,
                                                color: resolved
                                                    ? Colors.green
                                                    : Colors.orange,
                                              ),
                                            ),
                                          ),
                                          const Spacer(),
                                          Text(
                                            _dateText(createdAt),
                                            style: GoogleFonts.inter(
                                              fontSize: 11,
                                              color: const Color(0xFF7C8193),
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (reply
                                          .toString()
                                          .trim()
                                          .isNotEmpty) ...[
                                        const SizedBox(height: 12),
                                        Container(
                                          width: double.infinity,
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: Colors.green.withOpacity(
                                              0.07,
                                            ),
                                            borderRadius: BorderRadius.circular(
                                              14,
                                            ),
                                            border: Border.all(
                                              color: Colors.green.withOpacity(
                                                0.18,
                                              ),
                                            ),
                                          ),
                                          child: Text(
                                            'Admin Reply:\n$reply',
                                            style: GoogleFonts.inter(
                                              fontSize: 13,
                                              height: 1.45,
                                              fontWeight: FontWeight.w600,
                                              color: const Color(0xFF166534),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                );
                              },
                            );
                          },
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

class _SupportActionCard extends StatelessWidget {
  const _SupportActionCard({
    required this.icon,
    required this.title,
    required this.label,
    required this.enabled,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String label;
  final bool enabled;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: enabled ? Colors.white : Colors.white.withOpacity(0.65),
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: enabled ? onTap : null,
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFE8EAF2)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.035),
                blurRadius: 12,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Column(
            children: [
              Icon(icon, color: enabled ? color : Colors.grey, size: 24),
              const SizedBox(height: 8),
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF151A29),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                enabled ? label : 'Not available',
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: enabled ? const Color(0xFF7C8193) : Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
