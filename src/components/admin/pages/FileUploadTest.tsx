import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Image, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const FileUploadTest = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [imageResult, setImageResult] = useState<any>(null);
  const [fileResult, setFileResult] = useState<any>(null);

  const handleImageUpload = async () => {
    if (!imageFile) return;

    setImageUploading(true);
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/server-image`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setImageResult(result);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      setImageResult({ error: error.message });
    } finally {
      setImageUploading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!documentFile) return;

    setFileUploading(true);
    const formData = new FormData();
    formData.append('file', documentFile);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload/server-image`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setFileResult(result);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('File upload error:', error);
      setFileResult({ error: error.message });
    } finally {
      setFileUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Upload className="w-6 h-6" />
        <h1 className="text-2xl font-bold">File Upload Testing</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Image className="w-5 h-5" />
              <span>Image Upload</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            
            <Button 
              onClick={handleImageUpload} 
              disabled={!imageFile || imageUploading}
              className="w-full"
            >
              {imageUploading ? 'Uploading...' : 'Upload Image'}
            </Button>

            {imageResult && (
              <div className={`p-3 rounded-lg ${imageResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                {imageResult.error ? (
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>Error: {imageResult.error}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>{imageResult.message}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>File: {imageResult.upload?.originalName}</p>
                      <p>Size: {(imageResult.upload?.size / 1024).toFixed(2)} KB</p>
                      <p>URL: {imageResult.url}</p>
                    </div>
                    {imageResult.url && (
                      <img 
                        src={`${import.meta.env.VITE_API_URL}${imageResult.url}`} 
                        alt="Uploaded" 
                        className="max-w-full h-32 object-cover rounded"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Document Upload</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <input
                type="file"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
            </div>
            
            <Button 
              onClick={handleFileUpload} 
              disabled={!documentFile || fileUploading}
              className="w-full"
            >
              {fileUploading ? 'Uploading...' : 'Upload File'}
            </Button>

            {fileResult && (
              <div className={`p-3 rounded-lg ${fileResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                {fileResult.error ? (
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>Error: {fileResult.error}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>{fileResult.message}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>File: {fileResult.upload?.originalName}</p>
                      <p>Size: {(fileResult.upload?.size / 1024).toFixed(2)} KB</p>
                      <p>URL: {fileResult.url}</p>
                    </div>
                    <a 
                      href={`${import.meta.env.VITE_API_URL}${fileResult.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                    >
                      View File
                    </a>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FileUploadTest;