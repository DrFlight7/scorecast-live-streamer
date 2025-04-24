
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface TeamSetupProps {
  homeTeam: {
    name: string;
    color: string;
  };
  awayTeam: {
    name: string;
    color: string;
  };
  onHomeTeamChange: (team: { name: string; color: string }) => void;
  onAwayTeamChange: (team: { name: string; color: string }) => void;
  className?: string;
}

const TeamSetup = ({
  homeTeam,
  awayTeam,
  onHomeTeamChange,
  onAwayTeamChange,
  className
}: TeamSetupProps) => {
  const colorOptions = [
    { value: '#1E88E5', label: 'Blue' },
    { value: '#E53935', label: 'Red' },
    { value: '#43A047', label: 'Green' },
    { value: '#FB8C00', label: 'Orange' },
    { value: '#8E24AA', label: 'Purple' },
    { value: '#FFD600', label: 'Yellow' },
    { value: '#F5F5F5', label: 'White' },
    { value: '#212121', label: 'Black' },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white/10 p-4 rounded-lg">
        <h3 className="text-xl font-bold mb-4 text-white">Home Team</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="homeName" className="text-white">Team Name</Label>
            <Input
              id="homeName"
              value={homeTeam.name}
              onChange={(e) => onHomeTeamChange({ ...homeTeam, name: e.target.value })}
              className="bg-white/20 text-white border-white/30"
              placeholder="Home Team"
              maxLength={15}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="homeColor" className="text-white">Team Color</Label>
            <Select
              value={homeTeam.color}
              onValueChange={(value) => onHomeTeamChange({ ...homeTeam, color: value })}
            >
              <SelectTrigger id="homeColor" className="bg-white/20 text-white border-white/30">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white/10 p-4 rounded-lg">
        <h3 className="text-xl font-bold mb-4 text-white">Away Team</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="awayName" className="text-white">Team Name</Label>
            <Input
              id="awayName"
              value={awayTeam.name}
              onChange={(e) => onAwayTeamChange({ ...awayTeam, name: e.target.value })}
              className="bg-white/20 text-white border-white/30"
              placeholder="Away Team"
              maxLength={15}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="awayColor" className="text-white">Team Color</Label>
            <Select
              value={awayTeam.color}
              onValueChange={(value) => onAwayTeamChange({ ...awayTeam, color: value })}
            >
              <SelectTrigger id="awayColor" className="bg-white/20 text-white border-white/30">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-2" 
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamSetup;
