import type { APIRoute } from 'astro';
import { createPayPalOrder } from '~/lib/paypal';
import { supabase } from '~/lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { courseId, courseTitle, price, userId, userEmail } = await request.json();

    // Validate input
    if (!courseId || !courseTitle || !price || !userId || !userEmail) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create PayPal order
    const order = await createPayPalOrder({
      courseId,
      courseTitle,
      price,
      userId,
      userEmail
    });

    return new Response(JSON.stringify({ 
      orderId: order.id,
      approvalUrl: order.links?.find(link => link.rel === 'approve')?.href
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create PayPal order error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create PayPal order' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 