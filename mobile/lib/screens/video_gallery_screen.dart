import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
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
      // Ensure we re-fetch effectively
      final files = dir.listSync();
      final mp4s = files.where((f) => f.path.endsWith('.mp4')).toList();
      
      // Sort by modified date descending (newest first)
      mp4s.sort((a, b) => b.statSync().modified.compareTo(a.statSync().modified));

      setState(() {
        _videos = mp4s;
        _loading = false;
      });
    } catch (e) {
      print("Error loading videos: $e");
      setState(() {
        _loading = false;
      });
    }
  }

  String _formatDate(DateTime dt) {
    return "${dt.year}-${dt.month.toString().padLeft(2,'0')}-${dt.day.toString().padLeft(2,'0')} ${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}";
  }

  Future<void> _deleteVideo(FileSystemEntity file) async {
    try {
      await file.delete();
      _loadVideos(); // Refresh list
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error deleting file")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text("Recordings", style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _videos.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(LucideIcons.film, size: 48, color: Colors.white.withOpacity(0.2)),
                      const SizedBox(height: 16),
                      Text("No recordings yet", style: TextStyle(color: Colors.white.withOpacity(0.5))),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _videos.length,
                  itemBuilder: (context, index) {
                    final file = _videos[index];
                    final stat = file.statSync();
                    final sizeMb = (stat.size / (1024 * 1024)).toStringAsFixed(1);
                    
                    return Card(
                      color: Colors.white.withOpacity(0.05),
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF3B82F6).withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(LucideIcons.video, color: Color(0xFF3B82F6)),
                        ),
                        title: Text(
                          "Recording ${index + 1}", 
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)
                        ),
                        subtitle: Text(
                          "${_formatDate(stat.modified)} • ${sizeMb} MB",
                          style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
                        ),
                        trailing: IconButton(
                          icon: const Icon(LucideIcons.trash2, color: Colors.redAccent, size: 20),
                          onPressed: () => _deleteVideo(file),
                        ),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => VideoPlayerScreen(file: file as File)),
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
