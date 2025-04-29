
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Facebook, Youtube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Auth = () => {
  const navigate = useNavigate();
  const previewUrl = 'https://preview--scorecast-live-streamer.lovable.app/auth';

  // Check if we have a hash in the URL (which happens after OAuth callback)
  useEffect(() => {
    // If we have a hash in the URL, it means we're being redirected back from auth
    const handleAuthCallback = async () => {
      const hashParams = window.location.hash;
      if (hashParams) {
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }
          
          if (data?.session) {
            // Successfully logged in - redirect to setup
            navigate('/setup');
            toast.success('Successfully logged in');
          }
        } catch (error) {
          console.error('Auth callback error:', error);
          toast.error('Login failed', {
            description: 'Please try again or contact support if the problem persists.'
          });
        }
      }
    };

    handleAuthCallback();
  }, [navigate]);

  const signInWithFacebook = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: previewUrl,
          scopes: 'email',
        },
      });

      if (error) throw error;
      
      // Redirect happens automatically
    } catch (error) {
      console.error('Facebook auth error:', error);
      toast.error('Login failed', {
        description: 'Please try again or contact support if the problem persists.'
      });
    }
  };

  const signInWithYouTube = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: previewUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            // Include YouTube scope to access YouTube data and live streaming capabilities
            scope: 'email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl',
          },
        },
      });

      if (error) throw error;
      
      // Redirect happens automatically
    } catch (error) {
      console.error('YouTube auth error:', error);
      toast.error('Login failed', {
        description: 'Please try again or contact support if the problem persists.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sportNavy to-black p-4">
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-screen">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to SportCast</h1>
          <p className="text-sportGray">Sign in to start streaming your sports events</p>
          {window.location.hostname === 'localhost' && (
            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded text-yellow-200 text-sm">
              <p className="font-bold">⚠️ Local Development Notice</p>
              <p>OAuth is configured for the preview URL. To avoid redirect issues:</p>
              <ol className="list-decimal list-inside mt-2 text-left">
                <li>Use the preview URL: {previewUrl}</li>
                <li>Or update your OAuth provider settings to include localhost</li>
              </ol>
            </div>
          )}
        </div>
        
        <div className="w-full space-y-4">
          <Button 
            onClick={signInWithFacebook}
            size="lg"
            className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
          >
            <Facebook className="mr-2 h-5 w-5" />
            Continue with Facebook
          </Button>
          
          <Button 
            onClick={signInWithYouTube}
            size="lg"
            className="w-full bg-[#FF0000] hover:bg-[#FF0000]/90 text-white"
          >
            <Youtube className="mr-2 h-5 w-5" />
            Continue with YouTube
          </Button>
        </div>

        <p className="mt-6 text-sm text-sportGray/60 text-center">
          By continuing, you agree to SportCast's <a href="/terms" className="underline hover:text-white">Terms of Service</a> and <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>
        </p>
        <p className="mt-6 text-sm text-sportGray/60 text-center">
          Owned and Developed by: Marco Marvin L. Rado, DIT
        </p>
      </div>
    </div>
  );
};

export default Auth;
