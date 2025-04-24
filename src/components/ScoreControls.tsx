
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';

interface ScoreControlsProps {
  onHomeScoreChange: (amount: number) => void;
  onAwayScoreChange: (amount: number) => void;
  onPeriodChange: (amount: number) => void;
  onReset: () => void;
  className?: string;
}

const ScoreControls = ({
  onHomeScoreChange,
  onAwayScoreChange,
  onPeriodChange,
  onReset,
  className
}: ScoreControlsProps) => {
  return (
    <div className={`grid grid-cols-2 gap-4 w-full ${className}`}>
      <div className="bg-black/40 p-4 rounded-lg">
        <h3 className="text-white font-bold mb-2 text-center">HOME</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 bg-sportBlue hover:bg-sportBlue/80 text-white"
            onClick={() => onHomeScoreChange(1)}
          >
            <PlusCircle className="mr-1 h-4 w-4" /> +1
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 bg-sportRed hover:bg-sportRed/80 text-white"
            onClick={() => onHomeScoreChange(-1)}
          >
            <MinusCircle className="mr-1 h-4 w-4" /> -1
          </Button>
        </div>
      </div>

      <div className="bg-black/40 p-4 rounded-lg">
        <h3 className="text-white font-bold mb-2 text-center">AWAY</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 bg-sportBlue hover:bg-sportBlue/80 text-white"
            onClick={() => onAwayScoreChange(1)}
          >
            <PlusCircle className="mr-1 h-4 w-4" /> +1
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 bg-sportRed hover:bg-sportRed/80 text-white"
            onClick={() => onAwayScoreChange(-1)}
          >
            <MinusCircle className="mr-1 h-4 w-4" /> -1
          </Button>
        </div>
      </div>

      <div className="bg-black/40 p-4 rounded-lg">
        <h3 className="text-white font-bold mb-2 text-center">PERIOD</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 bg-sportPurple hover:bg-sportPurple/80 text-white"
            onClick={() => onPeriodChange(1)}
          >
            <PlusCircle className="mr-1 h-4 w-4" /> Next
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 bg-sportPurple/60 hover:bg-sportPurple/50 text-white"
            onClick={() => onPeriodChange(-1)}
          >
            <MinusCircle className="mr-1 h-4 w-4" /> Prev
          </Button>
        </div>
      </div>

      <div className="bg-black/40 p-4 rounded-lg">
        <h3 className="text-white font-bold mb-2 text-center">RESET</h3>
        <Button 
          variant="outline" 
          className="w-full bg-sportOrange hover:bg-sportOrange/80 text-white"
          onClick={onReset}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Reset All
        </Button>
      </div>
    </div>
  );
};

export default ScoreControls;
