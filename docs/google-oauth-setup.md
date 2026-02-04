# Google OAuth Setup Guide - PlanifAI

## Overview
This guide will help you configure Google OAuth authentication for PlanifAI using Supabase.

---

## ✅ Frontend Implementation Status

The frontend is **ready** and waiting for Supabase configuration:

- ✅ `signInWithGoogle()` method in AuthContext
- ✅ Google button connected in AuthScreen
- ✅ Error handling implemented
- ✅ OAuth redirect flow configured
- ⏸️ **Waiting for Supabase Google OAuth setup**

---

## 🔧 Supabase Configuration Steps

### Step 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click "Select a project" → "New Project"
   - Name: "PlanifAI" (or your preferred name)
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "PlanifAI Web Client"

5. **Configure Authorized Redirect URIs**
   
   You need to add your Supabase callback URL:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   
   **Where to find your project ref:**
   - Go to your Supabase dashboard
   - Project Settings → API
   - Copy the "Project URL" (it looks like `https://xxxxx.supabase.co`)
   - Your callback URL will be: `https://xxxxx.supabase.co/auth/v1/callback`
   
   **For local development**, also add:
   ```
   http://localhost:5173/auth/callback
   http://127.0.0.1:5173/auth/callback
   ```

6. **Save and Copy Credentials**
   - Click "Create"
   - **Copy the Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
   - **Copy the Client Secret**
   - Keep these safe! You'll need them in the next step

---

### Step 2: Configure Supabase

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com/
   - Select your PlanifAI project

2. **Navigate to Authentication Settings**
   - Sidebar: **Authentication** → **Providers**
   - Find "Google" in the list

3. **Enable Google Provider**
   - Toggle "Google Enabled" to **ON**

4. **Add Google Credentials**
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: Paste from Google Cloud Console
   - Click "Save"

5. **Configure Redirect URLs** (Optional but recommended)
   - Go to **Authentication** → **URL Configuration**
   - Site URL: `http://localhost:5173` (for development)
   - Redirect URLs: Add your production URL when deploying

---

### Step 3: Test the Integration

1. **Clear your browser cache** (or use incognito mode)

2. **Open your PlanifAI app**
   ```bash
   # Should already be running from:
   npm run dev
   ```

3. **Try Google Sign-In**
   - Open the app in your browser
   - Click "Continuar con Google" button
   - You should be redirected to Google's login page
   - Select your Google account
   - Grant permissions
   - You should be redirected back to your app, logged in! ✅

---

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"
**Problem**: The redirect URI you're using doesn't match what's in Google Cloud Console

**Solution**:
1. Check the error message for the exact redirect URI being used
2. Add that exact URI to "Authorized redirect URIs" in Google Cloud Console
3. Make sure there are no trailing slashes or typos.

**Para tu proyecto, la URL EXACTA que debes añadir es:**
```
https://ftybizjyqoezsmiqfmun.supabase.co/auth/v1/callback
```

### Error: "Access blocked: This app's request is invalid"
**Problem**: Google OAuth hasn't been properly configured

**Solution**:
1. Make sure Google+ API is enabled
2. Verify OAuth consent screen is configured
3. Check that the Client ID and Secret are correct in Supabase

### Error: "Unsupported provider: missing OAuth secret"
**Problem**: You enabled Google in Supabase but forgot to paste the **Client Secret**.

**Solution**:
1. Go to Google Cloud Console → Credentials.
2. Copy the **Client Secret**.
3. Go to Supabase Dashboard → Authentication → Providers → Google.
4. Paste the **Client Secret** and click **Save**.

### User logs in but no profile is created
**Problem**: The profile trigger might not be handling OAuth users

**Solution**:
1. Check if the profile was created:
   ```sql
   SELECT * FROM profiles WHERE id = '<user-id>';
   ```
2. If not, the trigger should create it automatically
3. Check Supabase logs for errors

### OAuth works but user is redirected to wrong URL
**Problem**: Redirect URL configuration issue

**Solution**:
- Update `redirectTo` in AuthContext if needed:
  ```typescript
  signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://yourapp.com', // Your production URL
    },
  })
  ```

---

## 🔐 Security Considerations

### ✅ Best Practices

1. **Client Secret Protection**
   - Never commit Client Secret to Git
   - Only store in Supabase dashboard
   - Rotate if exposed

2. **Redirect URI Validation**
   - Only add trusted domains to Google Cloud Console
   - Remove localhost URIs in production

3. **OAuth Scopes**
   - Supabase requests minimal scopes by default
   - Only email and basic profile info

4. **Profile Creation**
   - The `handle_new_user()` trigger automatically creates a profile
   - Username extracted from email by default
   - Can be updated later in Account Settings

---

## 📋 Configuration Checklist

Use this checklist to verify everything is set up:

### Google Cloud Console
- [ ] Project created
- [ ] Google+ API enabled
- [ ] OAuth client ID created
- [ ] Authorized redirect URIs added (Supabase callback URL)
- [ ] Client ID copied
- [ ] Client Secret copied

### Supabase Dashboard
- [ ] Google provider enabled
- [ ] Client ID pasted
- [ ] Client Secret pasted
- [ ] Configuration saved

### Testing
- [ ] Google Sign-In button appears
- [ ] Clicking button redirects to Google
- [ ] Can select Google account
- [ ] Redirected back to app after auth
- [ ] User is logged in
- [ ] Profile created in database
- [ ] User can access app features

---

## 🚀 Production Deployment

When deploying to production:

1. **Add production domain to Google Cloud Console**
   ```
   https://yourapp.com/auth/callback
   https://<your-project>.supabase.co/auth/v1/callback
   ```

2. **Update Site URL in Supabase**
   - Authentication → URL Configuration
   - Set Site URL to your production domain

3. **Test OAuth flow in production**
   - Verify redirect URIs work
   - Check error handling
   - Test on different browsers

---

## 📁 Files Modified in This Implementation

```
src/contexts/AuthContext.tsx
  + Added signInWithGoogle() method
  + OAuth redirect to window.location.origin
  
src/components/AuthScreen.tsx
  + Connected Google button to signInWithGoogle()
  + Error handling for OAuth failures
  + Loading state during redirect
```

---

## 🎯 Next Steps After OAuth Setup

Once Google Sign-In is working:

1. **Test user experience**
   - Sign in with Google
   - Verify profile data
   - Check app functionality

2. **Monitor usage**
   - Check Supabase Auth logs
   - Monitor Google Cloud Console quota

3. **Consider adding Apple Sign-In** (future)
   - Similar setup process
   - Requires Apple Developer account

---

## 📞 Support Resources

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/social-login/auth-google
- **Google OAuth Setup**: https://developers.google.com/identity/protocols/oauth2
- **Your Supabase Project**: https://app.supabase.com/project/_/settings/auth

---

**Status**: ⏸️ Waiting for Google OAuth configuration in Supabase  
**Estimated Setup Time**: 10-15 minutes  
**Difficulty**: Easy (following steps in order)
