
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import TeamSetup from '@/components/TeamSetup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const StreamSetup = () => {
  const navigate = useNavigate();
  
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
  
  const handleStartStream = () => {
    // For demo purposes, we'll validate but not actually send the RTMP stream
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
                    *For this demo, the stream key isn't required
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-xl font-bold mb-4 text-white">Simulated Stream</h3>
              <p className="text-sm text-white/60 mb-4">
                For demonstration purposes, this app simulates streaming rather than sending an actual RTMP stream.
              </p>
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
