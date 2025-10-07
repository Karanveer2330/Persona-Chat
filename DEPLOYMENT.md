# Deployment Guide

## Quick Start for GitHub Deployment

### 1. Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit: Hub 3D Avatar Chat Platform"
```

### 2. Create GitHub Repository
1. Go to GitHub.com
2. Click "New repository"
3. Name it "hub" or your preferred name
4. Don't initialize with README (we already have one)
5. Click "Create repository"

### 3. Connect and Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/hub.git
git branch -M main
git push -u origin main
```

### 4. Deploy to Vercel (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Set environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A random secret key
   - `NEXTAUTH_SECRET`: Another random secret key
   - `NEXTAUTH_URL`: Your Vercel domain (auto-filled)
6. Click "Deploy"

### 5. Alternative: Deploy to Netlify

1. Go to [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Set environment variables in Site settings
5. Deploy

### 6. Alternative: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add MongoDB service
4. Set environment variables
5. Deploy

## Environment Variables Setup

Create these environment variables in your hosting platform:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hub
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NEXTAUTH_SECRET=your-nextauth-secret-min-32-chars
NEXTAUTH_URL=https://yourdomain.com
```

## Database Setup

### MongoDB Atlas (Recommended)
1. Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create free cluster
3. Create database user
4. Whitelist your IP (or 0.0.0.0/0 for all IPs)
5. Get connection string

### Local MongoDB
```bash
# Install MongoDB locally
# Then use: mongodb://localhost:27017/hub
```

## Post-Deployment Checklist

- [ ] Environment variables set correctly
- [ ] Database connected and working
- [ ] HTTPS enabled (automatic with Vercel/Netlify)
- [ ] Domain configured (if using custom domain)
- [ ] Test all features:
  - [ ] User registration/login
  - [ ] Global chat
  - [ ] Private messaging
  - [ ] 3D avatar video calls
  - [ ] File uploads

## Troubleshooting

### Common Issues

1. **Build Errors**: Check that all dependencies are in package.json
2. **Database Connection**: Verify MongoDB URI and network access
3. **Video Calls Not Working**: Ensure HTTPS is enabled (required for camera access)
4. **File Uploads**: Check file size limits and storage configuration

### Support

If you encounter issues:
1. Check the browser console for errors
2. Check your hosting platform's logs
3. Verify all environment variables are set
4. Test locally first with `npm run dev`
