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
    const fetchTrack = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
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
    fetchTrack();
  }, [id, apiClient, navigate]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    try {
      const updateData = {
        title: editForm.title, music_composer: editForm.music_composer, lyricist: editForm.lyricist,
        singer_name: editForm.singer_name, tempo: editForm.tempo, scale: editForm.scale,
        audio_language: editForm.audio_language, release_date: editForm.release_date,
        album_name: editForm.album_name, other_info: editForm.other_info
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
      setDeleteDialogOpen(false);
      toast.success('Track and associated files deleted successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error deleting track:', error);
      const message = error.response?.data?.detail || 'Failed to delete track';
      toast.error(message);
    }
  };
  
  const downloadFile = (fileType) => {
    toast.info(`Preparing ${fileType} file for download...`);
    apiClient.get(`/tracks/${id}/download/${fileType}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob',
    }).then(response => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        const contentDisposition = response.headers['content-disposition'];
        let filename = `${track.title}_${fileType}.dat`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch && filenameMatch.length === 2)
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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="loading-spinner mx-auto w-8 h-8 border-orange-500"></div>
          <p className="text-gray-400">Loading track details...</p>
        </div>
      </div>
    );
  }

  // *** FIX #1: THIS GUARD IS CRITICAL. ***
  // It ensures that none of the code below tries to render if `track` is null.
  if (!track) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="glass border-gray-700 text-center py-12">
          <CardContent>
            <Music className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Track Not Found</h3>
            <p className="text-gray-400 mb-4">The track you're looking for doesn't exist or has been deleted.</p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we reach this point, `track` is guaranteed to be a valid object.
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 fade-in">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-gray-400 hover:text-white p-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text">{track.title}</h1>
          </div>
          {track.album_name && (
            <div className="flex items-center space-x-2 text-gray-400 ml-10">
              <Album className="h-4 w-4" />
              <span>from "{track.album_name}"</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={() => setEditing(!editing)} variant="outline" className="border-gray-600 text-gray-400 hover:text-white hover:border-gray-500">
            {editing ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Edit className="h-4 w-4 mr-2" />Edit</>}
          </Button>
          
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-600 text-red-400 hover:text-red-300 hover:border-red-500">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Delete Track</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to delete "{track.title}"? This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="border-gray-600 text-gray-400">Cancel</Button>
                <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete Track</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content (no changes needed here as it's protected by the guard above) */}
        <div className="lg:col-span-2 space-y-6">
            {/* ... Your existing cards for serial numbers, track info, etc. ... */}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Audio Preview */}
          {/* *** FIX #2: THE `track &&` CHECK IS A GOOD DEFENSIVE PATTERN, BUT NOW REDUNDANT BECAUSE OF THE MAIN GUARD *** */}
          {/* We'll keep it for clarity. This ensures we only show this card if a file exists. */}
          {track && track.mp3_blob_name && (
            <Card className="glass border-gray-700 slide-in">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2"><Play className="h-5 w-5" /><span>Audio Preview</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <audio
                  ref={audioRef}
                  controls
                  className="w-full"
                  preload="metadata"
                  crossOrigin="anonymous"
                  // Use the secure streaming endpoint from the backend
                  src={`${apiClient.defaults.baseURL}/tracks/${track.id}/stream`}
                >
                  Your browser does not support the audio element.
                </audio>
                <MusicVisualizer audioRef={audioRef} />
              </CardContent>
            </Card>
          )}

          {/* File Downloads */}
          <Card className="glass border-gray-700 slide-in">
              {/* ... The rest of your file download section should now work correctly ... */}
              <CardContent>
                {/* Example for one file type */}
                 <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Audio:</span>
                  <div className="flex items-center space-x-2">
                    {track.mp3_blob_name ? (
                      <>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Available</Badge>
                        <Button size="sm" onClick={() => downloadFile('mp3')} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-3 py-1 text-xs">
                          <Download className="h-3 w-3 mr-1" /> Download
                        </Button>
                      </>
                    ) : <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Not Available</Badge>}
                  </div>
                </div>
                {/* ... Repeat for lyrics_blob_name, session_blob_name etc. ... */}
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TrackDetails;