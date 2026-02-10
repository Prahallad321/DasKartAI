import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:path_provider/path_provider.dart';
import '../services/gemini_service.dart';
import '../services/audio_service.dart';
import '../widgets/visualizer.dart';
import '../widgets/camera_preview_widget.dart';
import 'video_gallery_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isCamOn = false;
  bool _isRecording = false;
  final CameraWrapperController _cameraController = CameraWrapperController();

  void _toggleConnect() async {
    final gemini = context.read<GeminiService>();
    final audio = context.read<AudioService>();

    if (gemini.isConnected) {
      // Stop recording if active when disconnecting
      if (_isRecording) {
        await _toggleRecording();
      }
      audio.stopSession();
      gemini.disconnect();
    } else {
      await gemini.connect();
      if (gemini.isConnected) {
        audio.startSession();
      }
    }
  }

  Future<void> _toggleRecording() async {
    if (!_isCamOn) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Enable camera to record video")),
      );
      return;
    }

    // Toggle State UI immediately
    setState(() {
      _isRecording = !_isRecording;
    });

    if (_isRecording) {
      // Start Recording
      await _cameraController.startRecording();
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Recording started (Video only)")),
        );
      }
    } else {
      // Stop Recording & Save
      final file = await _cameraController.stopRecording();
      
      if (file != null) {
        // Move file from Cache to Documents
        final dir = await getApplicationDocumentsDirectory();
        final String fileName = 'nova_video_${DateTime.now().millisecondsSinceEpoch}.mp4';
        final String newPath = '${dir.path}/$fileName';
        
        await file.saveTo(newPath);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("Saved to Documents: $fileName"),
              duration: const Duration(seconds: 4),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
             const SnackBar(content: Text("Error saving video")),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final gemini = context.watch<GeminiService>();
    final audio = context.watch<AudioService>();
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Stack(
        children: [
          // Gradient Background
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.center,
                radius: 0.8,
                colors: [Color(0xFF1E1B4B), Colors.black],
              ),
            ),
          ),

          // Header
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(LucideIcons.sparkles, color: Color(0xFF3B82F6)),
                      const SizedBox(width: 8),
                      ShaderMask(
                        shaderCallback: (bounds) => const LinearGradient(
                          colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)],
                        ).createShader(bounds),
                        child: const Text(
                          'NOVA',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                       IconButton(
                        icon: const Icon(LucideIcons.film, color: Colors.grey),
                        onPressed: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const VideoGalleryScreen()));
                        },
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.settings, color: Colors.grey),
                        onPressed: () {
                          _showSettings(context);
                        },
                      ),
                    ],
                  )
                ],
              ),
            ),
          ),

          // Main Visualizer Area
          Center(
            child: SizedBox(
              width: size.width * 0.8,
              height: size.width * 0.8,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  if (!gemini.isConnected)
                     Column(
                       mainAxisAlignment: MainAxisAlignment.center,
                       children: [
                         const Text(
                           "Ready to chat",
                           style: TextStyle(fontSize: 24, fontWeight: FontWeight.w300, color: Colors.white70),
                         ),
                         const SizedBox(height: 8),
                         Text(
                           "Tap connect to start",
                           style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.5)),
                         ),
                       ],
                     ),
                  
                  // AI Output Visualizer (Outer)
                  if (gemini.isConnected)
                    Positioned.fill(
                      child: AudioVisualizer(
                        volume: audio.outputVolume, 
                        color: const Color(0xFF8B5CF6),
                      ),
                    ),

                  // User Input Visualizer (Inner)
                  if (gemini.isConnected && audio.isMicOn)
                    Positioned(
                      width: size.width * 0.4,
                      height: size.width * 0.4,
                      child: AudioVisualizer(
                        volume: audio.inputVolume, 
                        color: const Color(0xFF3B82F6),
                      ),
                    ),

                  // Central Core
                  if (gemini.isConnected)
                    Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        color: _isRecording ? Colors.red : Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: _isRecording ? Colors.red.withOpacity(0.8) : Colors.white.withOpacity(0.8), 
                            blurRadius: 20
                          )
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),
          
          // Camera Preview (Floating)
          if (_isCamOn && gemini.isConnected)
            Positioned(
              top: 100,
              right: 20,
              child: Container(
                width: 100,
                height: 150,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _isRecording ? Colors.red : Colors.white24, width: _isRecording ? 2 : 1),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CameraPreviewWidget(
                    isEnabled: _isCamOn,
                    controller: _cameraController,
                    onFrame: (bytes) {
                      gemini.sendImageFrame(bytes);
                    },
                  ),
                ),
              ),
            ),

          // Error Toast
          if (gemini.error != null)
             Positioned(
               top: 100,
               left: 20,
               right: 20,
               child: Container(
                 padding: const EdgeInsets.all(12),
                 decoration: BoxDecoration(
                   color: Colors.red.withOpacity(0.1),
                   borderRadius: BorderRadius.circular(30),
                   border: Border.all(color: Colors.red.withOpacity(0.5)),
                 ),
                 child: Row(
                   mainAxisAlignment: MainAxisAlignment.center,
                   children: [
                     const Icon(LucideIcons.alertCircle, color: Colors.redAccent, size: 16),
                     const SizedBox(width: 8),
                     Expanded(child: Text(gemini.error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12), overflow: TextOverflow.ellipsis)),
                   ],
                 ),
               ),
             ),

          // Control Tray
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A).withOpacity(0.8),
                  borderRadius: BorderRadius.circular(50),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (gemini.isConnected) ...[
                      // Recording Button
                      IconButton(
                         onPressed: _isCamOn ? _toggleRecording : null,
                         icon: Icon(
                           LucideIcons.circle,
                           fill: _isRecording ? Colors.red : null,
                           color: _isRecording ? Colors.red : (_isCamOn ? Colors.white : Colors.grey),
                         ),
                         style: IconButton.styleFrom(
                           backgroundColor: _isRecording ? Colors.red.withOpacity(0.2) : Colors.white10,
                           padding: const EdgeInsets.all(16),
                         ),
                      ),
                      const SizedBox(width: 16),
                      IconButton(
                        onPressed: audio.toggleMic,
                        icon: Icon(
                          audio.isMicOn ? LucideIcons.mic : LucideIcons.micOff,
                          color: audio.isMicOn ? Colors.white : Colors.redAccent,
                        ),
                        style: IconButton.styleFrom(
                          backgroundColor: audio.isMicOn ? Colors.white10 : Colors.red.withOpacity(0.2),
                          padding: const EdgeInsets.all(16),
                        ),
                      ),
                      const SizedBox(width: 16),
                      IconButton(
                        onPressed: () {
                          if (_isRecording) {
                             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Stop recording before turning off camera")));
                             return;
                          }
                          setState(() {
                            _isCamOn = !_isCamOn;
                          });
                        },
                        icon: Icon(
                          _isCamOn ? LucideIcons.video : LucideIcons.videoOff,
                          color: _isCamOn ? Colors.white : Colors.redAccent,
                        ),
                        style: IconButton.styleFrom(
                          backgroundColor: _isCamOn ? Colors.white10 : Colors.red.withOpacity(0.2),
                          padding: const EdgeInsets.all(16),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Container(width: 1, height: 24, color: Colors.white10),
                      const SizedBox(width: 16),
                      IconButton(
                        onPressed: _toggleConnect,
                        icon: const Icon(LucideIcons.phoneOff, color: Colors.white),
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.red,
                          padding: const EdgeInsets.all(16),
                        ),
                      ),
                    ] else ...[
                       GestureDetector(
                         onTap: _toggleConnect,
                         child: Container(
                           padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                           decoration: BoxDecoration(
                             color: const Color(0xFF3B82F6),
                             borderRadius: BorderRadius.circular(50),
                           ),
                           child: const Row(
                             children: [
                               Icon(LucideIcons.phone, color: Colors.white),
                               SizedBox(width: 12),
                               Text("Connect to Nova", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                             ],
                           ),
                         ),
                       )
                    ]
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showSettings(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Consumer<GeminiService>(
          builder: (context, gemini, _) {
            final voices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
            return Container(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Select Voice", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  ...voices.map((v) => ListTile(
                    title: Text(v, style: const TextStyle(color: Colors.white)),
                    leading: Icon(Icons.record_voice_over, color: gemini.currentVoice == v ? const Color(0xFF3B82F6) : Colors.grey),
                    onTap: () {
                      gemini.setVoice(v);
                      Navigator.pop(ctx);
                    },
                    trailing: gemini.currentVoice == v ? const Icon(Icons.check, color: Color(0xFF3B82F6)) : null,
                  )),
                ],
              ),
            );
          }
        );
      },
    );
  }
}
