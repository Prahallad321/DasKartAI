import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class GeminiService extends ChangeNotifier {
  // TODO: Secure your API Key
  static const String _apiKey = String.fromEnvironment('API_KEY', defaultValue: ''); 
  static const String _host = 'generativelanguage.googleapis.com';
  static const String _model = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

  WebSocketChannel? _channel;
  bool _isConnected = false;
  String? _error;
  String _currentVoice = 'Puck';

  // Stream for incoming audio chunks to be played
  final StreamController<Uint8List> _audioOutputController = StreamController.broadcast();
  Stream<Uint8List> get audioOutputStream => _audioOutputController.stream;

  bool get isConnected => _isConnected;
  String? get error => _error;
  String get currentVoice => _currentVoice;

  void setVoice(String voice) {
    _currentVoice = voice;
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
            }
          },
          "system_instruction": {
            "parts": [
               {"text": "You are Nova, a helpful, witty, and friendly AI assistant. You speak naturally, like a human."}
            ]
          }
        }
      };
      
      _channel!.sink.add(jsonEncode(setupMsg));
      
      _isConnected = true;
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

  void _onMessage(dynamic data) {
    try {
      final decoded = jsonDecode(data);
      
      // Handle Audio Output
      final serverContent = decoded['serverContent'];
      if (serverContent != null) {
        final modelTurn = serverContent['modelTurn'];
        if (modelTurn != null) {
          final parts = modelTurn['parts'] as List;
          for (var part in parts) {
            final inlineData = part['inlineData'];
            if (inlineData != null) {
              final base64Audio = inlineData['data'];
              final bytes = base64Decode(base64Audio);
              _audioOutputController.add(bytes);
            }
          }
        }
        
        if (serverContent['interrupted'] == true) {
            // Handle interruption (clear output buffers in audio service)
        }
      }
      
    } catch (e) {
      print("Error parsing message: $e");
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
