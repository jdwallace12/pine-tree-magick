import paypal from '@paypal/paypal-server-sdk';

// Configure PayPal environment
const environment = process.env.NODE_ENV === 'production' 
  ? new paypal.core.LiveEnvironment(
      process.env.PAYPAL_CLIENT_ID!,
      process.env.PAYPAL_CLIENT_SECRET!
    )
  : new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID!,
      process.env.PAYPAL_CLIENT_SECRET!
    );

const client = new paypal.core.PayPalHttpClient(environment);

export interface CoursePurchase {
  courseId: string;
  courseTitle: string;
  price: number;
  userId: string;
  userEmail: string;
}

export async function createPayPalOrder(purchase: CoursePurchase) {
  const request = new paypal.orders.OrdersCreateRequest();
  
  request.prefer("return=representation");
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: purchase.courseId,
      description: `Course: ${purchase.courseTitle}`,
      amount: {
        currency_code: 'USD',
        value: purchase.price.toString(),
      },
      custom_id: purchase.userId, // Store user ID for webhook processing
    }],
    application_context: {
      return_url: `${process.env.SITE_URL}/payment/success?courseId=${purchase.courseId}`,
      cancel_url: `${process.env.SITE_URL}/payment/cancelled`,
      brand_name: 'Pine Tree Magick',
      landing_page: 'BILLING',
      user_action: 'PAY_NOW',
    },
  });

  try {
    const order = await client.execute(request);
    return order.result;
  } catch (error) {
    console.error('PayPal order creation error:', error);
    throw new Error('Failed to create PayPal order');
  }
}

export async function capturePayPalPayment(orderId: string) {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const capture = await client.execute(request);
    return capture.result;
  } catch (error) {
    console.error('PayPal capture error:', error);
    throw new Error('Failed to capture PayPal payment');
  }
}

export async function getPayPalOrder(orderId: string) {
  const request = new paypal.orders.OrdersGetRequest(orderId);

  try {
    const order = await client.execute(request);
    return order.result;
  } catch (error) {
    console.error('PayPal order retrieval error:', error);
    throw new Error('Failed to retrieve PayPal order');
  }
}

// Verify webhook signature (for production use)
export function verifyWebhookSignature(
  body: string,
  headers: Record<string, string>,
  webhookId: string
) {
  // This is a simplified verification
  // In production, you should use PayPal's webhook verification
  const transmissionId = headers['paypal-transmission-id'];
  const timestamp = headers['paypal-transmission-time'];
  const certUrl = headers['paypal-cert-url'];
  const authAlgo = headers['paypal-auth-algo'];
  const transmissionSig = headers['paypal-transmission-sig'];

  if (!transmissionId || !timestamp || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  // For now, return true if all headers are present
  // In production, implement proper signature verification
  return true;
} 