import crypto from 'crypto';
import { env } from '../config/env';

export interface CreateOrderParams {
  amount: number; // in minor units (paise/cents)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface IPaymentProvider {
  createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean;
}

/**
 * Real Razorpay Integration Implementation
 */
export class RazorpayProvider implements IPaymentProvider {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor() {
    this.keyId = env.PAYMENT_KEY_ID;
    this.keySecret = env.PAYMENT_KEY_SECRET;
    this.webhookSecret = env.PAYMENT_WEBHOOK_SECRET;
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      throw new Error(`Razorpay order creation failed: ${errData}`);
    }

    const data: any = await response.json();
    return {
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId: this.keyId,
    };
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  }
}

/**
 * Sandbox Mock Payment Provider for automated testing & demo when real credentials are not present
 */
export class SandboxMockProvider implements IPaymentProvider {
  private secret = 'staynest-sandbox-secret-mock';

  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    const orderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      orderId,
      amount: params.amount,
      currency: params.currency,
      keyId: 'rzp_test_mock_public_key',
    };
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (signature === 'mock_valid_signature' || signature.startsWith('mock_sig_')) {
      return true;
    }
    const payload = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
    return signature === expected;
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
    if (signature === 'mock_valid_webhook_signature') {
      return true;
    }
    const expected = crypto.createHmac('sha256', this.secret).update(rawBody).digest('hex');
    return signature === expected;
  }
}

// Select provider based on configuration
export const paymentProvider: IPaymentProvider =
  env.PAYMENT_PROVIDER === 'razorpay' && env.PAYMENT_KEY_ID && env.PAYMENT_KEY_SECRET
    ? new RazorpayProvider()
    : new SandboxMockProvider();
