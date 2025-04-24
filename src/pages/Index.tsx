
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Camera, Settings, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sportNavy to-black p-4">
      <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-screen">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center">
            <Camera className="mr-2 h-8 w-8" /> 
            SportCast
          </h1>
          <p className="text-sportGray text-lg">
            Live stream sports with a professional scoreboard overlay
          </p>
        </div>
        
        <div className="grid gap-6 w-full">
          <Button 
            onClick={() => navigate('/setup')}
            size="lg"
            className="bg-sportBlue hover:bg-sportBlue/80 text-white p-6 text-xl"
          >
            <Camera className="mr-3 h-6 w-6" />
            Start New Stream
          </Button>
          
          <div className="grid grid-cols-2 gap-4 w-full">
            <Button 
              variant="outline"
              className="bg-white/10 hover:bg-white/20 border-white/30 text-white"
              onClick={() => {/* Will be implemented in future versions */}}
            >
              <Users className="mr-2 h-5 w-5" />
              Teams
            </Button>
            
            <Button 
              variant="outline"
              className="bg-white/10 hover:bg-white/20 border-white/30 text-white"
              onClick={() => {/* Will be implemented in future versions */}}
            >
              <Settings className="mr-2 h-5 w-5" />
              Settings
            </Button>
          </div>
        </div>
        
        <footer className="mt-auto pt-10 text-center text-sportGray/60 text-sm">
          <p>SportCast v1.0</p>
          <p className="mt-1">Stream sports games with professional overlays</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
