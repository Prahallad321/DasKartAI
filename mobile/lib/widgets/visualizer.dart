import 'dart:math';
import 'package:flutter/material.dart';

class AudioVisualizer extends StatefulWidget {
  final double volume;
  final Color color;
  final bool isActive;

  const AudioVisualizer({
    super.key,
    required this.volume,
    required this.color,
    this.isActive = true,
  });

  @override
  State<AudioVisualizer> createState() => _AudioVisualizerState();
}

class _AudioVisualizerState extends State<AudioVisualizer> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _VisualizerPainter(
        volume: widget.volume,
        color: widget.color,
        animationValue: _controller,
      ),
      child: Container(),
    );
  }
}

class _VisualizerPainter extends CustomPainter {
  final double volume;
  final Color color;
  final Animation<double> animationValue;

  _VisualizerPainter({
    required this.volume,
    required this.color,
    required this.animationValue,
  }) : super(repaint: animationValue);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width, size.height) / 3;
    final Paint paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round;

    // Draw base circle
    canvas.drawCircle(center, radius, paint..color = color.withOpacity(0.3));

    // Dynamic bars
    // Amplify volume for visual effect
    double amplified = volume * 5; 
    if (amplified > 1.0) amplified = 1.0;
    
    // Rotation animation
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(animationValue.value * 2 * pi);
    canvas.translate(-center.dx, -center.dy);

    int count = 40;
    double angleStep = (2 * pi) / count;
    
    paint.color = color;

    for (int i = 0; i < count; i++) {
      double angle = i * angleStep;
      // create some random jitter based on index
      double jitter = sin(i * 0.5 + animationValue.value * 10) * 0.2; 
      
      double barLength = (amplified + jitter * amplified) * (radius * 0.8);
      if (barLength < 0) barLength = 0;

      double x1 = center.dx + cos(angle) * radius;
      double y1 = center.dy + sin(angle) * radius;
      
      double x2 = center.dx + cos(angle) * (radius + barLength);
      double y2 = center.dy + sin(angle) * (radius + barLength);

      canvas.drawLine(Offset(x1, y1), Offset(x2, y2), paint);
    }
    
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _VisualizerPainter oldDelegate) {
    return oldDelegate.volume != volume || oldDelegate.animationValue != animationValue;
  }
}
