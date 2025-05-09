import React, { useState, useEffect } from 'react';
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
import StreamingServerStatus from '@/components/StreamingServerStatus';
import { SERVER_ENDPOINTS, checkServerHealth } from '@/utils/serverHealthCheck';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Expanded list of possible Railway servers to try
const RAILWAY_SERVER_ENDPOINTS = [
  'https://scorecast-live-streamer-production.up.railway.app',
  'https://scorecast-live-streamer-production.railway.app',
  'https://scorecast-live-streamer.up.railway.app',
  'https://scorecast-live-production.up.railway.app',
  'https://scorecast-live-production.railway.app'
];

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
  
  // State to track if Railway server is available
  const [isRailwayAvailable, setIsRailwayAvailable] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [railwayServerUrl, setRailwayServerUrl] = useState(SERVER_ENDPOINTS[0]);
  
  // Check if user signed in with YouTube/Google or Facebook
  const isYouTubeUser = user?.app_metadata?.provider === 'google';
  const isFacebookUser = user?.app_metadata?.provider === 'facebook';
  
  // Check Railway server status on mount
  useEffect(() => {
    const checkRailwayStatus = async () => {
      setIsCheckingServer(true);
      
      try {
        console.log('Checking Railway server status...');
        const healthStatus = await checkServerHealth();
        
        if (healthStatus.status === 'online') {
          setIsRailwayAvailable(true);
          console.log('Railway server is available');
        } else {
          setIsRailwayAvailable(false);
          console.log('Railway server is not available');
        }
      } catch (err) {
        console.error('Error checking Railway server status:', err);
        setIsRailwayAvailable(false);
      }
      
      setIsCheckingServer(false);
    };
    
    checkRailwayStatus();
  }, []);
  
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
          <TabsList className="grid grid-cols-3 mb-4 bg-white/10">
            <TabsTrigger value="teams" className="text-white data-[state=active]:bg-sportBlue">Teams</TabsTrigger>
            <TabsTrigger value="stream" className="text-white data-[state=active]:bg-sportBlue">Stream</TabsTrigger>
            <TabsTrigger value="server" className="text-white data-[state=active]:bg-sportBlue">Server</TabsTrigger>
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
                    <p className="mb-2">Our streaming solution uses a complete end-to-end process:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Your browser captures camera video using WebRTC</li>
                      <li>The video is sent to our Railway FFmpeg server via WebSockets</li>
                      <li>The Railway server processes the stream with FFmpeg</li>
                      <li>FFmpeg converts and delivers the stream to Facebook Live</li>
                    </ol>
                    <div className="flex items-center mt-2 bg-green-900/30 border border-green-500/30 p-2 rounded">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                      <p className="text-xs text-green-300">
                        Production-ready streaming via Railway
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>
          
          <TabsContent value="server" className="mt-2 space-y-6">
            <StreamingServerStatus serverUrl={railwayServerUrl} />
            
            <div className="bg-white/10 p-4 rounded-lg space-y-4">
              <h3 className="text-lg font-bold text-white">Production Streaming Architecture</h3>
              
              <div className="bg-black/30 p-3 rounded">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-white text-sm font-medium">Railway FFmpeg Server</span>
                </div>
                <p className="text-sm text-white/70">
                  Our production system uses a dedicated Railway server running FFmpeg to process and relay your streams to platforms like Facebook.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/30 p-3 rounded">
                  <div className="text-xs text-white/60 mb-1">Features</div>
                  <ul className="text-sm text-white/80 list-disc pl-4 space-y-1">
                    <li>Real-time transcoding</li>
                    <li>Multiple quality options</li>
                    <li>Platform integration</li>
                    <li>Stream monitoring</li>
                  </ul>
                </div>
                
                <div className="bg-black/30 p-3 rounded">
                  <div className="text-xs text-white/60 mb-1">Benefits</div>
                  <ul className="text-sm text-white/80 list-disc pl-4 space-y-1">
                    <li>Higher stream quality</li>
                    <li>Better reliability</li>
                    <li>Low latency</li>
                    <li>Bandwidth optimization</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-black/30 p-3 rounded">
                <div className="text-xs text-white/60 mb-1">Server Status</div>
                <div className="flex items-center">
                  {isCheckingServer ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
                      <span className="text-sm text-white">Checking server status...</span>
                    </>
                  ) : (
                    <>
                      <div className={`w-2 h-2 rounded-full ${isRailwayAvailable ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                      <span className="text-sm text-white">
                        {isRailwayAvailable ? 'Railway FFmpeg server is online' : 'Railway FFmpeg server is offline'}
                      </span>
                    </>
                  )}
                </div>
                {isRailwayAvailable && (
                  <p className="text-xs text-green-500 mt-2">
                    Connected to: {railwayServerUrl}
                  </p>
                )}
              </div>
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
