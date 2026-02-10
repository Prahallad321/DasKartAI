import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class ChatMessage {
  final String id;
  final String role; // 'user' or 'model'
  String text;
  bool isFinal;
  final DateTime timestamp;

  ChatMessage({
    required this.id,
    required this.role,
    required this.text,
    required this.timestamp,
    this.isFinal = false,
  });
}

class GeminiService extends ChangeNotifier {
  // TODO: Secure your API Key
  static const String _apiKey = String.fromEnvironment('API_KEY', defaultValue: ''); 
  static const String _host = 'generativelanguage.googleapis.com';
  static const String _model = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

  WebSocketChannel? _channel;
  bool _isConnected = false;
  String? _error;
  String _currentVoice = 'Puck';
  String _systemInstruction = "You are Nova, a helpful, witty, and friendly AI assistant. You speak naturally, like a human.";
  
  // Chat State
  final List<ChatMessage> _messages = [];
  List<ChatMessage> get messages => List.unmodifiable(_messages);

  // Stream for incoming audio chunks to be played
  final StreamController<Uint8List> _audioOutputController = StreamController.broadcast();
  Stream<Uint8List> get audioOutputStream => _audioOutputController.stream;

  bool get isConnected => _isConnected;
  String? get error => _error;
  String get currentVoice => _currentVoice;
  String get systemInstruction => _systemInstruction;

  void setVoice(String voice) {
    _currentVoice = voice;
    notifyListeners();
  }

  void setSystemInstruction(String instruction) {
    _systemInstruction = instruction;
    notifyListeners();
  }
  
  void clearMessages() {
    _messages.clear();
    notifyListeners();
  }

  Future<void> connect() async {
    if (_apiKey.isEmpty) {
      _error = "API Key not found";
      notifyListeners();
      return;
    }

    try {
      _error = null;
      final uri = Uri.parse('wss://$_host/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=$_apiKey');
      
      _channel = WebSocketChannel.connect(uri);
      
      // Listen to the stream immediately
      _channel!.stream.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDone,
      );

      // Send Setup Message
      final setupMsg = {
        "setup": {
          "model": _model,
          "generation_config": {
            "response_modalities": ["AUDIO"],
            "speech_config": {
              "voice_config": {
                "prebuilt_voice_config": {"voice_name": _currentVoice}
              }
            },
            "input_audio_transcription": {"model": "google_provided_model"},
            "output_audio_transcription": {"model": "google_provided_model"}
          },
          "system_instruction": {
            "parts": [
               {"text": _systemInstruction}
            ]
          }
        }
      };
      
      _channel!.sink.add(jsonEncode(setupMsg));
      
      _isConnected = true;
      // Do not clear messages automatically to preserve context if user reconnects, 
      // but user can clear manually.
      notifyListeners();
      
    } catch (e) {
      _error = e.toString();
      _isConnected = false;
      notifyListeners();
    }
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
    _isConnected = false;
    notifyListeners();
  }

  void sendAudioChunk(Uint8List pcmData) {
    if (!_isConnected || _channel == null) return;

    final msg = {
      "realtime_input": {
        "media_chunks": [
          {
            "mime_type": "audio/pcm",
            "data": base64Encode(pcmData)
          }
        ]
      }
    };
    _channel!.sink.add(jsonEncode(msg));
  }
  
  void sendImageFrame(Uint8List jpegBytes) {
    if (!_isConnected || _channel == null) return;
    
    final msg = {
      "realtime_input": {
        "media_chunks": [
          {
            "mime_type": "image/jpeg",
            "data": base64Encode(jpegBytes)
          }
        ]
      }
    };
    _channel!.sink.add(jsonEncode(msg));
  }

  void sendTextMessage(String text) {
    if (!_isConnected || _channel == null) return;

    // Optimistically add user message
    _handleTranscript(text, 'user', true);

    final msg = {
      "client_content": {
        "turns": [
          {
            "role": "user",
            "parts": [{"text": text}]
          }
        ],
        "turn_complete": true
      }
    };
    _channel!.sink.add(jsonEncode(msg));
  }

  void _onMessage(dynamic data) {
    try {
      final decoded = jsonDecode(data);
      
      // Handle Audio Output
      final serverContent = decoded['serverContent'];
      if (serverContent != null) {
        
        // Handle Audio
        final modelTurn = serverContent['modelTurn'];
        if (modelTurn != null) {
          final parts = modelTurn['parts'] as List?;
          if (parts != null) {
            for (var part in parts) {
              final inlineData = part['inlineData'];
              if (inlineData != null) {
                final base64Audio = inlineData['data'];
                if (base64Audio != null) {
                  final bytes = base64Decode(base64Audio);
                  _audioOutputController.add(bytes);
                }
              }
            }
          }
        }
        
        // Handle Transcriptions
        if (serverContent['outputTranscription'] != null) {
          final text = serverContent['outputTranscription']['text'];
          if (text != null) {
            _handleTranscript(text, 'model', false);
          }
        }
        
        if (serverContent['inputTranscription'] != null) {
          final text = serverContent['inputTranscription']['text'];
          if (text != null) {
            _handleTranscript(text, 'user', false);
          }
        }

        if (serverContent['turnComplete'] == true) {
           _finalizeLastMessage('model');
           // Also finalize user message if needed, though usually handled
           _finalizeLastMessage('user'); 
        }
        
        if (serverContent['interrupted'] == true) {
           // Handle interruption 
           _finalizeLastMessage('model');
        }
      }
      
    } catch (e) {
      print("Error parsing message: $e");
    }
  }
  
  void _handleTranscript(String text, String role, bool isFinal) {
    if (_messages.isNotEmpty) {
      final lastMsg = _messages.last;
      // If last message is same role and not final, append
      if (lastMsg.role == role && !lastMsg.isFinal && !isFinal) {
        lastMsg.text += text;
        notifyListeners();
        return;
      }
    }
    
    // Create new message
    _messages.add(ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: role,
      text: text,
      timestamp: DateTime.now(),
      isFinal: isFinal
    ));
    notifyListeners();
  }
  
  void _finalizeLastMessage(String role) {
    if (_messages.isNotEmpty) {
      final lastMsg = _messages.last;
      if (lastMsg.role == role && !lastMsg.isFinal) {
        lastMsg.isFinal = true;
        notifyListeners();
      }
    }
  }

  void _onError(dynamic err) {
    _error = err.toString();
    _isConnected = false;
    notifyListeners();
  }

  void _onDone() {
    _isConnected = false;
    notifyListeners();
  }
}
