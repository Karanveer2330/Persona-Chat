import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 New Upload API - Starting upload process');
    
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      console.log('❌ No files uploaded');
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    // Store files in public/uploads for direct serving
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Create uploads directory if it doesn't exist
    try {
      await mkdir(uploadDir, { recursive: true });
      console.log('📁 Upload directory created/verified:', uploadDir);
    } catch (error) {
      console.log('📁 Upload directory already exists');
    }

    const uploadedFiles = [];

    for (const file of files) {
      console.log('📄 Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'audio/mp3', 'audio/wav',
        'application/pdf', 'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        console.log('❌ File type not allowed:', file.type);
        return NextResponse.json({ 
          error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}` 
        }, { status: 400 });
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        console.log('❌ File too large:', file.name, file.size);
        return NextResponse.json({ 
          error: `File ${file.name} is too large. Maximum size is 10MB` 
        }, { status: 400 });
      }

      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const uniqueFilename = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      const filePath = join(uploadDir, uniqueFilename);

      console.log('💾 Saving file to:', filePath);

      // Convert file to buffer and write to disk
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Determine file type for frontend
      let mediaType = 'file';
      if (file.type.startsWith('image/')) {
        mediaType = 'image';
      } else if (file.type.startsWith('video/')) {
        mediaType = 'video';
      } else if (file.type.startsWith('audio/')) {
        mediaType = 'audio';
      }

      const uploadedFile = {
        id: randomUUID(),
        name: file.name,
        url: `/uploads/${uniqueFilename}`, // Direct URL to public/uploads
        type: mediaType,
        size: file.size,
        mimeType: file.type
      };

      uploadedFiles.push(uploadedFile);
      console.log('✅ File uploaded successfully:', uploadedFile);
    }

    console.log('🎉 Upload completed successfully. Files:', uploadedFiles.length);
    
    return NextResponse.json({ 
      success: true, 
      files: uploadedFiles 
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed. Please try again.' 
    }, { status: 500 });
  }
}
