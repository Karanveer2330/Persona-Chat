# Media Sharing Feature

## Overview
The chat application now supports sharing various types of media files in both private and global chat rooms.

## Supported File Types
- **Images**: JPEG, JPG, PNG, GIF, WebP
- **Videos**: MP4, AVI, MOV
- **Audio**: MP3, WAV
- **Documents**: PDF, DOC, DOCX, TXT
- **Archives**: ZIP, RAR

## Features

### Media Upload
- Click the "Attach" button (📎) in the message input area
- Select one or multiple files (up to 50MB each)
- Preview selected files before sending
- Remove individual files from selection

### Media Display
- **Images**: Displayed as thumbnails, click to view full size
- **Videos**: Embedded video player with controls
- **Audio**: Audio player with playback controls
- **Files**: File information with download button

### File Management
- All uploaded files are stored in `/server/uploads/`
- Files are accessible via `http://localhost:5000/uploads/filename`
- Unique filenames prevent conflicts
- Download any shared media file

## Usage

### In Global Chat
1. Navigate to Global Chat
2. Click the "Attach" button
3. Select files to upload
4. Add optional text message
5. Send the message

### In Private Chat
1. Open any private conversation
2. Use the same media upload process
3. Media is shared only between the two participants

## Technical Details

### File Upload Endpoint
- **POST** `/api/upload`
- Accepts multipart/form-data
- Returns file metadata including URLs

### Message Structure
Messages now support an optional `media` array containing:
```typescript
interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
}
```

### Database Schema
- Messages can now have empty `content` if media is present
- Media attachments are embedded in message documents
- Both global and private messages support media

## Security Considerations
- File type validation on upload
- File size limits (50MB per file)
- Unique filename generation to prevent conflicts
- No executable file uploads allowed

## Future Enhancements
- Image compression and thumbnail generation
- Drag & drop file upload
- Copy/paste image support
- File preview in chat
- Media gallery view
