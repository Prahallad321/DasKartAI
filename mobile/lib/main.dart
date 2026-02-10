import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'screens/home_screen.dart';
import 'services/gemini_service.dart';
import 'services/audio_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Note: permissions should be requested early or in the UI flow
  await [
    Permission.microphone,
    Permission.camera,
  ].request();

  runApp(const NovaApp());
}

class NovaApp extends StatelessWidget {
  const NovaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => GeminiService()),
        ChangeNotifierProxyProvider<GeminiService, AudioService>(
          create: (_) => AudioService(),
          update: (_, gemini, audio) => audio!..updateGemini(gemini),
        ),
      ],
      child: MaterialApp(
        title: 'Nova AI',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: Colors.black,
          useMaterial3: true,
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF3B82F6), // Nova Blue
            secondary: Color(0xFF8B5CF6), // Nova Purple
            background: Colors.black,
          ),
          fontFamily: 'Inter',
        ),
        home: const HomeScreen(),
      ),
    );
  }
}
