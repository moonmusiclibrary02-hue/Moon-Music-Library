import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  ArrowLeft,
  FileText,
  Music,
  Users,
  Clock
} from 'lucide-react';

const BulkUpload = ({ apiClient }) => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls'].includes(fileExtension)) {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }
      setSelectedFile(file);
      setUploadResults(null);
    }
  };

  const downloadTemplate = async () => {
    try {
      console.log('Starting template download...');
      const response = await apiClient.get('/tracks/bulk-upload/template', {
        responseType: 'blob'
      });
      
      console.log('Template response received:', response);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bulk_tracks_template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded successfully!');
    } catch (error) {
      console.error('Error downloading template:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(`Failed to download template: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an Excel file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    // It's good practice to clear previous results when starting a new upload
    setUploadResults(null); 
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // --- THE FIX IS HERE: We use Axios's onUploadProgress for a REAL progress bar ---
      const response = await apiClient.post('/tracks/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          // The Authorization header is now automatically added by your apiClient instance
        },
        // This function is called by axios periodically during the upload
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      // After a successful upload, the response from the backend contains the results
      setUploadResults(response.data);
      
      // Show a summary toast
      if (response.data.failed_count > 0) {
        toast.warning(`Bulk upload finished. ${response.data.successful_count} succeeded, ${response.data.failed_count} failed.`);
      } else {
        toast.success(`Bulk upload complete! All ${response.data.successful_count} tracks were uploaded successfully.`);
      }
      
    } catch (error) {
      console.error('Error during bulk upload:', error);
      // The apiClient interceptor will handle 401 errors (logout) automatically.
      // This handles other errors, like server crashes or validation failures.
      const message = error.response?.data?.detail || 'A server error occurred during bulk upload.';
      toast.error(message);
      
      // Provide a more detailed error structure for the UI
      setUploadResults({
        successful_count: 0,
        failed_count: 1, // Represent the entire upload as one failure
        errors: [{ row: 'N/A', error: message }]
      });
      setUploadProgress(0); // Reset progress on failure
    } finally {
      // This will run whether the upload succeeds or fails
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadResults(null);
    setUploading(false);
    // Reset file input
    const fileInput = document.getElementById('excel-file-input');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4 fade-in">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-white p-2 -ml-2"
          data-testid="back-to-dashboard-btn"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Bulk Track Upload</h1>
          <p className="text-gray-400 mt-2">Upload multiple tracks at once using Excel template</p>
        </div>
      </div>

      {/* Template Download */}
      <Card className="glass border-gray-700 slide-in">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>Step 1: Download Template</span>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Download the Excel template and fill in your track details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
            <h3 className="text-white font-medium mb-2">Template Columns:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
              <div>• Title, Music Composer, Lyricist</div>
              <div>• Singer Name, Audio Language</div>
              <div>• Tempo, Scale, Album Name</div>
              <div>• Release Date, Rights Type</div>
              <div>• Track Category, Other Info</div>
              <div>• Google Drive Links for Files</div>
            </div>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-2">Google Drive File Links:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Audio File: Direct Google Drive download link for MP3 file</li>
                  <li>• Lyrics File: Direct Google Drive download link for lyrics (TXT/DOC)</li>
                  <li>• Session File: Direct Google Drive download link for session (ZIP/RAR)</li>
                  <li>• Singer Agreement: Direct Google Drive download link for agreement (PDF)</li>
                  <li>• Music Director Agreement: Direct Google Drive download link for agreement (PDF)</li>
                </ul>
              </div>
            </div>
          </div>

          <Button 
            onClick={downloadTemplate}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            data-testid="download-template-btn"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Excel Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card className="glass border-gray-700 slide-in">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Step 2: Upload Filled Excel</span>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Upload your completed Excel file to create multiple tracks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-file-input" className="text-gray-300">
              Select Excel File
            </Label>
            <Input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="bg-gray-800/50 border-gray-600 text-white file:bg-gray-700 file:text-gray-300 file:border-gray-600"
              data-testid="excel-file-input"
            />
          </div>

          {selectedFile && (
            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-white font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Processing tracks...</span>
                <span className="text-white">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          <div className="flex space-x-3">
            <Button 
              onClick={handleBulkUpload}
              disabled={!selectedFile || uploading}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white disabled:opacity-50"
              data-testid="upload-excel-btn"
            >
              {uploading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
            
            {(selectedFile || uploadResults) && (
              <Button 
                onClick={resetUpload}
                variant="outline"
                disabled={uploading}
                className="border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
                data-testid="reset-upload-btn"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Results */}
      {uploadResults && (
        <Card className="glass border-gray-700 slide-in">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              {uploadResults.successful_count > 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Upload Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {uploadResults.successful_count || 0}
                </div>
                <div className="text-sm text-green-300">Successful</div>
              </div>
              
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {uploadResults.failed_count || 0}
                </div>
                <div className="text-sm text-red-300">Failed</div>
              </div>
              
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {(uploadResults.successful_count || 0) + (uploadResults.failed_count || 0)}
                </div>
                <div className="text-sm text-blue-300">Total Processed</div>
              </div>
            </div>

            {uploadResults.errors && uploadResults.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-white font-medium">Errors:</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadResults.errors.map((error, index) => (
                    <div key={index} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="flex items-start space-x-3">
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          Row {error.row}
                        </Badge>
                        <p className="text-sm text-red-300 flex-1">{error.error}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadResults.successful_count > 0 && (
              <Button 
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                data-testid="view-tracks-btn"
              >
                <Music className="h-4 w-4 mr-2" />
                View Uploaded Tracks
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkUpload;