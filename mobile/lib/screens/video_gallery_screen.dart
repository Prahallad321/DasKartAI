import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:video_thumbnail/video_thumbnail.dart';
import 'video_player_screen.dart';

class VideoGalleryScreen extends StatefulWidget {
  const VideoGalleryScreen({super.key});

  @override
  State<VideoGalleryScreen> createState() => _VideoGalleryScreenState();
}

class _VideoGalleryScreenState extends State<VideoGalleryScreen> {
  List<FileSystemEntity> _videos = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadVideos();
  }

  Future<void> _loadVideos() async {
    try {
      final dir = await getApplicationDocumentsDirectory();
      final files = dir.listSync();
      final mp4s = files.where((f) => f.path.endsWith('.mp4')).toList();
      
      // Sort by modified date descending (newest first)
      mp4s.sort((a, b) => b.statSync().modified.compareTo(a.statSync().modified));

      if (mounted) {
        setState(() {
          _videos = mp4s;
          _loading = false;
        });
      }
    } catch (e) {
      print("Error loading videos: $e");
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  String _formatDate(DateTime dt) {
    return "${dt.year}-${dt.month.toString().padLeft(2,'0')}-${dt.day.toString().padLeft(2,'0')} ${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}";
  }

  Future<void> _deleteVideo(FileSystemEntity file, int index) async {
    // Optimistically remove from list to satisfy Dismissible
    final removedVideo = _videos[index];
    setState(() {
      _videos.removeAt(index);
    });

    try {
      await file.delete();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Recording deleted"),
          duration: Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        )
      );
    } catch (e) {
      // Revert if deletion fails
      setState(() {
        _videos.insert(index, removedVideo);
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Error deleting file")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text("Recordings", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _videos.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(LucideIcons.film, size: 48, color: Colors.white.withOpacity(0.2)),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        "No recordings yet", 
                        style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 16)
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                  itemCount: _videos.length,
                  itemBuilder: (context, index) {
                    final file = _videos[index];
                    final stat = file.statSync();
                    final sizeMb = (stat.size / (1024 * 1024)).toStringAsFixed(1);
                    final dateStr = _formatDate(stat.modified);
                    
                    return Dismissible(
                      key: Key(file.path),
                      direction: DismissDirection.endToStart,
                      background: Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.only(right: 24),
                        decoration: BoxDecoration(
                          color: Colors.red.shade900.withOpacity(0.8),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        alignment: Alignment.centerRight,
                        child: const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.trash2, color: Colors.white, size: 28),
                            SizedBox(height: 4),
                            Text("Delete", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold))
                          ],
                        ),
                      ),
                      onDismissed: (direction) => _deleteVideo(file, index),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.05)),
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => VideoPlayerScreen(file: file as File)),
                            );
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Row(
                              children: [
                                // Thumbnail with Hero-like presentation
                                Hero(
                                  tag: file.path,
                                  child: Container(
                                    width: 100,
                                    height: 75,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(12),
                                      color: Colors.black45,
                                    ),
                                    clipBehavior: Clip.antiAlias,
                                    child: Stack(
                                      fit: StackFit.expand,
                                      children: [
                                        FutureBuilder<Uint8List?>(
                                          future: VideoThumbnail.thumbnailData(
                                            video: file.path,
                                            imageFormat: ImageFormat.JPEG,
                                            maxWidth: 256,
                                            quality: 50,
                                          ),
                                          builder: (context, snapshot) {
                                            if (snapshot.hasData && snapshot.data != null) {
                                              return Image.memory(
                                                snapshot.data!, 
                                                fit: BoxFit.cover,
                                              );
                                            }
                                            return const Center(
                                              child: Icon(LucideIcons.film, color: Colors.white24, size: 24),
                                            );
                                          },
                                        ),
                                        Container(
                                          color: Colors.black12,
                                          child: const Center(
                                            child: Icon(LucideIcons.playCircle, color: Colors.white70, size: 24),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                
                                // Metadata
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        "Recording ${index + 1}", 
                                        style: const TextStyle(
                                          color: Colors.white, 
                                          fontWeight: FontWeight.w600, 
                                          fontSize: 16
                                        )
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Icon(LucideIcons.calendar, size: 14, color: Colors.blueAccent.withOpacity(0.7)),
                                          const SizedBox(width: 4),
                                          Text(
                                            dateStr.split(' ')[0],
                                            style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Icon(LucideIcons.clock, size: 14, color: Colors.purpleAccent.withOpacity(0.7)),
                                          const SizedBox(width: 4),
                                          Text(
                                            dateStr.split(' ')[1],
                                            style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13),
                                          ),
                                          const SizedBox(width: 12),
                                          Icon(LucideIcons.hardDrive, size: 14, color: Colors.white.withOpacity(0.3)),
                                          const SizedBox(width: 4),
                                          Text(
                                            "$sizeMb MB",
                                            style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(LucideIcons.chevronRight, color: Colors.white.withOpacity(0.2)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
