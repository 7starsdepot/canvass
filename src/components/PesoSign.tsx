import React from 'react';
import { PhilippinePeso } from 'lucide-react';

interface PesoSignProps {
  className?: string;
  size?: number;
}

export const PesoSign: React.FC<PesoSignProps> = ({ className = 'w-4 h-4', size }) => {
  return <PhilippinePeso className={className} size={size} />;
};

export default PesoSign;
