import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, Edit, Download, Play, Trash2, Save, X, Music, User, Mic, Clock, Calendar, Globe, FileAudio, FileText, Album
} from 'lucide-react';
import MusicVisualizer from './MusicVisualizer';

const TrackDetails = ({ apiClient }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const audioRef = useRef(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchTrack();
  }, [id]);

  const fetchTrack = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Use apiClient's configured instance to automatically include headers
      const response = await apiClient.get(`/tracks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrack(response.data);
      setEditForm(response.data);
    } catch (error) {
      console.error('Error fetching track:', error);
      const message = error.response?.data?.detail || 'Failed to load track details';
      toast.error(message);
      if (error.response?.status !== 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    try {
      const updateData = {
        title: editForm.title,
        music_composer: editForm.music_composer,
        lyricist: editForm.lyricist,
        singer_name: editForm.singer_name,
        tempo: editForm.tempo,
        scale: editForm.scale,
        audio_language: editForm.audio_language,
        release_date: editForm.release_date,
        album_name: editForm.album_name,
        other_info: editForm.other_info
      };

      const token = localStorage.getItem('token');
      const response = await apiClient.put(`/tracks/${id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrack(response.data);
      setEditing(false);
      toast.success('Track updated successfully!');
    } catch (error) {
      console.error('Error updating track:', error);
      const message = error.response?.data?.detail || 'Failed to update track';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await apiClient.delete(`/tracks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteDialogOpen(false); // Close dialog first
      toast.success('Track and associated files deleted successfully!');
      navigate('/'); // Then navigate
    } catch (error) {
      console.error('Error deleting track:', error);
      const message = error.response?.data?.detail || 'Failed to delete track';
      toast.error(message);
    }
  };
  
  // *** UPDATED DOWNLOAD FUNCTION ***
  // This is now much simpler. It just opens the backend URL in a new tab,
  // and the backend handles the redirect to the actual GCS download link.
  const downloadFile = (fileType) => {
    const token = localStorage.getItem('token');
    const downloadUrl = `${apiClient.defaults.baseURL}/tracks/${id}/download/${fileType}?token=${token}`;
    // We need a way to pass the token. A query parameter is one way if headers aren't possible.
    // Let's adjust the backend to accept it. For now, we assume direct navigation.
    // The cleanest way is to just open the URL. The browser will handle the download.
    const url = `${apiClient.defaults.baseURL}/tracks/${id}/download/${fileType}`;
    // To handle auth, we can't just open a new window. We need to fetch and create a blob URL.
    
    toast.info(`Preparing ${fileType} file for download...`);
    apiClient.get(`/tracks/${id}/download/${fileType}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob',
    }).then(response => {
        // Since the backend redirects, the browser follows it and the final response is the blob.
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        const contentDisposition = response.headers['content-disposition'];
        let filename = `${track.title}_${fileType}.dat`; // fallback filename
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch.length === 2)
                filename = filenameMatch[1];
        }
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success(`${fileType.replace('_', ' ')} downloaded successfully!`);
    }).catch(error => {
        console.error('Download error:', error);
        toast.error('Failed to download file. You may not have permission or the file may not exist.');
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) { /* ... keep loading JSX as is ... */ }
  if (!track) { /* ... keep not found JSX as is ... */ }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* ... keep header and other JSX as is ... */}

      {/* Find the Audio Preview Card */}
      {track.mp3_blob_name && ( // Use blob_name to check for existence
        <Card className="glass border-gray-700 slide-in">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Play className="h-5 w-5" />
              <span>Audio Preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <audio
              ref={audioRef}
              controls
              className="w-full"
              preload="metadata"
              data-testid="audio-preview"
              crossOrigin="anonymous"
              // *** UPDATED SRC ATTRIBUTE ***
              // This now points to the secure streaming endpoint
              src={`${apiClient.defaults.baseURL}/tracks/${track.id}/stream`}
            >
              Your browser does not support the audio element.
            </audio>
            <MusicVisualizer audioRef={audioRef} />
          </CardContent>
        </Card>
      )}

      {/* ... the rest of your JSX file ... */}
      
       {/* In the File Downloads Card, update the checks */}
       <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Audio:</span>
          <div className="flex items-center space-x-2">
            {track.mp3_blob_name ? ( /* Check blob name */
              <>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>
                <Button size="sm" onClick={() => downloadFile('mp3')} /* ... */>
                  <Download className="h-3 w-3 mr-1" /> Download
                </Button>
              </>
            ) : <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Not Available</Badge>}
          </div>
        </div>

        {/* Repeat for other file types */}
        <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Lyrics:</span>
            <div className="flex items-center space-x-2">
                {track.lyrics_blob_name ? (  /* Check blob name */
                <>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>
                    <Button size="sm" onClick={() => downloadFile('lyrics')} /* ... */>
                        <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                </>
                ) : <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Not Available</Badge>}
            </div>
        </div>
        
        {/* ... and so on for session, singer_agreement, etc. ... */}
    </div>
  );
};

export default TrackDetails;

// NOTE: The provided JSX was very long, so I have only included the
// sections that needed changes. Please integrate these changes into your
// existing file structure. The core changes are:
// 1. The updated `downloadFile` function.
// 2. The updated `src` attribute in the `<audio>` tag.
// 3. The updated checks for file availability (e.g., `track.mp3_blob_name` instead of `track.mp3_file_path`).