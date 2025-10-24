import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

const AudioPlayer = ({ track, apiClient }) => {
  const [audioSrc, setAudioSrc] = useState(null);
  const [isLoadingSrc, setIsLoadingSrc] = useState(false);
  const audioRef = useRef(null);

  const handlePlay = async () => {
    // If we already have the URL, just play.
    if (audioSrc) {
      audioRef.current.play();
      return;
    }

    // If not, fetch the secure, temporary URL from the backend.
    setIsLoadingSrc(true);
    toast.info(`Loading audio for ${track.title}...`);
    try {
      const response = await apiClient.get(`/tracks/${track.id}/stream`);
      setAudioSrc(response.data.url);
    } catch (error) {
      console.error("Error fetching audio stream URL:", error);
      toast.error("Could not load audio. You may not have permission.");
    } finally {
      setIsLoadingSrc(false);
    }
  };

  // When the audioSrc is finally set, play the audio.
  useEffect(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current.play();
    }
  }, [audioSrc]);

  return (
    <div className="w-full">
      <audio
        ref={audioRef}
        controls
        src={audioSrc || ''} // Use the state variable here
        onPlay={handlePlay} // Fetch the URL when the user clicks play
        preload="metadata"
        className="w-full h-8"
      >
        Your browser does not support the audio element.
      </audio>
      {isLoadingSrc && <p className="text-xs text-gray-400 mt-1">Loading audio...</p>}
    </div>
  );
};

export default AudioPlayer;