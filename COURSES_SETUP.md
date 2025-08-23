# Courses System Setup Guide

This guide will help you set up a complete courses system with user authentication and PayPal payments for your Pine Tree Magick website.

## 🚀 What We've Built

- **Course Content Type**: Structured course data with lessons, resources, and metadata
- **User Authentication**: Sign up, sign in, password reset functionality via Supabase
- **User Dashboard**: View purchased courses and track progress
- **Course Access Control**: Only users who purchased courses can access them
- **Progress Tracking**: Track lesson completion and course progress
- **PayPal Integration**: Secure payment processing for course purchases
- **Webhook Handling**: Automatic course access after successful payment

## 📋 Prerequisites

1. **Supabase Account**: Free tier is sufficient to start
2. **PayPal Developer Account**: For payment processing
3. **Node.js**: Version 18+ (you already have this)
4. **Astro Project**: Your existing Pine Tree Magick site

## 🔧 Step 1: Set Up Supabase

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Choose a project name (e.g., "pinetree-magick-courses")
4. Set a database password (save this!)
5. Choose a region close to your users

### 1.2 Get Your Credentials
1. Go to Project Settings → API
2. Copy your Project URL and anon/public key
3. Create a `.env` file in your project root with these variables:

```bash
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id_here

# Site Configuration
SITE_URL=http://localhost:4321
NODE_ENV=development
```

## 🗄️ Step 2: Set Up Database Tables

### 2.1 Create Tables in Supabase
Run these SQL commands in your Supabase SQL Editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create course_purchases table
CREATE TABLE course_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_progress table
CREATE TABLE user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE course_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own course purchases" ON course_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own course purchases" ON course_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_course_purchases_user_id ON course_purchases(user_id);
CREATE INDEX idx_course_purchases_course_id ON course_purchases(course_id);
CREATE INDEX idx_user_progress_user_course ON user_progress(user_id, course_id);
```

## 💳 Step 3: Set Up PayPal

### 3.1 Create PayPal Developer Account
1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Sign up/Login with your PayPal account
3. Go to "My Apps & Credentials"
4. Create a new app for your website

### 3.2 Get PayPal Credentials
1. Copy your Client ID and Client Secret
2. Add them to your `.env` file
3. For production, use Live credentials; for testing, use Sandbox

### 3.3 Set Up PayPal Webhook
1. In PayPal Developer Dashboard, go to Webhooks
2. Add a new webhook with URL: `https://yoursite.com/api/paypal-webhook`
3. Select these events:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
4. Copy the Webhook ID and add to your `.env` file

## 🔐 Step 4: Configure Authentication

### 4.1 Set Up Email Templates
1. Go to Authentication → Email Templates in Supabase
2. Customize the confirmation and reset password emails
3. Update the site URL to match your domain

### 4.2 Configure Auth Settings
1. Go to Authentication → Settings
2. Set your site URL
3. Configure redirect URLs (add `/dashboard`, `/login`)
4. Enable email confirmations if desired

## 📚 Step 5: Create Your First Course

### 5.1 Add Course Content
1. Create course files in `src/content/course/`
2. Use the sample `astrology-basics.mdx` as a template
3. Add your course images to `src/assets/images/courses/`

### 5.2 Course Structure
Each course should include:
- **Frontmatter**: Title, description, price, lessons, etc.
- **Content**: MDX content with your course material
- **Lessons**: Structured lesson data with videos/resources

## 🛒 Step 6: Test PayPal Integration

### 6.1 Test Purchase Flow
1. Start your dev server: `npm run dev`
2. Visit `/test-connection` to verify Supabase connection
3. Create a test user account
4. Try purchasing a course with PayPal Sandbox

### 6.2 PayPal Sandbox Testing
1. Use PayPal Sandbox accounts for testing
2. Create test buyer and seller accounts
3. Test the complete purchase flow
4. Verify webhook receives payment notifications

## 🎯 Step 7: Test Your System

### 7.1 Test User Flow
1. Create a test user account
2. Manually add a course purchase in Supabase
3. Test login and dashboard access
4. Verify course access control

### 7.2 Test Course Access
1. Try accessing a course without purchase
2. Purchase a course and verify access
3. Test progress tracking

## 🚀 Step 8: Deploy

### 8.1 Environment Variables
Ensure your `.env` file is properly configured for production

### 8.2 Build and Deploy
```bash
npm run build
npm run preview
```

## 📱 Available Pages

- `/login` - User authentication
- `/dashboard` - User dashboard (protected)
- `/course/[slug]` - Individual course pages (protected)
- `/courses` - Course catalog (public)
- `/test-connection` - Test Supabase connection

## 🔧 Customization Options

### Course Features
- Add video streaming
- Include downloadable resources
- Add quizzes/assessments
- Implement certificates
- Add discussion forums

### Payment Features
- Multiple payment methods
- Subscription billing
- Payment plans
- Refund handling
- Tax calculations

### User Experience
- Email notifications
- Progress reminders
- Course recommendations
- Social features
- Mobile optimization

## 🆘 Troubleshooting

### Common Issues
1. **Authentication errors**: Check Supabase credentials
2. **Database errors**: Verify table structure and RLS policies
3. **PayPal errors**: Check credentials and webhook configuration
4. **Build errors**: Ensure all imports are correct
5. **Environment variables**: Verify `.env` file setup

### Testing PayPal
1. **Sandbox vs Live**: Ensure you're using the right environment
2. **Webhook URLs**: Verify webhook endpoint is accessible
3. **Event Selection**: Ensure correct PayPal events are selected
4. **Signature Verification**: Check webhook signature validation

### Getting Help
- Check Supabase documentation
- Review PayPal Developer documentation
- Check Astro documentation
- Check browser console for errors
- Verify database permissions

## 🎉 Next Steps

1. **Add more courses** to your content
2. **Implement advanced payment features** (subscriptions, payment plans)
3. **Add analytics and tracking**
4. **Create admin dashboard**
5. **Add email marketing integration**
6. **Implement course certificates**
7. **Add mobile app support**

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Webhook Verification**: Implement proper PayPal webhook signature verification
3. **User Authentication**: Use Supabase RLS policies for data access control
4. **Payment Security**: Always use HTTPS in production
5. **Input Validation**: Validate all user inputs and API requests

Your courses system is now ready to help students learn astrology and magick with secure PayPal payments! 🌟 