import React, { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  BarChart3, 
  Volume2,
  Play,
  Pause
} from 'lucide-react';

const MusicVisualizer = ({ audioRef }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const dataArrayRef = useRef(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Click Start Visualizer to begin');
  const [error, setError] = useState(null);

  const initializeAudioContext = async () => {
    try {
      setError(null);
      setDebugInfo('Initializing audio context...');
      
      if (!audioRef?.current) {
        throw new Error('Audio element not found');
      }

      console.log('Audio element found:', audioRef.current);

      // Check browser support
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        throw new Error('Web Audio API not supported');
      }

      // Create audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        console.log('AudioContext created:', audioContextRef.current.state);
      }

      // Resume context if needed
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('AudioContext resumed:', audioContextRef.current.state);
      }

      // Create analyser
      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128; // Smaller for better performance
        analyserRef.current.smoothingTimeConstant = 0.8;
        console.log('Analyser created with fftSize:', analyserRef.current.fftSize);
      }

      // Create data array
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      console.log('Data array created with length:', bufferLength);

      // Connect audio source (only once)
      if (!sourceRef.current) {
        try {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          console.log('Audio source connected successfully');
          console.log('Source node:', sourceRef.current);
          console.log('Analyser node:', analyserRef.current);
        } catch (sourceError) {
          console.error('Error creating media element source:', sourceError);
          
          // Try alternative approach - create a new audio element
          try {
            const newAudio = new Audio();
            newAudio.src = audioRef.current.src;
            newAudio.crossOrigin = 'anonymous';
            sourceRef.current = audioContextRef.current.createMediaElementSource(newAudio);
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
            console.log('Alternative audio source created and connected');
          } catch (altError) {
            console.error('Alternative source creation failed:', altError);
            throw new Error('Could not connect audio source: ' + sourceError.message);
          }
        }
      }

      setIsInitialized(true);
      setDebugInfo('Initializing continuous visualization...');
      console.log('Visualizer fully initialized - starting continuous mode');

    } catch (error) {
      console.error('Initialization error:', error);
      setError(error.message);
      setDebugInfo(`Error: ${error.message}`);
    }
  };

  // Auto-start visualization when initialized
  useEffect(() => {
    if (isInitialized && analyserRef.current && canvasRef.current) {
      console.log('Auto-starting visualization (always-on mode)');
      startVisualization();
      setDebugInfo('Visualizer active - always running');
    }
  }, [isInitialized]);

  // Optional: Still listen to audio events for status updates
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    const handlePlay = () => {
      console.log('Audio play detected');
      setDebugInfo('Audio playing - visualizing');
    };

    const handlePause = () => {
      console.log('Audio pause detected');
      setDebugInfo('Audio paused - still visualizing');
    };

    const handleEnded = () => {
      console.log('Audio ended');
      setDebugInfo('Audio ended - still visualizing');
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef]);

  // Canvas resize removed - using fixed dimensions

  const animate = () => {
    // Check if we should continue animating
    if (!isInitialized || !analyserRef.current || !canvasRef.current || !dataArrayRef.current) {
      return;
    }

    // Get frequency data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Check if we're getting audio data
    let hasData = false;
    let maxValue = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      if (dataArrayRef.current[i] > 0) {
        hasData = true;
        maxValue = Math.max(maxValue, dataArrayRef.current[i]);
      }
    }
    
    if (hasData) {
      setDebugInfo(`Live - Max: ${maxValue}`);
    } else {
      setDebugInfo('Ready - no audio signal');
    }

    // Draw visualization (always draw, even if no audio)
    drawBars();

    // Continue animation continuously when initialized
    if (isInitialized) {
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  const drawBars = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dataArray = dataArrayRef.current;
    
    if (!canvas || !ctx || !dataArray) return;

    // Set canvas dimensions
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas with dark background
    ctx.fillStyle = 'rgb(17, 24, 39)'; // gray-900
    ctx.fillRect(0, 0, width, height);

    // Draw bars
    const barWidth = width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * height * 0.8;

      // Create gradient
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, '#f97316'); // orange-500
      gradient.addColorStop(1, '#fed7aa'); // orange-200

      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

      x += barWidth;
    }
  };

  const startVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    console.log('Starting continuous visualization');
    animate();
  };

  // Test function to verify canvas is working
  const testCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!canvas || !ctx) {
      setDebugInfo('Canvas test failed - no canvas/context');
      return;
    }
    
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.fillStyle = 'rgb(17, 24, 39)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw test bars
    for (let i = 0; i < 32; i++) {
      const barHeight = Math.random() * height * 0.8;
      const x = (width / 32) * i;
      
      ctx.fillStyle = `hsl(${25 + i * 2}, 100%, 60%)`;
      ctx.fillRect(x, height - barHeight, width / 32 - 2, barHeight);
    }
    
    setDebugInfo('Canvas test successful');
    console.log('Canvas test completed successfully');
  };

  // Test audio connection
  const testAudioConnection = () => {
    if (!isInitialized) {
      setDebugInfo('Not initialized - click Enable first');
      return;
    }

    const audio = audioRef?.current;
    if (!audio) {
      setDebugInfo('No audio element found');
      return;
    }

    if (!analyserRef.current || !dataArrayRef.current) {
      setDebugInfo('Analyser not ready');
      return;
    }

    console.log('=== AUDIO CONNECTION TEST ===');
    console.log('Audio element:', audio);
    console.log('Audio context:', audioContextRef.current);
    console.log('Audio context state:', audioContextRef.current?.state);
    console.log('Analyser:', analyserRef.current);
    console.log('Source:', sourceRef.current);
    console.log('Data array length:', dataArrayRef.current?.length);

    // Get current frequency data
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    let total = 0;
    let max = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      total += dataArrayRef.current[i];
      max = Math.max(max, dataArrayRef.current[i]);
    }
    
    console.log('Audio data - Total:', total, 'Max:', max, 'Average:', total / dataArrayRef.current.length);
    setDebugInfo(`Audio test - Max: ${max}, Avg: ${Math.round(total / dataArrayRef.current.length)}`);
  };

  return (
    <div className="space-y-4">
      {/* Visualizer Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4 text-orange-500" />
          <span className="text-sm text-gray-400">Audio Visualizer</span>
          {isInitialized && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
              Live
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={initializeAudioContext}
            disabled={isInitialized}
            className={`h-6 px-3 text-xs ${
              isInitialized 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
            }`}
          >
            {isInitialized ? '✓ Live' : 'Start Visualizer'}
          </Button>
          
          {isInitialized && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
              Always Active
            </Badge>
          )}
        </div>
      </div>

      {/* Visualizer Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-32 bg-gray-900 rounded-lg border border-gray-700"
          width="800"
          height="128"
        />
        
        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg">
            <div className="text-center space-y-2">
              <Volume2 className="h-8 w-8 text-gray-500 mx-auto" />
              <p className="text-sm text-gray-500">Click "Start Visualizer" to begin</p>
            </div>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="text-xs text-gray-500 flex items-center justify-between">
        <span>Status: {debugInfo}</span>
        {error && <span className="text-red-400">Error: {error}</span>}
        <span>Initialized: {isInitialized ? 'Yes' : 'No'}</span>
      </div>
    </div>
  );
};

export default MusicVisualizer;