import 'dart:async';
import 'package:aha_app/screens/sos_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('SOS remains pending until API confirms persistence', (tester) async {
    final pending = Completer<Map<String, dynamic>>();
    await tester.pumpWidget(MaterialApp(
      home: SosScreen(sendSos: () => pending.future),
    ));
    expect(find.text('กำลังส่งคำขอ SOS...'), findsOneWidget);
    expect(find.text('บันทึกคำขอ SOS แล้ว'), findsNothing);
    expect(find.textContaining('1669'), findsOneWidget);
    pending.complete({
      'success': true,
      'notified': 1,
      'pushProviderAccepted': 0,
      'deviceReceiptConfirmed': false,
    });
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('บันทึกคำขอ SOS แล้ว'), findsOneWidget);
    expect(find.textContaining('ยังไม่ยืนยันว่าผู้ดูแลได้รับ'), findsOneWidget);
    expect(find.text('ส่งสัญญาณฉุกเฉินแล้ว!'), findsNothing);
  });

  testWidgets('SOS API error never displays a fake success', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: SosScreen(
        sendSos: () async => throw StateError('synthetic HTTP 502'),
      ),
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('ส่งคำขอ SOS ไม่สำเร็จ'), findsOneWidget);
    expect(find.text('บันทึกคำขอ SOS แล้ว'), findsNothing);
    expect(find.textContaining('โทร 1669'), findsOneWidget);
  });

  testWidgets('empty or unsuccessful API result is not success', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: SosScreen(sendSos: () async => {
        'success': true,
        'notified': 0,
      }),
    ));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.text('ส่งคำขอ SOS ไม่สำเร็จ'), findsOneWidget);
  });
}
