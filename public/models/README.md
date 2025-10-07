# VRM Model Management Guide

## 🎭 PersonaPlay3D Avatar System

This guide helps you add and manage VRM models for the PersonaPlay3D feature.

## 📁 Directory Structure

```
public/models/vrm/
├── models.json          # Model registry file
├── [model-id].vrm       # VRM model files
└── thumbnails/          # Model preview images
    └── [model-id].jpg
```

## 🚀 Quick Start

### Option 1: Using the Management Script (Recommended)

```bash
# Add a new VRM model
node scripts/add-vrm-model.js --add --name "Cool Avatar" --file "path/to/model.vrm" --creator "YourName"

# List all models
node scripts/add-vrm-model.js --list

# Get help
node scripts/add-vrm-model.js --help
```

### Option 2: Manual Setup

1. **Copy your VRM file** to `public/models/vrm/` with a unique name
2. **Add thumbnail** (optional) to `public/models/vrm/thumbnails/`
3. **Update models.json** with your model info:

```json
{
  "models": [
    {
      "id": "unique-id",
      "name": "Your Avatar Name",
      "description": "Description of your avatar",
      "url": "/models/vrm/your-model.vrm",
      "thumbnail": "/models/vrm/thumbnails/your-model.jpg",
      "size": "20MB",
      "creator": "Your Name",
      "isDefault": false
    }
  ]
}
```

## 📝 VRM Model Requirements

### File Size Recommendations
- **Development**: Up to 25MB per model
- **Production**: Under 15MB recommended
- **Optimal**: 5-10MB for best performance

### VRM Version Support
- **VRM 0.0** ✅ Fully supported
- **VRM 1.0** ✅ Supported via @pixiv/three-vrm

### Model Quality Guidelines
- **Polygons**: Under 20k triangles for optimal performance
- **Textures**: 1024x1024 or 2048x2048 max resolution
- **Bones**: Standard humanoid rig preferred
- **Expressions**: BlendShapes for facial animations

## 🎨 Getting VRM Models

### Free Sources
- **VRoid Studio**: https://vroid.com/studio (Create your own)
- **VRoid Hub**: https://hub.vroid.com/ (Download community models)
- **Ready Player Me**: https://readyplayer.me/ (Generate from photo)

### Paid Sources
- **Booth.pm**: https://booth.pm/ (Japanese marketplace)
- **Unity Asset Store**: Search for "VRM"
- **Gumroad**: Independent creators

## 🛠️ Development vs Production

### For Development (Current Setup)
- Store models in `public/models/vrm/`
- Direct file serving by Next.js
- Fast iteration and testing
- No upload/download complexity

### For Production (Future)
Consider moving to:
- **Cloud Storage**: AWS S3, Google Cloud Storage
- **CDN**: CloudFront, Cloudflare
- **Database**: Model metadata in PostgreSQL/MongoDB
- **Upload System**: Direct upload to cloud storage

## 🏗️ Implementation Details

### Current Architecture
```
PersonaPlay3D Page
├── VRMModelSelector Component
│   ├── Loads models.json
│   ├── Displays model cards
│   └── Handles selection
└── ThreeCanvas Component
    ├── Receives vrmUrl prop
    ├── Loads VRM with GLTFLoader
    └── Renders with Three.js
```

### Model Loading Process
1. User selects model in VRMModelSelector
2. Model URL passed to ThreeCanvas
3. GLTFLoader fetches and parses VRM
4. VRM added to Three.js scene
5. Facial tracking applied to VRM

## 🔧 Troubleshooting

### Model Won't Load
- Check file path in models.json
- Verify VRM file isn't corrupted
- Check browser console for errors
- Ensure file size isn't too large

### Performance Issues
- Reduce model polygon count
- Compress textures
- Check for unnecessary blend shapes
- Monitor frame rate in browser

### Facial Tracking Not Working
- Ensure model has proper facial blend shapes
- Check VRM humanoid bone mapping
- Verify camera permissions
- Test with default model first

## 📊 File Size Analysis

Your 4-5 VRM models at 20MB each = 80-100MB total
- **Public folder**: ✅ Good for dev (served directly)
- **Database**: ❌ Too large for most databases
- **Cloud storage**: ✅ Best for production

## 🚀 Next Steps

1. **Add your VRM models** using the script
2. **Test in PersonaPlay3D** 
3. **Optimize for performance**
4. **Plan production storage** when ready to deploy

## 🆘 Support

Need help? Check:
- VRM specification: https://vrm.dev/
- Three-VRM documentation: https://pixiv.github.io/three-vrm/
- Three.js documentation: https://threejs.org/docs/
If you want to use a different filename, edit:
```typescript
// In src/app/persona3d/page.tsx, change:
vrmUrl={null} // Uses default avatar
// to:
vrmUrl="/models/your-custom-avatar.vrm"
```

## VRM Model Requirements
- File format: `.vrm` (VRM 0.x or 1.0)
- Recommended size: Under 50MB
- Must be VRM-compliant for facial tracking
- Should include proper bone structure for motion tracking

## Troubleshooting
- **404 Error**: Make sure the file is in `public/models/`
- **Loading Issues**: Check the browser console for detailed errors
- **No Animation**: Ensure the VRM has proper humanoid bone mapping

## Default Avatar
If no local avatar is found, the app uses a default avatar hosted on our CDN at:
`https://d1l5n2avb89axj.cloudfront.net/avatar-first.vrm`
