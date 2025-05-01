
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlayCircle, Info } from 'lucide-react';
import TeamSetup from '@/components/TeamSetup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthProvider';
import YouTubeStreamManager from '@/components/YouTubeStreamManager';
import FacebookStreamManager from '@/components/FacebookStreamManager';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const StreamSetup = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  
  const [homeTeam, setHomeTeam] = useState({
    name: 'Home Team',
    color: '#1E88E5',
  });
  
  const [awayTeam, setAwayTeam] = useState({
    name: 'Away Team',
    color: '#E53935',
  });
  
  const [streamPlatform, setStreamPlatform] = useState('youtube');
  const [streamKey, setStreamKey] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  
  // Check if user signed in with YouTube/Google or Facebook
  const isYouTubeUser = user?.app_metadata?.provider === 'google';
  const isFacebookUser = user?.app_metadata?.provider === 'facebook';
  
  const handleStartStream = () => {
    // Validate team names
    if (homeTeam.name.trim() === '' || awayTeam.name.trim() === '') {
      toast.error('Setup error', {
        description: 'Please enter names for both teams'
      });
      return;
    }
    
    // For actual streaming, would validate stream key and URL here
    
    // Pass the team info to the stream page
    navigate('/stream', { 
      state: { 
        homeTeam: {
          ...homeTeam,
          score: 0
        },
        awayTeam: {
          ...awayTeam,
          score: 0
        },
        streamConfig: {
          platform: streamPlatform,
          key: streamKey,
          url: streamUrl
        }
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sportNavy to-black p-4">
      <div className="max-w-md mx-auto pt-6">
        <Button 
          variant="ghost" 
          className="text-white mb-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <h1 className="text-2xl font-bold text-white mb-6">Stream Setup</h1>
        
        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4 bg-white/10">
            <TabsTrigger value="teams" className="text-white data-[state=active]:bg-sportBlue">Teams</TabsTrigger>
            <TabsTrigger value="stream" className="text-white data-[state=active]:bg-sportBlue">Stream</TabsTrigger>
          </TabsList>
          
          <TabsContent value="teams" className="mt-2">
            <TeamSetup
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              onHomeTeamChange={setHomeTeam}
              onAwayTeamChange={setAwayTeam}
            />
          </TabsContent>
          
          <TabsContent value="stream" className="mt-2 space-y-6">
            {isYouTubeUser ? (
              <YouTubeStreamManager />
            ) : isFacebookUser ? (
              <FacebookStreamManager />
            ) : (
              <div className="bg-white/10 p-4 rounded-lg">
                <h3 className="text-xl font-bold mb-4 text-white">Stream Settings</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="platform" className="text-white">Platform</Label>
                    <Select
                      value={streamPlatform}
                      onValueChange={setStreamPlatform}
                    >
                      <SelectTrigger id="platform" className="bg-white/20 text-white border-white/30">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="twitch">Twitch</SelectItem>
                        <SelectItem value="custom">Custom RTMP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {streamPlatform === 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="streamUrl" className="text-white">RTMP URL</Label>
                      <Input
                        id="streamUrl"
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                        className="bg-white/20 text-white border-white/30"
                        placeholder="rtmp://your-streaming-url"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="streamKey" className="text-white">Stream Key</Label>
                    <Input
                      id="streamKey"
                      value={streamKey}
                      onChange={(e) => setStreamKey(e.target.value)}
                      className="bg-white/20 text-white border-white/30"
                      placeholder="Your stream key"
                      type="password"
                    />
                    <p className="text-xs text-white/60">
                      You'll need to provide a stream key from your platform
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-xl font-bold mb-4 text-white">Stream Information</h3>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="architecture" className="border-white/20">
                  <AccordionTrigger className="text-white hover:text-white/80">
                    <div className="flex items-center">
                      <Info className="mr-2 h-4 w-4" />
                      How Live Streaming Works
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-white/70 text-sm">
                    <p className="mb-2">Our streaming solution uses a multi-step process:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Your browser captures camera video using WebRTC</li>
                      <li>The video is sent to our secure relay server</li>
                      <li>Our server converts the stream to the RTMP format</li>
                      <li>The stream is delivered to platforms like Facebook Live</li>
                    </ol>
                    <p className="mt-2 text-xs text-white/60">
                      Note: Browser-based streaming has limitations. For professional use, consider using OBS Studio.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>
        </Tabs>
        
        <Button 
          className="mt-8 w-full bg-sportGreen hover:bg-sportGreen/80 text-white p-6"
          onClick={handleStartStream}
        >
          <PlayCircle className="mr-2 h-5 w-5" />
          Start Streaming
        </Button>
      </div>
    </div>
  );
};

export default StreamSetup;
