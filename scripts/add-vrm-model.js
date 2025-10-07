#!/usr/bin/env node

/**
 * VRM Model Management Script
 * 
 * This script helps you add VRM models to your PersonaPlay3D application.
 * 
 * Usage:
 * node add-vrm-model.js --name "Cool Avatar" --file "path/to/model.vrm" --creator "YourName"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models', 'vrm');
const MODELS_JSON = path.join(MODELS_DIR, 'models.json');

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function getModelSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const bytes = stats.size;
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)}KB`;
    } else {
      return `${Math.round(bytes / (1024 * 1024))}MB`;
    }
  } catch (error) {
    return 'Unknown';
  }
}

function addModel(name, filePath, creator, description = '') {
  // Ensure the VRM directory exists
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  // Read existing models
  let modelsData = { models: [] };
  if (fs.existsSync(MODELS_JSON)) {
    modelsData = JSON.parse(fs.readFileSync(MODELS_JSON, 'utf8'));
  }

  // Generate new model entry
  const modelId = generateId();
  const fileName = `${modelId}.vrm`;
  const newModelPath = path.join(MODELS_DIR, fileName);

  // Copy the VRM file
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, newModelPath);
    console.log(`✅ Copied VRM file to: ${newModelPath}`);
  } else {
    console.error(`❌ VRM file not found: ${filePath}`);
    return;
  }

  // Create model entry
  const newModel = {
    id: modelId,
    name: name,
    description: description || `Custom 3D avatar: ${name}`,
    url: `/models/vrm/${fileName}`,
    thumbnail: `/models/vrm/thumbnails/${modelId}.jpg`,
    size: getModelSize(newModelPath),
    creator: creator,
    isDefault: false
  };

  // Add to models array
  modelsData.models.push(newModel);

  // Save updated models.json
  fs.writeFileSync(MODELS_JSON, JSON.stringify(modelsData, null, 2));
  console.log(`✅ Added model "${name}" to models.json`);

  console.log(`\n🎉 Model added successfully!`);
  console.log(`   ID: ${modelId}`);
  console.log(`   Name: ${name}`);
  console.log(`   Size: ${newModel.size}`);
  console.log(`   Path: ${newModel.url}`);
  console.log(`\n💡 Note: Add a thumbnail image at: public${newModel.thumbnail}`);
}

function listModels() {
  if (!fs.existsSync(MODELS_JSON)) {
    console.log('No models found. Add your first model!');
    return;
  }

  const modelsData = JSON.parse(fs.readFileSync(MODELS_JSON, 'utf8'));
  console.log('\n📋 Current VRM Models:');
  console.log('════════════════════════════════════════');
  
  modelsData.models.forEach((model, index) => {
    console.log(`${index + 1}. ${model.name} (${model.size})`);
    console.log(`   ID: ${model.id}`);
    console.log(`   Creator: ${model.creator}`);
    console.log(`   Path: ${model.url}`);
    if (model.isDefault) console.log(`   🌟 Default Model`);
    console.log('');
  });
}

// Command line argument parsing
const args = process.argv.slice(2);

if (args.includes('--list')) {
  listModels();
} else if (args.includes('--help') || args.length === 0) {
  console.log(`
🎭 VRM Model Management Tool

Usage:
  node add-vrm-model.js --add --name "Model Name" --file "path/to/model.vrm" --creator "Creator Name" [--description "Description"]
  node add-vrm-model.js --list
  node add-vrm-model.js --help

Examples:
  # Add a new VRM model
  node add-vrm-model.js --add --name "Anime Girl" --file "./my-avatar.vrm" --creator "VRoid Studio"
  
  # List all models
  node add-vrm-model.js --list

Notes:
  - VRM files will be copied to public/models/vrm/
  - Each model gets a unique ID and filename
  - Add thumbnail images manually to public/models/vrm/thumbnails/
  - Recommended VRM file size: under 25MB for good performance
`);
} else if (args.includes('--add')) {
  const nameIndex = args.indexOf('--name');
  const fileIndex = args.indexOf('--file');
  const creatorIndex = args.indexOf('--creator');
  const descIndex = args.indexOf('--description');

  if (nameIndex === -1 || fileIndex === -1 || creatorIndex === -1) {
    console.error('❌ Missing required arguments. Use --help for usage information.');
    process.exit(1);
  }

  const name = args[nameIndex + 1];
  const filePath = args[fileIndex + 1];
  const creator = args[creatorIndex + 1];
  const description = descIndex !== -1 ? args[descIndex + 1] : '';

  if (!name || !filePath || !creator) {
    console.error('❌ Invalid arguments. Use --help for usage information.');
    process.exit(1);
  }

  addModel(name, filePath, creator, description);
} else {
  console.error('❌ Unknown command. Use --help for usage information.');
  process.exit(1);
}
