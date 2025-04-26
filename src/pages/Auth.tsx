
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Facebook } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Auth = () => {
  const navigate = useNavigate();

  const signInWithFacebook = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          scopes: 'publish_video', // Required for Facebook Live streaming
        },
      });

      if (error) throw error;
      
      // Redirect to home after successful login
      if (data) navigate('/');
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
          By continuing, you agree to SportCast's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
