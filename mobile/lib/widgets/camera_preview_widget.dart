import 'dart:async';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

class CameraPreviewWidget extends StatefulWidget {
  final Function(Uint8List) onFrame;
  final bool isEnabled;
  // Controller to trigger recording from parent
  final CameraWrapperController? controller;

  const CameraPreviewWidget({
    super.key,
    required this.onFrame,
    required this.isEnabled,
    this.controller,
  });

  @override
  State<CameraPreviewWidget> createState() => _CameraPreviewWidgetState();
}

// Simple controller to expose start/stop recording
class CameraWrapperController {
  _CameraPreviewWidgetState? _state;
  
  Future<void> startRecording() {
    if (_state != null) {
      return _state!._startRecording();
    }
    return Future.value();
  }
  
  Future<XFile?> stopRecording() {
    if (_state != null) {
      return _state!._stopRecording();
    }
    return Future.value(null);
  }
}

class _CameraPreviewWidgetState extends State<CameraPreviewWidget> {
  CameraController? _controller;
  bool _isProcessing = false;
  bool _isRecording = false;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    if (widget.controller != null) {
      widget.controller!._state = this;
    }
    if (widget.isEnabled) {
      _initCamera();
    }
  }

  @override
  void didUpdateWidget(CameraPreviewWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isEnabled && !oldWidget.isEnabled) {
      _initCamera();
    } else if (!widget.isEnabled && oldWidget.isEnabled) {
      _disposeCamera();
    }
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      final firstCamera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      _controller = CameraController(
        firstCamera,
        ResolutionPreset.medium, // Bumped slightly for video recording quality
        enableAudio: false, // Essential to avoid conflict with sound_stream
      );

      await _controller!.initialize();
      
      // Timer for AI Vision frames
      // Note: We pause sending vision frames while recording video to prevent camera resource conflicts
      _timer = Timer.periodic(const Duration(milliseconds: 1000), (timer) async {
        if (_controller != null && 
            _controller!.value.isInitialized && 
            !_isProcessing && 
            !_isRecording) { 
          _captureAndSend();
        }
      });

      if (mounted) setState(() {});
    } catch (e) {
      print("Camera init error: $e");
    }
  }

  Future<void> _captureAndSend() async {
    try {
      _isProcessing = true;
      // Note: takePicture can fail if camera is busy or recording
      final file = await _controller!.takePicture();
      final bytes = await file.readAsBytes();
      widget.onFrame(bytes);
    } catch (e) {
      // Ignore errors (common if camera is busy)
    } finally {
      _isProcessing = false;
    }
  }

  Future<void> _startRecording() async {
    if (_controller == null || !_controller!.value.isInitialized || _isRecording) {
      return;
    }
    
    try {
      await _controller!.startVideoRecording();
      if (mounted) {
        setState(() {
            _isRecording = true;
        });
      }
    } catch (e) {
      print("Start recording error: $e");
    }
  }

  Future<XFile?> _stopRecording() async {
    if (_controller == null || !_isRecording) {
      return null;
    }

    try {
      final file = await _controller!.stopVideoRecording();
      if (mounted) {
        setState(() {
            _isRecording = false;
        });
      }
      return file;
    } catch (e) {
      print("Stop recording error: $e");
      if (mounted) {
        setState(() {
            _isRecording = false;
        });
      }
      return null;
    }
  }

  void _disposeCamera() {
    _timer?.cancel();
    _controller?.dispose();
    _controller = null;
    _isRecording = false;
  }

  @override
  void dispose() {
    _disposeCamera();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_controller == null || !_controller!.value.isInitialized) {
      return Container(color: Colors.black);
    }
    return Stack(
      children: [
        CameraPreview(_controller!),
        if (_isRecording)
          Positioned(
            top: 10,
            right: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.circle, size: 8, color: Colors.white),
                  SizedBox(width: 4),
                  Text("REC", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          )
      ],
    );
  }
}