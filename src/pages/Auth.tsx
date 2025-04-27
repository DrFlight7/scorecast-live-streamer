
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Facebook } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Auth = () => {
  const navigate = useNavigate();

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
            // Successfully logged in - redirect to home
            navigate('/');
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
      // Get the current domain (either preview URL or local development)
      const redirectUrl = window.location.origin.includes('localhost') 
        ? 'https://preview--scorecast-live-streamer.lovable.app/auth'
        : window.location.origin + '/auth';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-sportNavy to-black p-4">
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-screen">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to SportCast</h1>
          <p className="text-sportGray">Sign in to start streaming your sports events</p>
        </div>

        <Button 
          onClick={signInWithFacebook}
          size="lg"
          className="w-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
        >
          <Facebook className="mr-2 h-5 w-5" />
          Continue with Facebook
        </Button>

        <p className="mt-6 text-sm text-sportGray/60 text-center">
          By continuing, you agree to SportCast's <a href="/terms" className="underline hover:text-white">Terms of Service</a> and <a href="/privacy" className="underline hover:text-white">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default Auth;
