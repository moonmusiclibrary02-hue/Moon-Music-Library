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
  ArrowLeft, 
  Edit, 
  Download, 
  Play, 
  Trash2, 
  Save, 
  X, 
  Music, 
  User, 
  Mic, 
  Clock, 
  Calendar, 
  Globe, 
  FileAudio, 
  FileText,
  Album
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
      const response = await apiClient.get(`/tracks/${id}`);
      setTrack(response.data);
      setEditForm(response.data);
    } catch (error) {
      console.error('Error fetching track:', error);
      if (error.response?.status === 404) {
        toast.error('Track not found');
      } else {
        toast.error('Failed to load track details');
      }
      navigate('/');
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

      const response = await apiClient.put(`/tracks/${id}`, updateData);
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
      await apiClient.delete(`/tracks/${id}`);
      setDeleteDialogOpen(false); // Close dialog first
      toast.success('Track deleted successfully!');
      navigate('/'); // Then navigate
    } catch (error) {
      console.error('Error deleting track:', error);
      const message = error.response?.data?.detail || 'Failed to delete track';
      toast.error(message);
    }
  };

  const downloadFile = async (fileType) => {
    try {
      const response = await apiClient.get(`/tracks/${id}/download/${fileType}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Determine file extension and name based on file type
      let extension = 'txt';
      let fileName = track.title;
      let successMessage = 'File downloaded successfully';
      
      switch (fileType) {
        case 'mp3':
          extension = 'mp3';
          successMessage = 'Audio file downloaded successfully';
          break;
        case 'lyrics':
          extension = 'txt';
          successMessage = 'Lyrics file downloaded successfully';
          break;
        case 'session':
          extension = 'zip';
          successMessage = 'Session file downloaded successfully';
          break;
        case 'singer_agreement':
          extension = 'pdf';
          fileName = `${track.title}_singer_agreement`;
          successMessage = 'Singer agreement downloaded successfully';
          break;
        case 'music_director_agreement':
          extension = 'pdf';
          fileName = `${track.title}_music_director_agreement`;
          successMessage = 'Music director agreement downloaded successfully';
          break;
        default:
          extension = 'txt';
      }
      
      link.download = `${fileName}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(successMessage);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (!track) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="glass border-gray-700 text-center py-12">
          <CardContent>
            <Music className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Track not found</h3>
            <p className="text-gray-400 mb-4">The track you're looking for doesn't exist or has been deleted.</p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 fade-in">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white p-2 -ml-2"
              data-testid="back-to-dashboard-btn"
            >
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
          <Button
            onClick={() => setEditing(!editing)}
            variant="outline"
            className="border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
            data-testid="edit-track-btn"
          >
            {editing ? (
              <><X className="h-4 w-4 mr-2" />Cancel</>
            ) : (
              <><Edit className="h-4 w-4 mr-2" />Edit</>
            )}
          </Button>
          
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-red-600 text-red-400 hover:text-red-300 hover:border-red-500"
                data-testid="delete-track-btn"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Delete Track</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Are you sure you want to delete "{track.title}"? This action cannot be undone and will also delete all associated files.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteDialogOpen(false)}
                  className="border-gray-600 text-gray-400"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  data-testid="confirm-delete-btn"
                >
                  Delete Track
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Serial Number Details */}
          <Card className="glass border-gray-700 slide-in">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <FileAudio className="h-5 w-5" />
                <span>Serial Number Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Code:</span>
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 font-mono">
                    {track.unique_code || 'N/A'}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Serial:</span>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-mono">
                    {track.serial_number || 'N/A'}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Rights:</span>
                  <Badge className={`${
                    track.rights_type === 'original' 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                  }`}>
                    {track.rights_type === 'original' ? 'Original' : 'Multi Rights'}
                  </Badge>
                </div>
                
                {track.track_category && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">Category:</span>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                      {track.track_category === 'original_composition' ? 'Original Composition' : 'Cover Song'}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="glass border-gray-700 slide-in">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Music className="h-5 w-5" />
                <span>Track Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title" className="text-gray-300">Track Title</Label>
                      <Input
                        id="edit-title"
                        name="title"
                        value={editForm.title || ''}
                        onChange={handleEditChange}
                        className="bg-gray-800/50 border-gray-600 text-white"
                        data-testid="edit-title-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-album" className="text-gray-300">Album Name</Label>
                      <Input
                        id="edit-album"
                        name="album_name"
                        value={editForm.album_name || ''}
                        onChange={handleEditChange}
                        className="bg-gray-800/50 border-gray-600 text-white"
                        data-testid="edit-album-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-composer" className="text-gray-300">Music Composer</Label>
                      <Input
                        id="edit-composer"
                        name="music_composer"
                        value={editForm.music_composer || ''}
                        onChange={handleEditChange}
                        className="bg-gray-800/50 border-gray-600 text-white"
                        data-testid="edit-composer-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-lyricist" className="text-gray-300">Lyricist</Label>
                      <Input
                        id="edit-lyricist"
                        name="lyricist"
                        value={editForm.lyricist || ''}
                        onChange={handleEditChange}
                        className="bg-gray-800/50 border-gray-600 text-white"
                        data-testid="edit-lyricist-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-singer" className="text-gray-300">Singer Name</Label>
                      <Input
                        id="edit-singer"
                        name="singer_name"
                        value={editForm.singer_name || ''}
                        onChange={handleEditChange}
                        className="bg-gray-800/50 border-gray-600 text-white"
                        data-testid="edit-singer-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-language" className="text-gray-300">Audio Language</Label>
                      <Input
                        id="edit-language"
                        name="audio_language"
                        value={editForm.audio_language || ''}
                        onChange={handleEditChange}
                        className="bg-gray-800/50 border-gray-600 text-white"
                        data-testid="edit-language-input"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveEdit}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                      data-testid="save-edit-btn"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-400">Music Composer</p>
                        <p className="text-white font-medium">{track.music_composer}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Edit className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-400">Lyricist</p>
                        <p className="text-white font-medium">{track.lyricist}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Mic className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-400">Singer</p>
                        <p className="text-white font-medium">{track.singer_name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-400">Language</p>
                        <p className="text-white font-medium">{track.audio_language}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-400">Release Date</p>
                        <p className="text-white font-medium">{formatDate(track.release_date)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-400">Added</p>
                        <p className="text-white font-medium">{formatDate(track.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Details */}
          <Card className="glass border-gray-700 slide-in">
            <CardHeader>
              <CardTitle className="text-white">Technical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-tempo" className="text-gray-300">Tempo</Label>
                    <Input
                      id="edit-tempo"
                      name="tempo"
                      value={editForm.tempo || ''}
                      onChange={handleEditChange}
                      placeholder="e.g., 120 BPM"
                      className="bg-gray-800/50 border-gray-600 text-white"
                      data-testid="edit-tempo-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-scale" className="text-gray-300">Scale/Key</Label>
                    <Input
                      id="edit-scale"
                      name="scale"
                      value={editForm.scale || ''}
                      onChange={handleEditChange}
                      placeholder="e.g., C Major"
                      className="bg-gray-800/50 border-gray-600 text-white"
                      data-testid="edit-scale-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-release-date" className="text-gray-300">Release Date</Label>
                    <Input
                      id="edit-release-date"
                      name="release_date"
                      type="date"
                      value={editForm.release_date || ''}
                      onChange={handleEditChange}
                      className="bg-gray-800/50 border-gray-600 text-white"
                      data-testid="edit-release-date-input"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {track.tempo && (
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                      {track.tempo}
                    </Badge>
                  )}
                  {track.scale && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {track.scale}
                    </Badge>
                  )}
                  {!track.tempo && !track.scale && (
                    <p className="text-gray-400 text-sm">No technical details available</p>
                  )}
                </div>
              )}

              {/* Copyright Details - Now part of Technical Details */}
              <div className="border-t border-gray-600/50 pt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Globe className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-white">Copyright Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-400">Music Composer:</span>
                    <div className="text-right">
                      <p className="text-white font-medium">{track.music_composer}</p>
                      <p className="text-xs text-gray-500">Composition Rights</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-400">Lyricist:</span>
                    <div className="text-right">
                      <p className="text-white font-medium">{track.lyricist}</p>
                      <p className="text-xs text-gray-500">Lyrical Rights</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-400">Singer:</span>
                    <div className="text-right">
                      <p className="text-white font-medium">{track.singer_name}</p>
                      <p className="text-xs text-gray-500">Performance Rights</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-400">Creation Date:</span>
                    <div className="text-right">
                      <p className="text-white font-medium">{formatDate(track.created_at)}</p>
                      <p className="text-xs text-gray-500">Copyright Established</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-gray-400">Language:</span>
                    <div className="text-right">
                      <p className="text-white font-medium">{track.audio_language}</p>
                      <p className="text-xs text-gray-500">Linguistic Copyright</p>
                    </div>
                  </div>

                  {track.rights_details && (
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-gray-400">Rights Details:</span>
                      <div className="text-right">
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          {track.rights_details === 'own_rights' ? 'Own Rights' : 'Multi Rights'}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">Rights Classification</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          {(track.other_info || editing) && (
            <Card className="glass border-gray-700 slide-in">
              <CardHeader>
                <CardTitle className="text-white">Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-2">
                    <Textarea
                      name="other_info"
                      value={editForm.other_info || ''}
                      onChange={handleEditChange}
                      placeholder="Any additional notes..."
                      rows={4}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 resize-none"
                      data-testid="edit-other-info-input"
                    />
                  </div>
                ) : (
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {track.other_info || 'No additional information available.'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Audio Preview */}
          {track.mp3_file_path && (
            <Card className="glass border-gray-700 slide-in">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Play className="h-5 w-5" />
                  <span>Audio Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Audio Controls */}
                <audio 
                  ref={audioRef}
                  controls 
                  className="w-full" 
                  preload="metadata"
                  data-testid="audio-preview"
                  crossOrigin="anonymous"
                >
                  <source src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${track.mp3_filename}`} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>

                {/* Music Visualizer */}
                <MusicVisualizer audioRef={audioRef} />
              </CardContent>
            </Card>
          )}

          {/* File Downloads */}
          <Card className="glass border-gray-700 slide-in">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Downloads</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{track.title.substring(0, 6)}... Audio:</span>
                  <div className="flex items-center space-x-2">
                    {track.mp3_file_path ? (
                      <>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Available
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => downloadFile('mp3')}
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-3 py-1 text-xs"
                          data-testid="download-mp3-btn"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        Not Available
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{track.title.substring(0, 6)}... Lyrics:</span>
                  <div className="flex items-center space-x-2">
                    {track.lyrics_file_path ? (
                      <>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Available
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => downloadFile('lyrics')}
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-3 py-1 text-xs"
                          data-testid="download-lyrics-btn"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        Not Available
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{track.title.substring(0, 6)}... Session:</span>
                  <div className="flex items-center space-x-2">
                    {track.session_file_path ? (
                      <>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Available
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => downloadFile('session')}
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-3 py-1 text-xs"
                          data-testid="download-session-btn"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        Not Available
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agreement Details */}
          <Card className="glass border-gray-700 slide-in">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Agreement Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Singer Agreement:</span>
                  <div className="flex items-center space-x-2">
                    {track.singer_agreement_file_path ? (
                      <>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Available
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => downloadFile('singer_agreement')}
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-3 py-1 text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        Not Available
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Music Director Agreement:</span>
                  <div className="flex items-center space-x-2">
                    {track.music_director_agreement_file_path ? (
                      <>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Available
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => downloadFile('music_director_agreement')}
                          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-3 py-1 text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      </>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                        Not Available
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Copyright Details moved to Technical Details section */}
        </div>
      </div>
    </div>
  );
};

export default TrackDetails;