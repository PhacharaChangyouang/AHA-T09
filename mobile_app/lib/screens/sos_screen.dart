import 'package:flutter/material.dart';
import '../utils/app_theme.dart';
import '../utils/api_service.dart';

/// AHA SOS screen: show backend state, never a timer-based fake success.
/// HTTP persistence does not establish that a caregiver saw a Push.
class SosScreen extends StatefulWidget {
  const SosScreen({super.key, this.sendSos});

  // Fixture injection for widget tests. Normally uses the secured API client.
  final Future<Map<String, dynamic>> Function()? sendSos;

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulse;
  bool _sending = true;
  bool _recorded = false;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
    _pulse = Tween<double>(begin: 0.9, end: 1.1).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
    _dispatch();
  }

  Future<void> _dispatch() async {
    try {
      final result = await (widget.sendSos ?? ApiService.sendSos)();
      final count = result['notified'];
      if (result['success'] != true || count is! num || count < 1) {
        throw StateError('SOS was not persisted');
      }
      if (!mounted) return;
      setState(() {
        _sending = false;
        _recorded = true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _recorded = false;
      });
    }
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final heading = _sending
        ? 'กำลังส่งคำขอ SOS...'
        : _recorded
            ? 'บันทึกคำขอ SOS แล้ว'
            : 'ส่งคำขอ SOS ไม่สำเร็จ';
    final detail = _sending
        ? 'กำลังติดต่อระบบแจ้งเตือน กรุณาอย่าปิดหน้านี้'
        : _recorded
            ? 'ระบบบันทึกคำขอแล้ว แต่ยังไม่ยืนยันว่าผู้ดูแลได้รับการแจ้งเตือน'
            : 'ระบบยังไม่สามารถยืนยันว่าคำขอถูกบันทึกหรือส่งถึงผู้ดูแลได้';

    return Scaffold(
      body: Container(
        width: double.infinity,
        color: AppTheme.sosRed,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 22),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ScaleTransition(
                  scale: _pulse,
                  child: Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.2),
                      border: Border.all(color: Colors.white, width: 4),
                    ),
                    child: const Icon(
                      Icons.sos_rounded,
                      size: 88,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                if (_sending)
                  const CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  )
                else
                  Icon(
                    _recorded
                        ? Icons.info_outline_rounded
                        : Icons.warning_amber_rounded,
                    size: 45,
                    color: Colors.white,
                  ),
                const SizedBox(height: 16),
                Text(
                  heading,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  detail,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 19,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 22),
                const Text(
                  'หากเป็นเหตุฉุกเฉิน ให้โทร 1669 ด้วยแอปโทรศัพท์ทันที\nAHA ไม่ได้โทรออกแทนคุณ',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 18,
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 28),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppTheme.sosRed,
                    minimumSize: const Size(double.infinity, 60),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: const Text(
                    'กลับหน้าหลัก',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
