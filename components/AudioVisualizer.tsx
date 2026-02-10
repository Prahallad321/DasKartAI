import React, { useEffect, useRef } from 'react';
import { AudioVisualizerProps } from '../types';

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  analyser, 
  className = "",
  barColor = "#3b82f6" 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Circular visualization
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) / 3;

      ctx.beginPath();
      // Draw a subtle base circle
      ctx.arc(cx, cy, radius - 5, 0, 2 * Math.PI);
      ctx.strokeStyle = `${barColor}33`; // low opacity
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw frequency bars radiating out
      const barWidth = (2 * Math.PI) / (bufferLength / 2); // Use half buffer for cleaner look
      
      for (let i = 0; i < bufferLength / 2; i++) {
        const value = dataArray[i];
        const barHeight = (value / 255) * (radius * 0.8);
        const angle = i * barWidth;

        // Symmetric drawing (two sides)
        for (let j = 0; j < 2; j++) {
            const rotAngle = j === 0 ? angle : -angle;
            
            const x1 = cx + Math.cos(rotAngle - Math.PI/2) * radius;
            const y1 = cy + Math.sin(rotAngle - Math.PI/2) * radius;
            const x2 = cx + Math.cos(rotAngle - Math.PI/2) * (radius + barHeight);
            const y2 = cy + Math.sin(rotAngle - Math.PI/2) * (radius + barHeight);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = barColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, barColor]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current && canvasRef.current.parentElement) {
            canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
            canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full ${className}`}
    />
  );
};
