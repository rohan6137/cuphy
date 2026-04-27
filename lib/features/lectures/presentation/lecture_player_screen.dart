import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';

class LecturePlayerScreen extends StatefulWidget {
  const LecturePlayerScreen({
    super.key,
    required this.lectures,
    required this.initialIndex,
    required this.subjectName,
    required this.batchName,
    required this.heroTag,
  });

  final List<Map<String, dynamic>> lectures;
  final int initialIndex;
  final String subjectName;
  final String batchName;
  final String heroTag;

  @override
  State<LecturePlayerScreen> createState() => _LecturePlayerScreenState();
}

class _LecturePlayerScreenState extends State<LecturePlayerScreen> {
  late int _currentIndex;
  late String _heroTag;
  YoutubePlayerController? _controller;

  bool _isFullScreen = false;
  String? _lastSavedLectureKey;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _heroTag = widget.heroTag;
    _buildController();
  }

  @override
  void dispose() {
    _controller?.pause();
    _controller?.dispose();

    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);

    super.dispose();
  }

  Map<String, dynamic> get _currentLecture => widget.lectures[_currentIndex];

  String _getLectureTitle(Map<String, dynamic> lecture) {
    final raw = lecture['title'] ?? lecture['name'] ?? 'Lecture';
    final text = raw.toString().trim();
    return text.isEmpty ? 'Lecture' : text;
  }

  String _getLectureDescription(Map<String, dynamic> lecture) {
    return (lecture['description'] ?? '').toString().trim();
  }

  String _getDuration(Map<String, dynamic> lecture) {
    return (lecture['duration'] ?? '').toString().trim();
  }

  String _getYoutubeId(Map<String, dynamic> lecture) {
    final directId = (lecture['youtubeVideoId'] ?? '').toString().trim();
    return directId;
  }

  String? _thumbnailFromLecture(Map<String, dynamic> lecture) {
    final id = _getYoutubeId(lecture);
    if (id.isEmpty) return null;
    return 'https://img.youtube.com/vi/$id/hqdefault.jpg';
  }

  void _buildController() {
    final videoId = _getYoutubeId(_currentLecture);

    if (videoId.isEmpty) {
      _controller = null;
      return;
    }

    _controller =
        YoutubePlayerController(
          initialVideoId: videoId,
          flags: const YoutubePlayerFlags(
            autoPlay: false,
            mute: false,
            enableCaption: true,
            forceHD: false,
          ),
        )..addListener(() {
          if (_controller!.value.isPlaying) {
            _saveLastLecture();
          }
        });
  }

  Future<void> _exitFullScreenOnly() async {
    if (_controller?.value.isFullScreen == true || _isFullScreen) {
      _controller?.toggleFullScreenMode();

      setState(() {
        _isFullScreen = false;
      });

      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
      await SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    }
  }

  Future<void> _handleBackPressed() async {
    if (_controller?.value.isFullScreen == true || _isFullScreen) {
      await _exitFullScreenOnly();
      return;
    }

    _controller?.pause();

    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  void _changeLecture(int newIndex) {
    if (newIndex < 0 || newIndex >= widget.lectures.length) return;

    final videoId = _getYoutubeId(widget.lectures[newIndex]);
    if (videoId.isEmpty) return;

    _controller?.pause();

    setState(() {
      _currentIndex = newIndex;
      _heroTag = 'lecture_${widget.lectures[newIndex]['id']}';
    });

    _controller?.load(videoId);
    _saveLastLecture();
  }

  Future<void> _saveLastLecture() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final lecture = _currentLecture;
    final youtubeVideoId = (lecture['youtubeVideoId'] ?? '').toString().trim();
    final lectureId = (lecture['id'] ?? youtubeVideoId).toString();

    if (lectureId.isEmpty || youtubeVideoId.isEmpty) return;

    if (_lastSavedLectureKey == lectureId) return;
    _lastSavedLectureKey = lectureId;

    try {
      await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
        'lastLecture': {
          'lectureId': lectureId,
          'title': lecture['title'] ?? lecture['name'] ?? 'Lecture',
          'youtubeVideoId': youtubeVideoId,
          'subjectName': widget.subjectName,
          'batchName': widget.batchName,
          'thumbnail':
              'https://img.youtube.com/vi/$youtubeVideoId/hqdefault.jpg',
          'updatedAt': FieldValue.serverTimestamp(),
        },
      }, SetOptions(merge: true));
    } catch (e) {
      debugPrint("Save last lecture error: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    final lecture = _currentLecture;
    final title = _getLectureTitle(lecture);
    final description = _getLectureDescription(lecture);
    final duration = _getDuration(lecture);
    final currentThumb = _thumbnailFromLecture(lecture);

    if (_controller == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF6F6FB),
        appBar: AppBar(
          backgroundColor: const Color(0xFFF6F6FB),
          elevation: 0,
          title: Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF151A29),
            ),
          ),
        ),
        body: Center(
          child: Text(
            'No valid YouTube video found',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF6F768A),
            ),
          ),
        ),
      );
    }

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        await _handleBackPressed();
      },
      child: YoutubePlayerBuilder(
        onEnterFullScreen: () async {
          setState(() {
            _isFullScreen = true;
          });

          await SystemChrome.setEnabledSystemUIMode(
            SystemUiMode.immersiveSticky,
          );
          await SystemChrome.setPreferredOrientations([
            DeviceOrientation.landscapeLeft,
            DeviceOrientation.landscapeRight,
          ]);
        },
        onExitFullScreen: () async {
          setState(() {
            _isFullScreen = false;
          });

          await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
          await SystemChrome.setPreferredOrientations(DeviceOrientation.values);
        },
        player: YoutubePlayer(
          controller: _controller!,
          showVideoProgressIndicator: true,
          progressIndicatorColor: const Color(0xFF00D4FF),
          progressColors: const ProgressBarColors(
            playedColor: Color(0xFF00D4FF),
            handleColor: Color(0xFF6C3BFF),
          ),
          onEnded: (_) {
            if (_currentIndex < widget.lectures.length - 1) {
              _changeLecture(_currentIndex + 1);
            }
          },
        ),
        builder: (context, player) {
          return Scaffold(
            backgroundColor: const Color(0xFFF6F6FB),
            appBar: _isFullScreen
                ? null
                : AppBar(
                    backgroundColor: const Color(0xFFF6F6FB),
                    surfaceTintColor: const Color(0xFFF6F6FB),
                    elevation: 0,
                    scrolledUnderElevation: 0,
                    titleSpacing: 0,
                    leading: IconButton(
                      icon: const Icon(
                        Icons.arrow_back_rounded,
                        color: Color(0xFF151A29),
                      ),
                      onPressed: _handleBackPressed,
                    ),
                    title: Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF151A29),
                      ),
                    ),
                  ),
            body: _isFullScreen
                ? Center(child: player)
                : ListView(
                    padding: const EdgeInsets.fromLTRB(12, 0, 12, 18),
                    children: [
                      Hero(
                        tag: _heroTag,
                        child: Material(
                          color: Colors.transparent,
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.black,
                              borderRadius: BorderRadius.circular(22),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.10),
                                  blurRadius: 14,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: AspectRatio(
                              aspectRatio: 16 / 9,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  if (currentThumb != null)
                                    Positioned.fill(
                                      child: Image.network(
                                        currentThumb,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) =>
                                            const SizedBox(),
                                      ),
                                    ),
                                  Positioned.fill(
                                    child: Container(
                                      color: Colors.black.withOpacity(0.18),
                                    ),
                                  ),
                                  player,
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
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
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                if (widget.batchName.trim().isNotEmpty)
                                  _InfoPill(label: widget.batchName),
                                if (widget.subjectName.trim().isNotEmpty)
                                  _InfoPill(label: widget.subjectName),
                                if (duration.isNotEmpty)
                                  _InfoPill(label: duration),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              title,
                              style: GoogleFonts.inter(
                                fontSize: 19,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF151A29),
                                height: 1.2,
                              ),
                            ),
                            if (description.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Text(
                                description,
                                style: GoogleFonts.inter(
                                  fontSize: 13.3,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF6F768A),
                                  height: 1.5,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: OutlinedButton.icon(
                                onPressed: _currentIndex > 0
                                    ? () => _changeLecture(_currentIndex - 1)
                                    : null,
                                icon: const Icon(
                                  Icons.arrow_back_rounded,
                                  size: 18,
                                ),
                                label: Text(
                                  'Previous',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: ElevatedButton.icon(
                                onPressed:
                                    _currentIndex < widget.lectures.length - 1
                                    ? () => _changeLecture(_currentIndex + 1)
                                    : null,
                                icon: const Icon(
                                  Icons.arrow_forward_rounded,
                                  size: 18,
                                ),
                                label: Text(
                                  'Next',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Lecture Playlist',
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF151A29),
                        ),
                      ),
                      const SizedBox(height: 10),
                      ...List.generate(widget.lectures.length, (index) {
                        final item = widget.lectures[index];
                        final itemTitle = _getLectureTitle(item);
                        final thumb = _thumbnailFromLecture(item);
                        final isActive = index == _currentIndex;

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(18),
                            onTap: () => _changeLecture(index),
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                  color: isActive
                                      ? const Color(0xFF6C3BFF)
                                      : const Color(0xFFE8EAF2),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 110,
                                    height: 68,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF111827),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    clipBehavior: Clip.antiAlias,
                                    child: thumb != null
                                        ? Image.network(
                                            thumb,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) =>
                                                _thumbFallback(),
                                          )
                                        : _thumbFallback(),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      itemTitle,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.inter(
                                        fontSize: 14.2,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF151A29),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Icon(
                                    isActive
                                        ? Icons.play_arrow_rounded
                                        : Icons.play_circle_outline_rounded,
                                    color: const Color(0xFF6C3BFF),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
          );
        },
      ),
    );
  }

  Widget _thumbFallback() {
    return Container(
      color: const Color(0xFFF3EEFF),
      alignment: Alignment.center,
      child: const Icon(
        Icons.play_circle_outline_rounded,
        size: 30,
        color: Color(0xFF6C3BFF),
      ),
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFF3EEFF),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF6C3BFF),
        ),
      ),
    );
  }
}
