import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:sound_stream/sound_stream.dart';
import 'gemini_service.dart';

class AudioService extends ChangeNotifier {
  final RecorderStream _recorder = RecorderStream();
  final PlayerStream _player = PlayerStream();
  
  GeminiService? _geminiService;
  StreamSubscription? _recorderSub;
  StreamSubscription? _outputSub;
  
  bool _isMicOn = true;
  double _inputVolume = 0.0;
  double _outputVolume = 0.0;
  
  // Getters for visualizer
  double get inputVolume => _inputVolume;
  double get outputVolume => _outputVolume;
  bool get isMicOn => _isMicOn;

  AudioService() {
    _init();
  }

  Future<void> _init() async {
    await _player.initialize(sampleRate: 24000); // Gemini output is 24kHz
    await _recorder.initialize(sampleRate: 16000); // Gemini input is 16kHz
  }

  void updateGemini(GeminiService gemini) {
    _geminiService = gemini;
    
    // Listen to Gemini output stream and play it
    _outputSub?.cancel();
    _outputSub = _geminiService!.audioOutputStream.listen((data) {
       _player.writeChunk(data);
       _calculateOutputVolume(data);
    });
  }

  Future<void> startSession() async {
    await _player.start();
    
    if (_isMicOn) {
      await _recorder.start();
    }
    
    _recorderSub = _recorder.audioStream.listen((data) {
      if (_geminiService?.isConnected == true && _isMicOn) {
        // Convert to Float32 or just send PCM16 directly if API accepts it (API accepts PCM16)
        _geminiService!.sendAudioChunk(data);
        _calculateInputVolume(data);
      }
    });
  }

  Future<void> stopSession() async {
    await _recorder.stop();
    await _player.stop();
    _recorderSub?.cancel();
    _inputVolume = 0;
    _outputVolume = 0;
    notifyListeners();
  }

  void toggleMic() {
    _isMicOn = !_isMicOn;
    if (_isMicOn) {
      _recorder.start();
    } else {
      _recorder.stop();
      _inputVolume = 0;
    }
    notifyListeners();
  }

  // Simple RMS calculation for visualizer
  void _calculateInputVolume(Uint8List data) {
    // PCM 16-bit is 2 bytes per sample
    int sum = 0;
    for (int i = 0; i < data.length; i += 2) {
      int sample = data[i] | (data[i + 1] << 8);
      if (sample > 32767) sample -= 65536; // signed 16-bit
      sum += sample * sample;
    }
    double rms = 0;
    if (data.length > 0) {
        rms = (sum / (data.length / 2)).toDouble(); // Use square root if needed, but raw energy is fine for visualizer
    }
    _inputVolume = rms / 100000000; // Scale down roughly
    if (_inputVolume > 1.0) _inputVolume = 1.0;
    notifyListeners();
  }

  void _calculateOutputVolume(Uint8List data) {
      int sum = 0;
      for (int i = 0; i < data.length; i += 2) {
        int sample = data[i] | (data[i + 1] << 8);
        if (sample > 32767) sample -= 65536;
        sum += sample * sample;
      }
      double rms = 0;
      if (data.length > 0) {
          rms = (sum / (data.length / 2)).toDouble();
      }
      _outputVolume = rms / 100000000;
      if (_outputVolume > 1.0) _outputVolume = 1.0;
      notifyListeners();
  }
}
