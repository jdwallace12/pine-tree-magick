import type { APIRoute } from 'astro';
import { capturePayPalPayment, verifyWebhookSignature } from '~/lib/paypal';
import { supabase } from '~/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    
    // Verify webhook signature (in production, implement proper verification)
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId || !verifyWebhookSignature(body, headers, webhookId)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid webhook signature' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const event = JSON.parse(body);
    
    // Handle payment capture events
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const capture = event.resource;
      const orderId = capture.supplementary_data?.related_ids?.order_id;
      
      if (orderId) {
        // Get order details to find course and user info
        const order = await capturePayPalPayment(orderId);
        const purchaseUnit = order.purchase_units?.[0];
        
        if (purchaseUnit) {
          const courseId = purchaseUnit.reference_id;
          const userId = purchaseUnit.custom_id;
          
          // Add course purchase to database
          const { error: insertError } = await supabase
            .from('course_purchases')
            .insert({
              user_id: userId,
              course_id: courseId,
              status: 'active',
              purchased_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error inserting course purchase:', insertError);
            return new Response(JSON.stringify({ 
              error: 'Failed to record course purchase' 
            }), { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      status: 'success' 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('PayPal webhook error:', error);
    return new Response(JSON.stringify({ 
      error: 'Webhook processing failed' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 