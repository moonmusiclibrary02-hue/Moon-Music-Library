// src/components/AudioPlayer.js

import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button'; // Assuming you have this component
import { Play } from 'lucide-react'; // For the icon

const AudioPlayer = ({ track, apiClient }) => {
  const [audioSrc, setAudioSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);

  const loadAndPlayAudio = async () => {
    if (isLoading || audioSrc) return;

    setIsLoading(true);
    toast.info(`Loading audio for ${track.title}...`);
    try {
      // 1. Fetch the secure, temporary URL from the backend.
      const response = await apiClient.get(`/tracks/${track.id}/stream`);
      
      // 2. Set the URL in our state. This will cause the component to re-render.
      setAudioSrc(response.data.url);

    } catch (error) {
      console.error("Error fetching audio stream URL:", error);
      toast.error("Could not load audio. You may not have permission.");
      setIsLoading(false); // Reset loading state on error
    }
  };

  // This useEffect will run ONLY when audioSrc changes from null to a real URL.
  useEffect(() => {
    if (audioSrc && audioRef.current) {
      // The audio element is now in the DOM with the correct src.
      // We can now safely tell it to play.
      audioRef.current.play();
    }
  }, [audioSrc]);

  // If we haven't fetched the URL yet, show a "Load Audio" button.
  if (!audioSrc) {
    return (
      <Button
        variant="outline"
        className="w-full border-orange-500 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
        onClick={loadAndPlayAudio}
        disabled={isLoading}
      >
        <Play className="h-4 w-4 mr-2" />
        {isLoading ? 'Loading...' : 'Preview Audio'}
      </Button>
    );
  }

  // Once we have the URL, render the actual audio player.
  return (
    <audio
      ref={audioRef}
      controls
      autoPlay // This will make it play automatically once the src is set
      src={audioSrc}
      preload="auto"
      className="w-full h-8"
    >
      Your browser does not support the audio element.
    </audio>
  );
};

export default AudioPlayer;