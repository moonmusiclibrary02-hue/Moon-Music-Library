import React, { useState, useRef } from 'react';
import { toast } from 'sonner';

const AudioPlayer = ({ track, apiClient }) => {
  // We only need one state variable now: the source URL.
  const [audioSrc, setAudioSrc] = useState(null);
  const audioRef = useRef(null);

  // This function will be called ONLY when the user clicks the play button
  // on an audio element that doesn't have a source yet.
  const handlePlay = async () => {
    // If we already have the URL, the browser will handle playing. Do nothing.
    if (audioSrc) {
      return;
    }

    // If there's no source, fetch the secure URL from our backend.
    toast.info(`Loading audio for ${track.title}...`);
    try {
      const response = await apiClient.get(`/tracks/${track.id}/stream`);
      const secureUrl = response.data.url;
      
      // THE FIX:
      // 1. Set the secure URL in our state. This will update the <audio> tag's src.
      setAudioSrc(secureUrl);
      
      // 2. We need to manually load and play the audio AFTER the src is set.
      // We use a small timeout to give React a moment to update the DOM.
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load(); // Tell the audio element to load the new source
          audioRef.current.play(); // Now, play it
        }
      }, 50); // A 50ms delay is more than enough

    } catch (error) {
      console.error("Error fetching audio stream URL:", error);
      toast.error("Could not load audio. You may not have permission.");
    }
  };

  return (
    <div className="w-full">
      <audio
        ref={audioRef}
        controls
        // The src is now managed by our state. It starts as null.
        src={audioSrc || ''}
        // onPlay will only fire the FIRST time the user clicks play.
        onPlay={handlePlay}
        preload="metadata"
        className="w-full h-8"
      >
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

export default AudioPlayer;