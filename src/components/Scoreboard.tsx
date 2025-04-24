
import React from 'react';
import { cn } from '@/lib/utils';

interface ScoreboardProps {
  homeTeam: {
    name: string;
    score: number;
    color: string;
  };
  awayTeam: {
    name: string;
    score: number;
    color: string;
  };
  period: number;
  className?: string;
  lastScored?: 'home' | 'away' | null;
}

const Scoreboard = ({
  homeTeam,
  awayTeam,
  period,
  className,
  lastScored,
}: ScoreboardProps) => {
  return (
    <div className={cn(
      'flex bg-black/80 text-white rounded-lg overflow-hidden w-full max-w-md',
      className
    )}>
      {/* Home Team */}
      <div className={cn(
        'flex-1 flex items-center',
        lastScored === 'home' ? 'animate-score-pulse' : ''
      )}>
        <div 
          className="w-2 h-full" 
          style={{ backgroundColor: homeTeam.color }}
        />
        <div className="flex-1 px-3 py-2 flex justify-between items-center">
          <span className="font-bold truncate max-w-28">{homeTeam.name}</span>
          <span className={cn(
            'text-2xl font-bold min-w-10 text-center',
            lastScored === 'home' ? 'text-sportYellow' : ''
          )}>
            {homeTeam.score}
          </span>
        </div>
      </div>

      {/* Period */}
      <div className="bg-sportNavy px-3 py-2 flex flex-col justify-center items-center">
        <span className="text-xs">PERIOD</span>
        <span className="text-xl font-bold">{period}</span>
      </div>

      {/* Away Team */}
      <div className={cn(
        'flex-1 flex items-center',
        lastScored === 'away' ? 'animate-score-pulse' : ''
      )}>
        <div className="flex-1 px-3 py-2 flex justify-between items-center">
          <span className={cn(
            'text-2xl font-bold min-w-10 text-center',
            lastScored === 'away' ? 'text-sportYellow' : ''
          )}>
            {awayTeam.score}
          </span>
          <span className="font-bold truncate max-w-28 text-right">{awayTeam.name}</span>
        </div>
        <div 
          className="w-2 h-full" 
          style={{ backgroundColor: awayTeam.color }}
        />
      </div>
    </div>
  );
};

export default Scoreboard;
