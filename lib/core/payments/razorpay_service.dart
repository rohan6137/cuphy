import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:razorpay_flutter/razorpay_flutter.dart';

class RazorpayService {
  RazorpayService._();

  static Razorpay? _razorpay;

  static String? _batchId;
  static String? _batchName;
  static String? _semester;
  static int? _amount;
  static VoidCallback? _onSuccess;

  static const String _createOrderUrl =
      'https://createrazorpayorder-bh5voq2veq-el.a.run.app';

  static const String _verifyPaymentUrl =
      'https://verifyrazorpaypayment-bh5voq2veq-el.a.run.app';

  static void dispose() {
    _razorpay?.clear();
    _razorpay = null;
  }

  static void _ensureInitialized(BuildContext context) {
    _razorpay?.clear();
    _razorpay = Razorpay();

    _razorpay!.on(Razorpay.EVENT_PAYMENT_SUCCESS, (
      PaymentSuccessResponse response,
    ) async {
      await _verifyPayment(context, response);
    });

    _razorpay!.on(Razorpay.EVENT_PAYMENT_ERROR, (
      PaymentFailureResponse response,
    ) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            response.message?.isNotEmpty == true
                ? response.message!
                : 'Payment failed',
          ),
          behavior: SnackBarBehavior.floating,
        ),
      );
    });

    _razorpay!.on(Razorpay.EVENT_EXTERNAL_WALLET, (
      ExternalWalletResponse response,
    ) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('External wallet selected'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    });
  }

  static Future<void> startPayment({
    required BuildContext context,
    required String batchId,
    required String batchName,
    required String semester,
    required int amount,
    required VoidCallback onSuccess,
  }) async {
    final user = FirebaseAuth.instance.currentUser;

    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please login first'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final email = user.email?.trim() ?? '';

    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please add email in profile before payment'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    _batchId = batchId;
    _batchName = batchName;
    _semester = semester;
    _amount = amount;
    _onSuccess = onSuccess;

    _ensureInitialized(context);

    try {
      final response = await http.post(
        Uri.parse(_createOrderUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'batchId': batchId,
          'batchName': batchName,
          'semester': semester,
          'amount': amount,
          'userEmail': email,
          'userName': user.displayName ?? '',
        }),
      );

      final data = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || data['success'] != true) {
        throw Exception(data['message'] ?? 'Unable to create order');
      }

      final order = data['order'] as Map<String, dynamic>;

      final options = {
        'key': data['key'],
        'amount': order['amount'],
        'currency': 'INR',
        'name': 'CUPHY',
        'description': batchName,
        'order_id': order['id'],
        'prefill': {'email': email},
        'theme': {'color': '#6C3BFF'},
      };

      _razorpay!.open(options);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment error: $e'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  static Future<void> _verifyPayment(
    BuildContext context,
    PaymentSuccessResponse response,
  ) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      final email = user?.email?.trim() ?? '';

      final res = await http.post(
        Uri.parse(_verifyPaymentUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'razorpay_order_id': response.orderId,
          'razorpay_payment_id': response.paymentId,
          'razorpay_signature': response.signature,
          'batchId': _batchId,
          'batchName': _batchName,
          'semester': _semester,
          'amount': _amount,
          'userEmail': email,
          'userName': user?.displayName ?? '',
        }),
      );

      final data = jsonDecode(res.body) as Map<String, dynamic>;

      if (res.statusCode == 200 && data['success'] == true) {
        _onSuccess?.call();

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment successful. Premium unlocked.'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        throw Exception(data['message'] ?? 'Payment verification failed');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Verification error: $e'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}
