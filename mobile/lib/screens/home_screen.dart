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
  bool _showChat = false;
  final CameraWrapperController _cameraController = CameraWrapperController();
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  GeminiService? _geminiService;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final gemini = context.read<GeminiService>();
    if (_geminiService != gemini) {
      _geminiService?.removeListener(_onGeminiUpdate);
      _geminiService = gemini;
      _geminiService?.addListener(_onGeminiUpdate);
    }
  }

  @override
  void dispose() {
    _geminiService?.removeListener(_onGeminiUpdate);
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onGeminiUpdate() {
    // Auto-scroll when new messages arrive if chat is visible
    if (_showChat && _geminiService != null && _geminiService!.messages.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

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
  
  void _sendMessage() {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    
    final gemini = context.read<GeminiService>();
    if (gemini.isConnected) {
      gemini.sendTextMessage(text);
      _textController.clear();
      // Scroll handling is done by listener
    }
  }

  void _clearChat() {
    context.read<GeminiService>().clearMessages();
  }

  Future<void> _toggleRecording() async {
    if (!_isCamOn) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Enable camera to record video")),
        );
      }
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
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;

    return Scaffold(
      resizeToAvoidBottomInset: false, // Handle inset manually or use Stack
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

          // Main Visualizer Area (Behind everything)
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

          // Header (Top Layer)
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
                        icon: Icon(LucideIcons.messageSquare, color: _showChat ? const Color(0xFF3B82F6) : Colors.grey),
                        onPressed: () {
                          setState(() {
                            _showChat = !_showChat;
                          });
                        },
                      ),
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

          // Chat Overlay (Partial Height so Visualizer is seen)
          if (_showChat)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              top: size.height * 0.35, // Show bottom 65% of screen
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.85),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                  border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 20, offset: const Offset(0, -5))
                  ]
                ),
                child: Column(
                  children: [
                    // Handle Bar & Header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                           // Handle Bar Visual
                           Container(width: 40),
                           Container(
                            width: 40,
                            height: 4,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                          // Clear Button
                          IconButton(
                            icon: const Icon(LucideIcons.trash2, size: 18, color: Colors.white38),
                            onPressed: _clearChat,
                            tooltip: 'Clear Chat',
                          )
                        ],
                      ),
                    ),
                    
                    // Messages List
                    Expanded(
                      child: gemini.messages.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.messageCircle, size: 40, color: Colors.white.withOpacity(0.1)),
                                const SizedBox(height: 8),
                                const Text("Type a message to start", style: TextStyle(color: Colors.white30)),
                              ],
                            )
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                            itemCount: gemini.messages.length,
                            itemBuilder: (context, index) {
                              final msg = gemini.messages[index];
                              final isUser = msg.role == 'user';
                              return Align(
                                alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                                child: Container(
                                  margin: const EdgeInsets.symmetric(vertical: 6),
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: isUser ? const Color(0xFF3B82F6) : Colors.white.withOpacity(0.1),
                                    borderRadius: BorderRadius.only(
                                      topLeft: const Radius.circular(20),
                                      topRight: const Radius.circular(20),
                                      bottomLeft: isUser ? const Radius.circular(20) : const Radius.circular(4),
                                      bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(20),
                                    ),
                                  ),
                                  constraints: BoxConstraints(maxWidth: size.width * 0.8),
                                  child: Text(
                                    msg.text,
                                    style: const TextStyle(color: Colors.white, height: 1.4),
                                  ),
                                ),
                              );
                            },
                          ),
                    ),
                    
                    // Input Field Area
                    // We check if keyboard is open to adjust layout if needed, 
                    // though SafeArea + Stack mostly handles it. 
                    Container(
                      padding: EdgeInsets.only(
                        left: 16, 
                        right: 16, 
                        top: 12,
                        // If keyboard is visible, add minimal padding, otherwise ensure space for control tray
                        bottom: keyboardHeight > 0 ? keyboardHeight + 12 : 110
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black,
                        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05))),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _textController,
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                hintText: "Message Nova...",
                                hintStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
                                fillColor: Colors.white.withOpacity(0.1),
                                filled: true,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(24),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                isDense: true,
                              ),
                              textCapitalization: TextCapitalization.sentences,
                              onSubmitted: (_) => _sendMessage(),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Container(
                            decoration: const BoxDecoration(
                              color: Color(0xFF3B82F6),
                              shape: BoxShape.circle,
                            ),
                            child: IconButton(
                              icon: const Icon(LucideIcons.send, color: Colors.white, size: 20),
                              onPressed: _sendMessage,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Control Tray (Bottom Layer - Always visible)
          // Hide control tray if keyboard is open to avoid clutter
          if (keyboardHeight == 0)
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A).withOpacity(0.9), // Higher opacity for visibility over chat
                    borderRadius: BorderRadius.circular(50),
                    border: Border.all(color: Colors.white10),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 10)]
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
                                 Text("Connect", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
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
      backgroundColor: Colors.transparent,
      isScrollControlled: true, // Allow full screen height if needed
      builder: (context) => const _SettingsSheet(),
    );
  }
}

// Separated widget to maintain TextField state during parent rebuilds
class _SettingsSheet extends StatefulWidget {
  const _SettingsSheet();

  @override
  State<_SettingsSheet> createState() => _SettingsSheetState();
}

class _SettingsSheetState extends State<_SettingsSheet> {
  late TextEditingController _instructionController;

  @override
  void initState() {
    super.initState();
    // Initialize controller with current value from provider
    final gemini = context.read<GeminiService>();
    _instructionController = TextEditingController(text: gemini.systemInstruction);
  }

  @override
  void dispose() {
    _instructionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Assistant Settings", style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          
          const Text("Voice", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Consumer<GeminiService>(
            builder: (context, gemini, _) {
              return Wrap(
                spacing: 12,
                runSpacing: 12,
                children: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].map((voice) {
                  final isSelected = gemini.currentVoice == voice;
                  return ChoiceChip(
                    label: Text(voice),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) {
                        gemini.setVoice(voice);
                        if (gemini.isConnected) {
                          gemini.disconnect();
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Reconnect to apply voice change")));
                        }
                      }
                    },
                    selectedColor: const Color(0xFF3B82F6),
                    backgroundColor: Colors.white10,
                    labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.white70),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide.none),
                  );
                }).toList(),
              );
            },
          ),
          const SizedBox(height: 20),
          
          const Text("System Instruction (Persona)", style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          TextField(
             controller: _instructionController,
             onSubmitted: (val) {
               final gemini = context.read<GeminiService>();
               gemini.setSystemInstruction(val);
               if (gemini.isConnected) {
                  gemini.disconnect();
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Reconnect to apply new persona")));
               }
               Navigator.pop(context);
             },
             style: const TextStyle(color: Colors.white),
             maxLines: 3,
             decoration: InputDecoration(
               filled: true,
               fillColor: Colors.white10,
               hintText: "e.g. You are a helpful assistant...",
               hintStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
               border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
             ),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }
}
