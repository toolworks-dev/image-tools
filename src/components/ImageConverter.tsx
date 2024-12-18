import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Snackbar,
} from '@mui/material';
import { CloudUpload, ExpandMore } from '@mui/icons-material';

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg', '.jpe', '.jif', '.jfif'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
  'image/gif': ['.gif'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif'],
  'image/x-icon': ['.ico'],
  'image/avif': ['.avif'],
  'image/heic': ['.heic'],
};

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, string> }) => void;
  }
}

interface ConversionOptions {
  format: string;
  width?: number;
  height?: number;
  compression?: {
    type: 'size' | 'percentage';
    value: number;
  };
}
const getNewFilename = (
  originalFile: string,
  newExtension?: string,
  width?: number,
  height?: number
): string => {
  const lastDot = originalFile.lastIndexOf('.');
  const filename = originalFile.substring(0, lastDot);
  const originalExt = originalFile.substring(lastDot + 1);
  const dimensionSuffix = width && height ? `-${width}-${height}` : '';
  const extension = newExtension || originalExt;
  return `${filename}${dimensionSuffix}.${extension}`;
};

const ImageConverter: React.FC = () => {
  const [mode, setMode] = useState<'convert' | 'resize' | 'compress'>('convert');
  const [compressionType, setCompressionType] = useState<'size' | 'percentage'>('percentage');
  const [compressionValue, setCompressionValue] = useState<number>(80);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [options, setOptions] = useState<ConversionOptions>({
    format: 'png',
    width: undefined,
    height: undefined,
  });
  const [imageInfo, setImageInfo] = useState<{width: number, height: number} | null>(null);
  const [scale, setScale] = useState<number>(100);
  const [scaleInput, setScaleInput] = useState<string>('100');
  
  const updateImageInfo = (file: File) => {
    const img = new Image();
    img.onload = () => {
      setImageInfo({
        width: img.width,
        height: img.height
      });
    };
    img.src = URL.createObjectURL(file);
  };

  const updateDimensionsFromScale = (newScale: number) => {
    if (imageInfo) {
      setOptions({
        ...options,
        width: Math.round(imageInfo.width * (newScale / 100)),
        height: Math.round(imageInfo.height * (newScale / 100))
      });
    }
  };
   
  const handleModeChange = (
    _: React.MouseEvent<HTMLElement>,
    newMode: 'convert' | 'resize'
  ) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError('');
  
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        setSelectedFile(null);
        setPreview('');
        return;
      }
  
      setSelectedFile(file);
      updateImageInfo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://imagetools.toolworks.dev/api' 
  : '/api';

  const handleConvert = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }
    
    setStatus('idle');
    setErrorMessage('');
  
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('options', JSON.stringify({
      ...options,
      width: options.width || undefined,
      height: options.height || undefined,
      compression: mode === 'compress' ? {
        type: compressionType,
        value: compressionValue
      } : undefined  
    }));
  
    try {
      const response = await fetch(`${API_URL}/convert`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      });
      
      if (!response.ok) {
        const errorMessage = `HTTP error! status: ${response.status}`;
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const newFilename = getNewFilename(
        selectedFile.name,
        options.format,
        options.width,
        options.height
      );
  
      window.plausible?.('imageDownload', {
        props: {
          sourceFormat: selectedFile.type,
          targetFormat: options.format,
          hasResize: (options.width && options.height) ? 'true' : 'false'
        }
      });
  
      const link = document.createElement('a');
      link.href = url;
      link.download = newFilename;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setStatus('success');
    } catch (error) {
      console.error('Conversion failed:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const ResizeControls = () => (
    <Grid container spacing={2}>
      {imageInfo && (
        <Grid item xs={12}>
          <Typography variant="body2" gutterBottom>
            Original size: {imageInfo.width}×{imageInfo.height}px
          </Typography>
        </Grid>
      )}
      
      <Grid item xs={12}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Scale by Percentage</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
              <TextField
                type="number"
                label="Scale %"
                fullWidth
                inputProps={{ 
                  min: 1,
                  max: 9999,
                  inputMode: 'numeric',
                  pattern: '[0-9]*'
                }}
                value={scaleInput || scale.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (Number(value) >= 0 && Number(value) <= 9999)) {
                    setScaleInput(value);
                    const newScale = Number(value);
                    if (!isNaN(newScale) && newScale >= 1 && newScale <= 9999) {
                      setScale(newScale);
                      updateDimensionsFromScale(newScale);
                    }
                  }
                }}
              />
              </Grid>
              {imageInfo && options.width && options.height && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Target size: {options.width}×{options.height}px
                  </Typography>
                </Grid>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Grid>

      <Grid item xs={12}>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Manual Dimensions</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  type="number"
                  label="Width"
                  fullWidth
                  value={options.width || ''}
                  onChange={(e) => {
                    const newWidth = Number(e.target.value);
                    if (imageInfo) {
                      const aspectRatio = imageInfo.height / imageInfo.width;
                      setOptions({ 
                        ...options, 
                        width: newWidth,
                        height: Math.round(newWidth * aspectRatio)
                      });
                      setScale((newWidth / imageInfo.width) * 100);
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  type="number"
                  label="Height"
                  fullWidth
                  value={options.height || ''}
                  onChange={(e) => {
                    const newHeight = Number(e.target.value);
                    if (imageInfo) {
                      const aspectRatio = imageInfo.width / imageInfo.height;
                      setOptions({ 
                        ...options, 
                        height: newHeight,
                        width: Math.round(newHeight * aspectRatio)
                      });
                      setScale((newHeight / imageInfo.height) * 100);
                    }
                  }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Grid>
    </Grid>
  );

  const CompressionControls = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>Compression Type</InputLabel>
          <Select
            value={compressionType}
            label="Compression Type"
            onChange={(e) => setCompressionType(e.target.value as 'size' | 'percentage')}
          >
            <MenuItem value="percentage">Quality Percentage</MenuItem>
            <MenuItem value="size">Target Size (MB)</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          type="number"
          label={compressionType === 'percentage' ? 'Quality %' : 'Size (MB)'}
          fullWidth
          value={compressionValue}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (compressionType === 'percentage') {
              if (value >= 1 && value <= 100) {
                setCompressionValue(value);
              }
            } else {
              if (value > 0) {
                setCompressionValue(value);
              }
            }
          }}
          inputProps={{
            min: compressionType === 'percentage' ? 1 : 0.1,
            max: compressionType === 'percentage' ? 100 : 100,
            step: compressionType === 'percentage' ? 1 : 0.1
          }}
        />
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleModeChange}
            fullWidth
            sx={{ mb: 2 }}
          >
            <ToggleButton value="convert">Convert Format</ToggleButton>
            <ToggleButton value="resize">Resize Image</ToggleButton>
            <ToggleButton value="compress">Compress Image</ToggleButton>
          </ToggleButtonGroup>
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUpload />}
            fullWidth
          >
            Upload Image
            <input
              type="file"
              hidden
              accept={Object.entries(ACCEPTED_TYPES)
                .map(([mime, exts]) => [mime, ...exts])
                .flat()
                .join(',')}
              onChange={handleFileSelect}
            />
          </Button>
        </Grid>

        {mode === 'compress' && (
          <Grid item xs={12}>
            <CompressionControls />
          </Grid>
        )}

        {mode === 'convert' && (
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={options.format}
                label="Format"
                onChange={(e) => setOptions({ ...options, format: e.target.value })}
              >
                <MenuItem value="png">PNG</MenuItem>
                <MenuItem value="jpg">JPG</MenuItem>
                <MenuItem value="webp">WebP</MenuItem>
              </Select>
            </FormControl>
            
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Resize Options (Optional)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <ResizeControls />
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {mode === 'resize' && (
          <Grid item xs={12}>
            <ResizeControls />
          </Grid>
        )}

        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConvert}
            disabled={!selectedFile}
            fullWidth
          >
            {mode === 'convert' ? 'Convert' : 'Resize'}
          </Button>
        </Grid>

        {preview && (
          <Grid item xs={12}>
            <Box
              component="img"
              src={preview}
              sx={{
                maxWidth: '100%',
                maxHeight: '300px',
                display: 'block',
                margin: '0 auto',
              }}
              alt="Preview"
            />
          </Grid>
        )}
      </Grid>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={status === 'success'}
        autoHideDuration={6000}
        onClose={() => setStatus('idle')}
      >
        <Alert severity="success" onClose={() => setStatus('idle')}>
          Conversion successful
        </Alert>
      </Snackbar>

      <Snackbar
        open={status === 'error'}
        autoHideDuration={6000}
        onClose={() => setStatus('idle')}
      >
        <Alert severity="error" onClose={() => setStatus('idle')}>
          {errorMessage}
        </Alert>
      </Snackbar>
      <Box sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">
          Made by Toolworks.dev • <a href="https://github.com/toolworks-dev/image-tools" style={{color: 'inherit'}}>GitHub</a>
        </Typography>
      </Box>
    </Box>
  );
};

export default ImageConverter;