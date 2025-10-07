"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { VRM, VRMUtils, VRMLoaderPlugin, VRMHumanoid } from "@pixiv/three-vrm";
import * as Kalidokit from "kalidokit";
import { useToast } from "@/src/hooks/use-toast";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface ThreeCanvasProps {
  vrmUrl: string | null;
  isCameraEnabled: boolean;
  enableFaceTracking?: boolean;
  onAvatarDataUpdate?: (data: any) => void;
  remoteAvatarData?: any;
  remoteModelUrl?: string | null;
  isDualAvatar?: boolean;
  localAvatarName?: string;
  remoteAvatarName?: string;
  callMode?: 'shared-environment' | 'normal-video';
  onModelChange?: (modelUrl: string) => void;
}

// Helper function to reset VRM to proper standing pose
const resetVRMToStandingPose = (vrm: VRM, instanceId: string) => {
  if (!vrm.humanoid) return;
  
  // Simple standing pose - just reset everything to neutral
  const bones: (keyof VRMHumanoid["humanBones"])[] = [
    'hips', 'spine', 'chest', 'neck', 'head',
    'leftUpperArm', 'leftLowerArm', 'leftHand',
    'rightUpperArm', 'rightLowerArm', 'rightHand',
    'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
    'rightUpperLeg', 'rightLowerLeg', 'rightFoot'
  ];
  
  bones.forEach(boneName => {
    const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
    if (bone) {
      bone.rotation.set(0, 0, 0);
      bone.position.set(0, 0, 0);
    }
  });
  
  console.log(`[${instanceId}] Reset to neutral standing pose`);
};

// Helper function to animate pose
const rigPose = (vrm: VRM, riggedPose: any) => {
  if (!vrm.humanoid) return;

  // Apply spine rotation for body movement
  if (riggedPose.spine) {
    rigRotation(vrm, "spine", {
      x: riggedPose.spine.x,
      y: riggedPose.spine.y,
      z: riggedPose.spine.z
    }, 1, 0.7);
  }

  // Apply arm rotations
  if (riggedPose.leftUpperArm) {
    rigRotation(vrm, "leftUpperArm", {
      x: riggedPose.leftUpperArm.x,
      y: riggedPose.leftUpperArm.y,
      z: riggedPose.leftUpperArm.z
    }, 1, 0.7);
  }

  if (riggedPose.rightUpperArm) {
    rigRotation(vrm, "rightUpperArm", {
      x: riggedPose.rightUpperArm.x,
      y: riggedPose.rightUpperArm.y,
      z: riggedPose.rightUpperArm.z
    }, 1, 0.7);
  }

  if (riggedPose.leftLowerArm) {
    rigRotation(vrm, "leftLowerArm", {
      x: riggedPose.leftLowerArm.x,
      y: riggedPose.leftLowerArm.y,
      z: riggedPose.leftLowerArm.z
    }, 1, 0.7);
  }

  if (riggedPose.rightLowerArm) {
    rigRotation(vrm, "rightLowerArm", {
      x: riggedPose.rightLowerArm.x,
      y: riggedPose.rightLowerArm.y,
      z: riggedPose.rightLowerArm.z
    }, 1, 0.7);
  }
};

// Helper function to animate left hand
const rigLeftHand = (vrm: VRM, riggedLeftHand: any) => {
  if (!vrm.humanoid) return;

  if (riggedLeftHand.leftWrist) {
    rigRotation(vrm, "leftHand", {
      x: riggedLeftHand.leftWrist.x,
      y: riggedLeftHand.leftWrist.y,
      z: riggedLeftHand.leftWrist.z
    }, 1, 0.7);
  }
};

// Helper function to animate right hand
const rigRightHand = (vrm: VRM, riggedRightHand: any) => {
  if (!vrm.humanoid) return;

  if (riggedRightHand.rightWrist) {
    rigRotation(vrm, "rightHand", {
      x: riggedRightHand.rightWrist.x,
      y: riggedRightHand.rightWrist.y,
      z: riggedRightHand.rightWrist.z
    }, 1, 0.7);
  }
};

// Helper function to reset VRM to proper sitting pose - DISABLED
// const resetVRMToSittingPose = (vrm: VRM, instanceId: string) => {
//   if (!vrm.humanoid) return;
//   
//   // Reset all bones to neutral first
//   const bones: (keyof VRMHumanoid["humanBones"])[] = [
//     'hips', 'spine', 'chest', 'neck', 'head',
//     'leftUpperArm', 'leftLowerArm', 'leftHand',
//     'rightUpperArm', 'rightLowerArm', 'rightHand',
//     'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
//     'rightUpperLeg', 'rightLowerLeg', 'rightFoot'
//   ];
//   
//   bones.forEach(boneName => {
//     const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
//     if (bone) {
//       bone.rotation.set(0, 0, 0);
//       bone.position.set(0, 0, 0);
//     }
//   });
//   
//   // Apply simple sitting adjustments
//   const hips = vrm.humanoid.getNormalizedBoneNode('hips');
//   if (hips) {
//     hips.rotation.x = 0.2; // Forward tilt for sitting
//   }
//   
//   const leftUpperLeg = vrm.humanoid.getNormalizedBoneNode('leftUpperLeg');
//   if (leftUpperLeg) {
//     leftUpperLeg.rotation.x = -0.6; // Bent at hip (negative for forward bend)
//   }
//   
//   const rightUpperLeg = vrm.humanoid.getNormalizedBoneNode('rightUpperLeg');
//   if (rightUpperLeg) {
//     rightUpperLeg.rotation.x = -0.6; // Bent at hip (negative for forward bend)
//   }
//   
//   const leftLowerLeg = vrm.humanoid.getNormalizedBoneNode('leftLowerLeg');
//   if (leftLowerLeg) {
//     leftLowerLeg.rotation.x = -0.4; // Bent at knee (negative for forward bend)
//   }
//   
//   const rightLowerLeg = vrm.humanoid.getNormalizedBoneNode('rightLowerLeg');
//   if (rightLowerLeg) {
//     rightLowerLeg.rotation.x = -0.4; // Bent at knee (negative for forward bend)
//   }
//   
//   console.log(`[${instanceId}] Reset to simple sitting pose`);
// };

// Animate Rotation Helper function
const rigRotation = (vrm: VRM, name: keyof VRMHumanoid["humanBones"], rotation = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.4) => {
    if (!vrm.humanoid) return;

    const Part = vrm.humanoid.getNormalizedBoneNode(name);
    if (!Part) return;

    let euler = new THREE.Euler(rotation.x * dampener, rotation.y * dampener, rotation.z * dampener, "XYZ");
    let quaternion = new THREE.Quaternion().setFromEuler(euler);
    Part.quaternion.slerp(quaternion, lerpAmount);
};

// Animate Position Helper Function
const rigPosition = (vrm: VRM, name: keyof VRMHumanoid["humanBones"], position = { x: 0, y: 0, z: 0 }, dampener = 1, lerpAmount = 0.4) => {
    if (!vrm.humanoid) return;
    
    const Part = vrm.humanoid.getNormalizedBoneNode(name);
    if (!Part) return;

    let vector = new THREE.Vector3(position.x * dampener, position.y * dampener, position.z * dampener);
    Part.position.lerp(vector, lerpAmount);
};

// Available VRM models
const AVAILABLE_MODELS = [
  {
    id: 'fem1',
    name: 'Fem1 Avatar',
    url: '/models/vrm/Fem1.vrm',
    description: 'Professional 3D female avatar with realistic facial features and smooth animations',
    preview: '/models/vrm/thumbnails/fem1.svg'
  },
  {
    id: 'fem2',
    name: 'Fem2 Avatar',
    url: '/models/vrm/Fem2.vrm',
    description: 'Stylish 3D female avatar with modern design and advanced facial expressions',
    preview: '/models/vrm/thumbnails/fem2.svg'
  },
  {
    id: 'fem3',
    name: 'Fem3 Avatar',
    url: '/models/vrm/fem3.vrm',
    description: 'Premium 3D female avatar with enhanced features and smooth body animations',
    preview: '/models/vrm/thumbnails/fem3.svg'
  },
  {
    id: 'male1',
    name: 'Male1 Avatar',
    url: '/models/vrm/Male1.vrm',
    description: 'Professional 3D male avatar with realistic facial features and smooth body animations',
    preview: '/models/vrm/thumbnails/male1.svg'
  },
  {
    id: 'male2',
    name: 'Male2 Avatar',
    url: '/models/vrm/male%202.vrm',
    description: 'Latest 3D male avatar model with cutting-edge facial tracking technology',
    preview: '/models/vrm/thumbnails/male2.svg'
  },
  {
    id: 'secret',
    name: 'Secret Avatar',
    url: '/models/vrm/Secret.vrm',
    description: 'Hidden avatar model',
    preview: '/models/vrm/thumbnails/secret.svg',
    hidden: true // Mark as hidden from UI
  }
];

// Global instance tracker to prevent multiple instances
let activeInstanceCount = 0;

const ThreeCanvas = ({ vrmUrl, isCameraEnabled, enableFaceTracking = true, onAvatarDataUpdate, remoteAvatarData, remoteModelUrl, isDualAvatar = false, localAvatarName = "You", remoteAvatarName = "Remote", callMode = 'shared-environment', onModelChange }: ThreeCanvasProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debug logging for props
  const instanceId = useMemo(() => Math.random().toString(36).substr(2, 9), []); // Stable instance ID
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentVrm = useRef<VRM | null>(null);
  const remoteVrm = useRef<VRM | null>(null); // For dual avatar mode
  const loadedModels = useRef<Map<string, VRM>>(new Map()); // Cache loaded models
  const sceneRef = useRef<THREE.Scene | null>(null); // Store scene reference
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null); // Store camera reference
  const isLoadingRef = useRef<boolean>(false); // Prevent multiple simultaneous loads
  const { toast } = useToast();
  const [isHolisticLoaded, setIsHolisticLoaded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(vrmUrl || AVAILABLE_MODELS[0].url);
  const [remoteModel, setRemoteModel] = useState<string>(remoteModelUrl || AVAILABLE_MODELS[0].url);
  const [isLandscapeBackgroundEnabled, setIsLandscapeBackgroundEnabled] = useState(false);
  
  // Sync selectedModel with vrmUrl prop changes
  useEffect(() => {
    if (vrmUrl && vrmUrl !== selectedModel) {
      console.log(`[${instanceId}] Syncing selectedModel with vrmUrl:`, vrmUrl);
      setSelectedModel(vrmUrl);
    }
  }, [vrmUrl, selectedModel, instanceId]);
  
  // Sync remoteModel with remoteModelUrl prop changes
  useEffect(() => {
    if (remoteModelUrl && remoteModelUrl !== remoteModel) {
      console.log(`[${instanceId}] Syncing remoteModel with remoteModelUrl:`, remoteModelUrl);
      setRemoteModel(remoteModelUrl);
    }
  }, [remoteModelUrl, remoteModel, instanceId]);
  
  const oldLookTarget = useRef(new THREE.Euler());
  const [isWaving, setIsWaving] = useState(false);
  const [isBigWave, setIsBigWave] = useState(false);
  const [isBowing, setIsBowing] = useState(false);
  const [isWinking, setIsWinking] = useState(false);
  const [isSurprised, setIsSurprised] = useState(false);
  const [isConfused, setIsConfused] = useState(false);

  // Model selection handler
  const handleModelSelect = (model: any) => {
    console.log(`[${instanceId}] Model selected:`, model);
    setSelectedModel(model.url);
    setShowModelSelector(false);
    
    // Actually change the model by calling onModelChange
    if (onModelChange) {
      console.log(`[${instanceId}] Calling onModelChange with:`, model.url);
      onModelChange(model.url);
    }
    
    toast({
      title: "Avatar Changed",
      description: `Switched to ${model.name}`,
    });
  };
  const [isExcited, setIsExcited] = useState(false);
  const [isHeadBob, setIsHeadBob] = useState(false);
  const [isShoulderShimmy, setIsShoulderShimmy] = useState(false);
  const [isHipSway, setIsHipSway] = useState(false);
  
  // Controls visibility and position
  const [showControls, setShowControls] = useState(false);
  const [controlsPosition, setControlsPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Drag handlers for controls
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };
  
  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setControlsPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Track pressed key for remote reactions
  const pressedKeyRef = useRef<string | null>(null);
  
  // Track if remote avatar is performing a reaction (to pause pose tracking)
  const remoteReactionActiveRef = useRef<boolean>(false);
  const remoteReactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  
  const waveAnimationRef = useRef<number | null>(null);
  const bigWaveAnimationRef = useRef<number | null>(null);
  const bowAnimationRef = useRef<number | null>(null);
  const winkAnimationRef = useRef<number | null>(null);
  const surprisedAnimationRef = useRef<number | null>(null);
  const confusedAnimationRef = useRef<number | null>(null);
  const excitedAnimationRef = useRef<number | null>(null);
  const headBobAnimationRef = useRef<number | null>(null);
  const shoulderShimmyAnimationRef = useRef<number | null>(null);
  const hipSwayAnimationRef = useRef<number | null>(null);

  // Optimized animation manager
  const animationManager = useRef({
    activeAnimations: new Set<string>(),
    cancelAnimation: (ref: React.MutableRefObject<number | null>) => {
      if (ref.current) {
        cancelAnimationFrame(ref.current);
        ref.current = null;
      }
    },
    startAnimation: (ref: React.MutableRefObject<number | null>, animationFn: () => void) => {
      ref.current = requestAnimationFrame(animationFn);
    }
  });


  // Load experimental 16bit background as 360-degree panoramic
  // Toggle landscape background
  const toggleLandscapeBackground = useCallback(() => {
    setIsLandscapeBackgroundEnabled(prev => !prev);
    console.log(`[${instanceId}] Landscape background toggled:`, !isLandscapeBackgroundEnabled);
  }, [isLandscapeBackgroundEnabled, instanceId]);

  // Reload background when landscape setting changes
  useEffect(() => {
    if (sceneRef.current) {
      const scene = sceneRef.current;
      
      // Remove existing background sphere
      const existingBackground = scene.getObjectByName('backgroundSphere');
      if (existingBackground) {
        scene.remove(existingBackground);
        console.log(`[${instanceId}] Removed existing background sphere`);
      }
      
      // Always set transparent background for video chat
      scene.background = null;
      console.log(`[${instanceId}] Set transparent background for video chat`);
    }
  }, [isLandscapeBackgroundEnabled, instanceId]);


  // Load basic lighting without environment
  const loadBasicLighting = async (scene: THREE.Scene, renderer: THREE.WebGLRenderer) => {
    try {
      console.log(`[${instanceId}] Setting up basic lighting without environment`);
      
      // Add subtle ambient lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
      scene.add(ambientLight);
      
      // Add directional light for better avatar visibility
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);
      
      // Set background to null for transparent environment
      scene.background = null;
      scene.environment = null;
      
      console.log(`[${instanceId}] Basic lighting set up successfully, no environment background`);
    } catch (error) {
      console.error(`[${instanceId}] Error setting up basic lighting:`, error);
      // Fallback: Add basic lighting if setup fails
      const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 5, 5);
      scene.add(directionalLight);
      
      // Ensure no background
      scene.background = null;
      scene.environment = null;
      console.log(`[${instanceId}] Using fallback lighting with no environment`);
    }
  };

  // Load bench model - Load new park bench GLTF with textures
  const loadBenchModel = async (scene: THREE.Scene) => {
    console.log(`[${instanceId}] Loading new park bench GLTF model`);
    
    try {
      const loader = new GLTFLoader();
      console.log(`[${instanceId}] Loading GLTF from: /models/scenesandobj/lowpoly_park_bench_-_game_asset/scene.gltf`);
      
      const gltf = await loader.loadAsync('/models/scenesandobj/lowpoly_park_bench_-_game_asset/scene.gltf');
      
      console.log(`[${instanceId}] GLTF loaded successfully:`, gltf);
      console.log(`[${instanceId}] GLTF scene children:`, gltf.scene.children.length);
      
      const benchModel = gltf.scene;
      
      // Process materials and textures
      benchModel.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          console.log(`[${instanceId}] Mesh found:`, mesh.name);
          
          if (mesh.material) {
            const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            console.log(`[${instanceId}] Material found:`, material.name, 'Type:', material.type);
            
            // Ensure materials are properly configured
            if ((material as any).map) {
              console.log(`[${instanceId}] Texture map found:`, (material as any).map);
              (material as any).map.flipY = false; // GLTF textures are already flipped
            }
            
            // Enable material features
            material.needsUpdate = true;
          }
        }
      });
      
      // Scale and position the bench appropriately
      benchModel.scale.setScalar(0.8); // Slightly smaller for better proportions
      benchModel.position.set(0, 0, -0.5); // Position bench behind the avatar (negative Z)
      benchModel.rotation.y = 0; // Face forward (toward camera)
      
      // Add the bench to the scene
      scene.add(benchModel);
      
      console.log(`[${instanceId}] Park bench loaded successfully, position:`, benchModel.position);
      console.log(`[${instanceId}] Park bench scale:`, benchModel.scale);
      console.log(`[${instanceId}] Park bench added to scene, total children:`, scene.children.length);
      
      return benchModel;
      
    } catch (error) {
      console.error(`[${instanceId}] Failed to load park bench GLTF:`, error);
      console.error(`[${instanceId}] Error details:`, (error as Error).message);
      
      // Fallback to simple bench
      console.log(`[${instanceId}] Creating fallback bench`);
      const benchGeometry = new THREE.BoxGeometry(2, 0.4, 1);
      const benchMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, // Brown wood color
        roughness: 0.8,
        metalness: 0.0
      });
      const fallbackBench = new THREE.Mesh(benchGeometry, benchMaterial);
      fallbackBench.position.set(0, 0.1, 0);
      scene.add(fallbackBench);
      
      return fallbackBench;
    }
  };

  // Load dual avatars for video call mode
  const loadDualVRMModels = async (localModelUrl: string, remoteModelUrl: string, scene: THREE.Scene) => {
    try {
      // Comprehensive debugging and validation
      console.log(`[${instanceId}] 🔍 loadDualVRMModels called with:`, {
        localModelUrl,
        remoteModelUrl,
        localType: typeof localModelUrl,
        remoteType: typeof remoteModelUrl,
        localValue: localModelUrl,
        remoteValue: remoteModelUrl
      });
      
      // Convert to string if it's an object or other type
      const safeLocalUrl = typeof localModelUrl === 'string' ? localModelUrl : String(localModelUrl || AVAILABLE_MODELS[0].url);
      const safeRemoteUrl = typeof remoteModelUrl === 'string' ? remoteModelUrl : String(remoteModelUrl || AVAILABLE_MODELS[0].url);
      
      console.log(`[${instanceId}] 🔧 Converted URLs:`, {
        safeLocalUrl,
        safeRemoteUrl
      });
      
      if (!safeLocalUrl || !safeRemoteUrl) {
        console.error(`[${instanceId}] Empty model URLs after conversion:`, { safeLocalUrl, safeRemoteUrl });
        throw new Error('Model URLs cannot be empty');
      }
      
      console.log(`[${instanceId}] Loading dual VRM models:`, { localModelUrl, remoteModelUrl });
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      
      // Store current positions before clearing
      let localPreviousPosition = { x: -0.6, y: 0, z: 0 };
      let localPreviousScale = { x: 1, y: 1, z: 1 };
      let remotePreviousPosition = { x: 0.6, y: 0, z: 0 };
      let remotePreviousScale = { x: 1, y: 1, z: 1 };
      
      if (currentVrm.current) {
        localPreviousPosition = {
          x: currentVrm.current.scene.position.x,
          y: currentVrm.current.scene.position.y,
          z: currentVrm.current.scene.position.z
        };
        localPreviousScale = {
          x: currentVrm.current.scene.scale.x,
          y: currentVrm.current.scene.scale.y,
          z: currentVrm.current.scene.scale.z
        };
        console.log(`[${instanceId}] Storing local avatar position:`, localPreviousPosition);
      }
      
      if (remoteVrm.current) {
        remotePreviousPosition = {
          x: remoteVrm.current.scene.position.x,
          y: remoteVrm.current.scene.position.y,
          z: remoteVrm.current.scene.position.z
        };
        remotePreviousScale = {
          x: remoteVrm.current.scene.scale.x,
          y: remoteVrm.current.scene.scale.y,
          z: remoteVrm.current.scene.scale.z
        };
        console.log(`[${instanceId}] Storing remote avatar position:`, remotePreviousPosition);
      }
      
      // Load local avatar (left side)
      const localGltf = await loader.loadAsync(safeLocalUrl);
      const localVrm = localGltf.userData.vrm;
      
      // Load remote avatar (right side) - use separate model
      const remoteGltf = await loader.loadAsync(safeRemoteUrl);
      const remoteVrmModel = remoteGltf.userData.vrm;
      
      // Remove existing models
      if (currentVrm.current) {
        scene.remove(currentVrm.current.scene);
      }
      if (remoteVrm.current) {
        scene.remove(remoteVrm.current.scene);
      }
      
      // Position avatars based on call mode, preserving previous positions
      if (callMode === 'normal-video') {
        // Single Avatar Mode: Remote avatar centered (big), Local avatar small (bottom right)
        // Remote avatar (centered, big) - this is the main avatar for single mode
        scene.add(remoteVrmModel.scene);
        remoteVrmModel.scene.position.set(0, 0, 0); // Centered
        remoteVrmModel.scene.rotation.y = Math.PI; // Face forward
        remoteVrmModel.scene.scale.setScalar(1.2); // Slightly bigger
        remoteVrm.current = remoteVrmModel;
        
        // Local avatar (small, bottom right)
        scene.add(localVrm.scene);
        localVrm.scene.position.set(0.8, 0, 0.5); // Bottom right, same height as remote
        localVrm.scene.rotation.y = Math.PI; // Face forward
        localVrm.scene.scale.setScalar(0.4); // Much smaller
        currentVrm.current = localVrm; // Keep local as current for face tracking
      } else {
        // Dual Avatar Mode: Side by side - preserve previous positions
        // Local avatar (left side)
        scene.add(localVrm.scene);
        console.log(`[${instanceId}] Setting local avatar position to:`, localPreviousPosition);
        localVrm.scene.position.set(localPreviousPosition.x, localPreviousPosition.y, localPreviousPosition.z);
        localVrm.scene.rotation.y = Math.PI; // Face forward
        localVrm.scene.scale.set(localPreviousScale.x, localPreviousScale.y, localPreviousScale.z);
        currentVrm.current = localVrm;
        
        // Remote avatar (right side)
        scene.add(remoteVrmModel.scene);
        console.log(`[${instanceId}] Setting remote avatar position to:`, remotePreviousPosition);
        remoteVrmModel.scene.position.set(remotePreviousPosition.x, remotePreviousPosition.y, remotePreviousPosition.z);
        remoteVrmModel.scene.rotation.y = Math.PI; // Face forward
        remoteVrmModel.scene.scale.set(remotePreviousScale.x, remotePreviousScale.y, remotePreviousScale.z);
        remoteVrm.current = remoteVrmModel;
        
        console.log(`[${instanceId}] Avatar positions preserved:`, {
          local: localVrm.scene.position,
          remote: remoteVrmModel.scene.position,
          localScale: localVrm.scene.scale,
          remoteScale: remoteVrmModel.scene.scale,
          isMobile: isMobile,
          devicePixelRatio: window.devicePixelRatio
        });
      }
      
      // Reset both VRMs to proper standing pose (fixes T-pose issue)
      resetVRMToStandingPose(localVrm, instanceId);
      resetVRMToStandingPose(remoteVrmModel, instanceId);
      
      // Mobile-specific: Add small delay to ensure positions are properly applied
      if (isMobile) {
        setTimeout(() => {
          console.log(`[${instanceId}] Mobile: Verifying positions after delay:`, {
            local: currentVrm.current?.scene.position,
            remote: remoteVrm.current?.scene.position
          });
          
          // Re-apply positions if they were reset
          if (currentVrm.current && callMode === 'shared-environment') {
            const currentPos = currentVrm.current.scene.position;
            if (Math.abs(currentPos.x) < 0.1 && Math.abs(currentPos.z) < 0.1) {
              console.log(`[${instanceId}] Mobile: Re-applying local position`);
              currentVrm.current.scene.position.set(localPreviousPosition.x, localPreviousPosition.y, localPreviousPosition.z);
            }
          }
          
          if (remoteVrm.current && callMode === 'shared-environment') {
            const remotePos = remoteVrm.current.scene.position;
            if (Math.abs(remotePos.x) < 0.1 && Math.abs(remotePos.z) < 0.1) {
              console.log(`[${instanceId}] Mobile: Re-applying remote position`);
              remoteVrm.current.scene.position.set(remotePreviousPosition.x, remotePreviousPosition.y, remotePreviousPosition.z);
            }
          }
        }, 100);
        
        // Mobile-specific: Set up periodic position stabilization to prevent drift
        const stabilizePositions = () => {
          if (currentVrm.current && callMode === 'shared-environment') {
            const currentPos = currentVrm.current.scene.position;
            // Check if avatar has drifted from its intended position
            if (Math.abs(currentPos.x - localPreviousPosition.x) > 0.1 || 
                Math.abs(currentPos.y - localPreviousPosition.y) > 0.1 ||
                Math.abs(currentPos.z - localPreviousPosition.z) > 0.1) {
              console.log(`[${instanceId}] Mobile: Stabilizing local position (drift detected)`);
              currentVrm.current.scene.position.set(localPreviousPosition.x, localPreviousPosition.y, localPreviousPosition.z);
            }
          }
          
          if (remoteVrm.current && callMode === 'shared-environment') {
            const remotePos = remoteVrm.current.scene.position;
            // Check if avatar has drifted from its intended position
            if (Math.abs(remotePos.x - remotePreviousPosition.x) > 0.1 || 
                Math.abs(remotePos.y - remotePreviousPosition.y) > 0.1 ||
                Math.abs(remotePos.z - remotePreviousPosition.z) > 0.1) {
              console.log(`[${instanceId}] Mobile: Stabilizing remote position (drift detected)`);
              remoteVrm.current.scene.position.set(remotePreviousPosition.x, remotePreviousPosition.y, remotePreviousPosition.z);
            }
          }
        };
        
        // Run position stabilization every 2 seconds on mobile
        const stabilizationInterval = setInterval(stabilizePositions, 2000);
        
        // Store interval reference for cleanup
        if (!(window as any).mobileStabilizationIntervals) {
          (window as any).mobileStabilizationIntervals = new Set();
        }
        (window as any).mobileStabilizationIntervals.add(stabilizationInterval);
      }
      
      // Setup lookAt targets
      if (localVrm.lookAt) {
        localVrm.lookAt.target = new THREE.Object3D();
        localVrm.scene.add(localVrm.lookAt.target);
      }
      
      if (remoteVrmModel.lookAt) {
        remoteVrmModel.lookAt.target = new THREE.Object3D();
        remoteVrmModel.scene.add(remoteVrmModel.lookAt.target);
      }
      
      // Load the real stone bench model
      // await loadBenchModel(scene); // BENCH REMOVED
      
      // Cache the models
      loadedModels.current.set(localModelUrl, localVrm);
      loadedModels.current.set(remoteModelUrl, remoteVrmModel);
      
      // Debug logging
      console.log(`[${instanceId}] Local avatar position:`, localVrm.scene.position);
      console.log(`[${instanceId}] Local avatar scale:`, localVrm.scene.scale);
      console.log(`[${instanceId}] Remote avatar position:`, remoteVrmModel.scene.position);
      console.log(`[${instanceId}] Remote avatar scale:`, remoteVrmModel.scene.scale);
      console.log(`[${instanceId}] Local avatar visible:`, localVrm.scene.visible);
      console.log(`[${instanceId}] Remote avatar visible:`, remoteVrmModel.scene.visible);
      
      toast({
        title: "Dual Avatars Loaded",
        description: `${localAvatarName} and ${remoteAvatarName} ready!`,
      });
      
    } catch (error) {
      console.error('Error loading dual VRM models:', error);
      toast({
        title: "Error",
        description: "Failed to load avatar models - using fallback",
        variant: "destructive",
      });
      
      // Fallback: Load single avatar if dual loading fails
      try {
        const fallbackLoader = new GLTFLoader();
        fallbackLoader.register((parser) => new VRMLoaderPlugin(parser));
        
        const fallbackGltf = await fallbackLoader.loadAsync(localModelUrl);
        const fallbackVrm = fallbackGltf.userData.vrm;
        
        scene.add(fallbackVrm.scene);
        fallbackVrm.scene.position.set(0, 0, 0);
        fallbackVrm.scene.rotation.y = Math.PI; // Face forward (toward camera) - rotated 180 degrees
        currentVrm.current = fallbackVrm;
        
        // Reset fallback VRM to proper standing pose (fixes T-pose issue)
        resetVRMToStandingPose(fallbackVrm, instanceId);
        
        if (fallbackVrm.lookAt) {
          fallbackVrm.lookAt.target = new THREE.Object3D();
          fallbackVrm.scene.add(fallbackVrm.lookAt.target);
        }
        
        console.log('Fallback single avatar loaded');
      } catch (fallbackError) {
        console.error('Fallback avatar loading also failed:', fallbackError);
      }
    }
  };

  // Optimized VRM model loading with caching for instant switching
  const loadVRMModel = async (modelUrl: string, scene: THREE.Scene) => {
    try {
      // Check if model is already cached
      if (loadedModels.current.has(modelUrl)) {
        const cachedVrm = loadedModels.current.get(modelUrl)!;
        
        // Remove current model
        if (currentVrm.current) {
          scene.remove(currentVrm.current.scene);
        }
        
        // Add cached model instantly
        scene.add(cachedVrm.scene);
        cachedVrm.scene.userData.modelUrl = modelUrl; // Store model URL for comparison
        currentVrm.current = cachedVrm;
        
        // Immediately reset position to prevent slow upward movement
        // For local avatar, maintain side-by-side positioning
        if (isDualAvatar) {
          cachedVrm.scene.position.set(-0.6, 0, 0); // Local avatar position (left side)
        } else {
          cachedVrm.scene.position.set(0, 0, 0); // Single avatar centered
        }
        cachedVrm.scene.rotation.y = Math.PI; // Face forward
        cachedVrm.scene.scale.setScalar(1.0); // Ensure proper scale
        
        // Immediately reset pose to prevent slow interpolation
        resetVRMToStandingPose(cachedVrm, instanceId);
        
      // Load background and bench for cached model too
      // await loadBenchModel(scene); // BENCH REMOVED
        
        const modelName = AVAILABLE_MODELS.find(m => m.url === modelUrl)?.name || 'Custom Model';
        toast({
          title: "Model Switched",
          description: `${modelName} loaded instantly!`,
        });
        return;
      }

      // Load new model
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      
      const gltf = await loader.loadAsync(modelUrl);
      const vrm = gltf.userData.vrm;
      
      if (currentVrm.current) {
        scene.remove(currentVrm.current.scene);
      }
      
      scene.add(vrm.scene);
      // For local avatar, maintain side-by-side positioning
      if (isDualAvatar) {
        vrm.scene.position.set(-0.6, 0, 0); // Local avatar position (left side)
      } else {
        vrm.scene.position.set(0, 0, 0); // Single avatar centered
      }
      vrm.scene.rotation.y = Math.PI; // Face forward (toward camera) - rotated 180 degrees
      vrm.scene.scale.setScalar(1.0); // Ensure proper scale immediately
      vrm.scene.userData.modelUrl = modelUrl; // Store model URL for comparison
      currentVrm.current = vrm;
      
      // Reset VRM to proper standing pose (fixes T-pose issue)
      resetVRMToStandingPose(vrm, instanceId);
      
      // Force immediate pose reset to prevent slow interpolation
      if (vrm.humanoid) {
        const bones: (keyof VRMHumanoid["humanBones"])[] = [
          'hips', 'spine', 'chest', 'neck', 'head',
          'leftUpperArm', 'leftLowerArm', 'leftHand',
          'rightUpperArm', 'rightLowerArm', 'rightHand',
          'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
          'rightUpperLeg', 'rightLowerLeg', 'rightFoot'
        ];
        
        bones.forEach(boneName => {
          const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
          if (bone) {
            bone.quaternion.set(0, 0, 0, 1); // Immediate reset, no lerp
            bone.position.set(0, 0, 0);
          }
        });
        console.log(`[${instanceId}] 🚀 Immediate pose reset applied (no lerp)`);
      }
      
      // Debug: Check if VRM is actually visible
      console.log(`[${instanceId}] VRM added to scene, children count:`, scene.children.length);
      console.log(`[${instanceId}] VRM scene position:`, vrm.scene.position);
      console.log(`[${instanceId}] VRM scene scale:`, vrm.scene.scale);
      console.log(`[${instanceId}] VRM scene visible:`, vrm.scene.visible);
      console.log(`[${instanceId}] VRM humanoid exists:`, !!vrm.humanoid);
      console.log(`[${instanceId}] VRM expressionManager exists:`, !!vrm.expressionManager);
      
      // Debug: Check VRM bone structure
      if (vrm.humanoid?.normalizedHumanBones) {
        console.log(`[${instanceId}] 🦴 Available VRM bones:`, Object.keys(vrm.humanoid.normalizedHumanBones));
        console.log(`[${instanceId}] 🦴 Left upper arm bone:`, vrm.humanoid.normalizedHumanBones.leftUpperArm?.name);
        console.log(`[${instanceId}] 🦴 Left lower arm bone:`, vrm.humanoid.normalizedHumanBones.leftLowerArm?.name);
        console.log(`[${instanceId}] 🦴 Right upper arm bone:`, vrm.humanoid.normalizedHumanBones.rightUpperArm?.name);
        console.log(`[${instanceId}] 🦴 Right lower arm bone:`, vrm.humanoid.normalizedHumanBones.rightLowerArm?.name);
        console.log(`[${instanceId}] 🦴 Spine bone:`, vrm.humanoid.normalizedHumanBones.spine?.name);
      }
      
      // Debug: Check VRM model info
      console.log(`[${instanceId}] 📊 VRM model info:`, {
        name: vrm.meta?.title || 'Unknown',
        version: vrm.meta?.version || 'Unknown',
        author: vrm.meta?.author || 'Unknown',
        url: modelUrl
      });
      
      // Ensure VRM is visible and properly scaled
      vrm.scene.visible = true;
      vrm.scene.scale.setScalar(1.0); // Ensure proper scale
      
      if (vrm.lookAt) {
        vrm.lookAt.target = new THREE.Object3D();
        vrm.scene.add(vrm.lookAt.target);
      }
      
      // Load background and bench for single avatar mode too
      // await loadBenchModel(scene); // BENCH REMOVED
      
      // Cache the model for instant future switching
      loadedModels.current.set(modelUrl, vrm);
      
      // Debug logging
      console.log(`[${instanceId}] Single avatar position:`, vrm.scene.position);
      console.log(`[${instanceId}] Single avatar scale:`, vrm.scene.scale);
      console.log(`[${instanceId}] Single avatar visible:`, vrm.scene.visible);
      console.log(`[${instanceId}] Single avatar bounding box:`, vrm.scene.geometry?.boundingBox || 'No geometry');
      
      const modelName = AVAILABLE_MODELS.find(m => m.url === modelUrl)?.name || 'Custom Model';
      toast({
        title: "Model Loaded",
        description: `${modelName} is ready!`,
      });
    } catch (error) {
      console.error('Error loading VRM model:', error);
      toast({
        title: "Load Error",
        description: "Failed to load the VRM model. Please check the file and try again.",
        variant: "destructive",
      });
    }
  };

  // Animate Face Helper Function - enhanced for accurate eye tracking and smooth neck movement
  const rigFace = (vrm: VRM, riggedFace: any) => {
      if (!vrm.expressionManager || !vrm.lookAt || !vrm.humanoid) return;

      // Enhanced neck movement with better responsiveness and smoothness
      const neckDampener = 0.5; // Increased sensitivity for better neck tracking
      const neckLerpSpeed = 0.7; // Faster response for neck movement
      
      // Apply neck rotation with improved smoothness
      rigRotation(vrm, "neck", {
        x: riggedFace.head.x * neckDampener,
        y: riggedFace.head.y * neckDampener,
        z: riggedFace.head.z * neckDampener
      }, 1, neckLerpSpeed);

      const expressionManager = vrm.expressionManager;

      // Enhanced eye blinking with better detection
      const stabilizedBlink = Kalidokit.Face.stabilizeBlink(
          { l: 1 - riggedFace.eye.l, r: 1 - riggedFace.eye.r },
          riggedFace.head.y
      );
      // More responsive blink detection
      const currentBlink = expressionManager.getValue("blink") || 0;
      expressionManager.setValue("blink", Kalidokit.Vector.lerp(currentBlink, stabilizedBlink.l, 0.6));

      // Enhanced mouth movements with maximum lip tracking sensitivity
      const mouthLerpVal = 0.9; // Maximum speed for immediate mouth response
      const mouthSensitivity = 4.0; // Maximum sensitivity for lip detection
      
      // Get current mouth expression values
      const currentI = expressionManager.getValue("i") || 0;
      const currentA = expressionManager.getValue("a") || 0;
      const currentE = expressionManager.getValue("e") || 0;
      const currentO = expressionManager.getValue("o") || 0;
      const currentU = expressionManager.getValue("u") || 0;
      const currentHappy = expressionManager.getValue("happy") || 0;
      const currentAngry = expressionManager.getValue("angry") || 0;
      const currentSurprised = expressionManager.getValue("surprised") || 0;
      const currentSad = expressionManager.getValue("sad") || 0;
      const currentFearful = expressionManager.getValue("fearful") || 0;
      const currentDisgusted = expressionManager.getValue("disgusted") || 0;
      const currentRelaxed = expressionManager.getValue("relaxed") || 0;
      
      // Apply maximum sensitivity mouth tracking - clamp values to prevent overflow
      const clampedI = Math.min(riggedFace.mouth.shape.I * mouthSensitivity, 1.0);
      const clampedA = Math.min(riggedFace.mouth.shape.A * mouthSensitivity, 1.0);
      const clampedE = Math.min(riggedFace.mouth.shape.E * mouthSensitivity, 1.0);
      const clampedO = Math.min(riggedFace.mouth.shape.O * mouthSensitivity, 1.0);
      const clampedU = Math.min(riggedFace.mouth.shape.U * mouthSensitivity, 1.0);
      
      expressionManager.setValue("i", Kalidokit.Vector.lerp(currentI, clampedI, mouthLerpVal));
      expressionManager.setValue("a", Kalidokit.Vector.lerp(currentA, clampedA, mouthLerpVal));
      expressionManager.setValue("e", Kalidokit.Vector.lerp(currentE, clampedE, mouthLerpVal));
      expressionManager.setValue("o", Kalidokit.Vector.lerp(currentO, clampedO, mouthLerpVal));
      expressionManager.setValue("u", Kalidokit.Vector.lerp(currentU, clampedU, mouthLerpVal));
      
      // Enhanced smile tracking - detect any smile movement
      const smileIntensity = Math.min(riggedFace.mouth.shape.I * 3.0, 1.0); // Maximum smile detection
      expressionManager.setValue("happy", Kalidokit.Vector.lerp(currentHappy, smileIntensity, mouthLerpVal));
      
      // Enhanced pout/sad tracking - detect any U shape
      const poutIntensity = Math.min(riggedFace.mouth.shape.U * 3.0, 1.0); // Maximum pout detection
      expressionManager.setValue("angry", Kalidokit.Vector.lerp(currentAngry, poutIntensity, mouthLerpVal));
      
      // Enhanced sad tracking - detect downturned mouth corners (U shape + head tilt)
      const sadIntensity = Math.min(riggedFace.mouth.shape.U * 2.0 + Math.abs(riggedFace.head.y) * 0.5, 1.0);
      expressionManager.setValue("sad", Kalidokit.Vector.lerp(currentSad, sadIntensity, mouthLerpVal));
      
      // Enhanced fearful tracking - detect wide eyes + small mouth
      const fearfulIntensity = Math.min(
        (riggedFace.mouth.shape.A * 0.5) + (riggedFace.eye.l + riggedFace.eye.r) * 0.3, 
        1.0
      );
      expressionManager.setValue("fearful", Kalidokit.Vector.lerp(currentFearful, fearfulIntensity, mouthLerpVal));
      
      // Enhanced disgusted tracking - detect wrinkled nose + downturned mouth
      const disgustedIntensity = Math.min(
        riggedFace.mouth.shape.O * 1.5 + Math.abs(riggedFace.head.x) * 0.3,
        1.0
      );
      expressionManager.setValue("disgusted", Kalidokit.Vector.lerp(currentDisgusted, disgustedIntensity, mouthLerpVal));
      
      // Enhanced relaxed tracking - detect neutral mouth + calm eyes
      const relaxedIntensity = Math.min(
        (1.0 - Math.abs(riggedFace.mouth.shape.I)) * (1.0 - Math.abs(riggedFace.mouth.shape.A)) * 
        (1.0 - Math.abs(riggedFace.mouth.shape.E)) * (1.0 - Math.abs(riggedFace.mouth.shape.O)) * 
        (1.0 - Math.abs(riggedFace.mouth.shape.U)) * 0.8,
        1.0
      );
      expressionManager.setValue("relaxed", Kalidokit.Vector.lerp(currentRelaxed, relaxedIntensity, mouthLerpVal));
      
      // Eye reactions to mouth expressions
      const currentBlinkValue = expressionManager.getValue("blink") || 0;
      
      // Eyes react to big smile - slightly squint
      if (smileIntensity > 0.3) {
        const squintIntensity = Math.min(smileIntensity * 0.3, 0.4);
        expressionManager.setValue("blink", Math.max(currentBlinkValue, squintIntensity));
      }
      
      // Eyes react to sad - droopy eyes
      if (sadIntensity > 0.3) {
        const droopyEyes = Math.min(sadIntensity * 0.4, 0.5);
        expressionManager.setValue("blink", Math.max(currentBlinkValue, droopyEyes));
      }
      
      // Eyes react to pout - slight frown/squint
      if (poutIntensity > 0.3) {
        const frownSquint = Math.min(poutIntensity * 0.2, 0.3);
        expressionManager.setValue("blink", Math.max(currentBlinkValue, frownSquint));
      }
      
      // Eyes react to fearful - wide open eyes
      if (fearfulIntensity > 0.3) {
        const wideEyes = Math.min(fearfulIntensity * 0.5, 0.4);
        expressionManager.setValue("blink", Math.min(currentBlinkValue, -wideEyes));
      }
      
      // Eyes react to disgusted - squinted eyes
      if (disgustedIntensity > 0.3) {
        const squintedEyes = Math.min(disgustedIntensity * 0.3, 0.4);
        expressionManager.setValue("blink", Math.max(currentBlinkValue, squintedEyes));
      }
      
      // Eyes react to relaxed - calm, slightly closed eyes
      if (relaxedIntensity > 0.5) {
        const calmEyes = Math.min(relaxedIntensity * 0.2, 0.3);
        expressionManager.setValue("blink", Math.max(currentBlinkValue, calmEyes));
      }

      // Enhanced pupil tracking for maximum eye movement responsiveness
      const eyeLerpSpeed = 0.6; // Smooth response for eye movement
      
      // Calculate eye movement with maximum sensitivity
      const eyeX = riggedFace.pupil.x * 3.5; // Much higher sensitivity for horizontal movement
      const eyeY = riggedFace.pupil.y * 3.5; // Much higher sensitivity for vertical movement
      
      // Apply minimal smoothing for maximum responsiveness
      let lookTarget = new THREE.Euler(
          Kalidokit.Vector.lerp(oldLookTarget.current.x, eyeY, eyeLerpSpeed), // Vertical eye movement
          Kalidokit.Vector.lerp(oldLookTarget.current.y, eyeX, eyeLerpSpeed), // Horizontal eye movement
          0,
          "XYZ"
      );
      
      // Clamp eye movement to prevent extreme positions but allow more range
      lookTarget.x = Math.max(-0.8, Math.min(0.8, lookTarget.x));
      lookTarget.y = Math.max(-0.8, Math.min(0.8, lookTarget.y));
      
      oldLookTarget.current.copy(lookTarget);
      
      // Enhanced eye target positioning for maximum accuracy
      if (vrm.lookAt.target) {
        // Maximum range for very noticeable eye movement
        const eyeRange = 4.0; // Much increased range for very noticeable eye movement
        const eyeDistance = -3; // Closer distance for better tracking
        
        vrm.lookAt.target.position.set(
          Math.sin(lookTarget.y) * eyeRange, // Horizontal eye movement
          -Math.sin(lookTarget.x) * eyeRange, // Vertical eye movement (inverted)
          eyeDistance
        );
      }
  };

  // Optimized greeting animation
  const performGreeting = (vrm: VRM) => {
    if (!vrm.humanoid || isWaving) return;
    
    setIsWaving(true);
    const startTime = Date.now();
    const duration = 2000;
    
    const greetingAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress >= 1) {
        setIsWaving(false);
        animationManager.current.cancelAnimation(waveAnimationRef);
        return;
      }
      
      // Simplified greeting phases
      if (progress < 0.2) {
        // Lift arm
        const liftProgress = progress / 0.2;
        rigRotation(vrm, "rightUpperArm", {
          x: liftProgress * -0.2,
          y: liftProgress * 0.4,
          z: liftProgress * 0.8
        }, 1, 0.7);
        
        rigRotation(vrm, "rightLowerArm", {
          x: liftProgress * 1.0,
          y: liftProgress * 0.4,
          z: 0.4
        }, 1, 0.7);
        
        if (vrm.expressionManager) {
          vrm.expressionManager.setValue("happy", liftProgress * 0.8);
        }
        
      } else if (progress < 0.8) {
        // Wave motion
        const waveProgress = (progress - 0.2) / 0.6;
        const waveIntensity = Math.sin(waveProgress * 3 * Math.PI * 2) * (1 - waveProgress * 0.3);
        
        rigRotation(vrm, "rightUpperArm", { x: -0.2, y: 0.4, z: 0.1 }, 1, 0.7);
        rigRotation(vrm, "rightLowerArm", {
          x: 4.0,
          y: 3.4 + waveIntensity * 0.4,
          z: 0.4
        }, 0.5, 0.7);
        
        if (vrm.expressionManager) {
          vrm.expressionManager.setValue("happy", 0.8);
        }
        
      } else {
        // Return to rest
        const returnProgress = (progress - 0.8) / 0.2;
        rigRotation(vrm, "rightUpperArm", {
          x: -0.2 + returnProgress * 0.2,
          y: 0.4 - returnProgress * 0.4,
          z: 0.4 - returnProgress * 0.1
        }, 1, 0.7);
        
        rigRotation(vrm, "rightLowerArm", {
          x: 4.0 + returnProgress * 0.5,
          y: 2.4 + returnProgress * 0.7,
          z: 0.4
        }, 0.5, 0.7);
        
        if (vrm.expressionManager) {
          vrm.expressionManager.setValue("happy", 0.8 * (1 - returnProgress));
        }
      }
      
      animationManager.current.startAnimation(waveAnimationRef, greetingAnimation);
    };
    
    animationManager.current.startAnimation(waveAnimationRef, greetingAnimation);
  };

  // Big enthusiastic wave animation (both arms) - natural and energetic
  const performBigWave = (vrm: VRM) => {
    if (!vrm.humanoid || isBigWave) return;
    
    setIsBigWave(true);
    const startTime = Date.now();
    const duration = 3000; // 3 seconds for full enthusiasm
    
    const bigWaveAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress >= 1) {
        setIsBigWave(false);
        animationManager.current.cancelAnimation(bigWaveAnimationRef);
        return;
      }
      
      // Big wave phases with natural movement
      if (progress < 0.25) {
        // Phase 1: Lift both arms high with excitement
        const liftProgress = progress / 0.25;
        const easeOut = 1 - Math.pow(1 - liftProgress, 3); // Ease out cubic
        
        // Right arm: lift high and wide with natural arc
        rigRotation(vrm, "rightUpperArm", {
          x: easeOut * -1.2, // Lift up much higher
          y: easeOut * 0.0,  // No forward movement - straight up
          z: easeOut * 0.4   // More outward rotation
        }, -1, 1);
        
        rigRotation(vrm, "rightLowerArm", {
          x: easeOut * -0.8, // Less elbow bend to keep arm straighter
          y: easeOut * 0.0,  // No forward rotation
          z: easeOut * 0.4   // More outward rotation
        }, 0, 0.6);
        
        // Left arm: lift high and wide (mirror with slight variation)
        rigRotation(vrm, "leftUpperArm", {
          x: easeOut * -1.2, // Lift up much higher
          y: easeOut * 0.0, // No forward movement - straight up
          z: easeOut * -0.4  // More outward rotation opposite
        }, -1, 1);
        
        rigRotation(vrm, "leftLowerArm", {
          x: easeOut * -0.8, // Less elbow bend to keep arm straighter
          y: easeOut * 0,  // No forward rotation opposite
          z: easeOut * -0.4  // More outward rotation opposite
        }, 0, 0.6);
        
        // Start big smile with excitement
        if (vrm.expressionManager) {
          vrm.expressionManager?.setValue("happy", easeOut * 0.9);
          vrm.expressionManager?.setValue("surprised", easeOut * 0.3);
        }
        
      } else if (progress < 0.75) {
        // Phase 2: Big enthusiastic waving motion with natural rhythm
        const waveProgress = (progress - 0.25) / 0.5;
        const waveIntensity = Math.sin(waveProgress * 4 * Math.PI) * (1 - waveProgress * 0.2);
        const waveIntensity2 = Math.sin(waveProgress * 4 * Math.PI + Math.PI * 0.3) * (1 - waveProgress * 0.2);
        
        // Right arm: maintain high position with energetic wave
        rigRotation(vrm, "rightUpperArm", {
          x: -1.2 + Math.sin(waveProgress * 2 * Math.PI) * 0.1, // Slight bounce
          y: 0.0,
          z: 0.4
        }, -1, 0.6);
        
        rigRotation(vrm, "rightLowerArm", {
          x: -0.8,
          y: 0.0 + waveIntensity * 0.4, // Energetic wave motion
          z: 0.4 + Math.sin(waveProgress * 3 * Math.PI) * 0.1 // Slight side motion
        }, -2, 0.6);
        
        // Left arm: maintain high position with energetic wave (slightly offset)
        rigRotation(vrm, "leftUpperArm", {
          x: -1.2 + Math.sin(waveProgress * 2 * Math.PI + Math.PI) * 0.1, // Slight bounce opposite
          y: 0.0,
          z: -0.4
        }, -1, 0.6);
        
        rigRotation(vrm, "leftLowerArm", {
          x: -0.8,
          y: 0.0 + waveIntensity2 * 0.4, // Energetic wave motion (offset)
          z: -0.4 + Math.sin(waveProgress * 3 * Math.PI + Math.PI) * 0.1 // Slight side motion opposite
        }, -2, 1);
        
        // Maintain big smile with occasional excitement
        if (vrm.expressionManager) {
          vrm.expressionManager?.setValue("happy", 0.9);
          vrm.expressionManager?.setValue("surprised", 0.2 + Math.sin(waveProgress * 6 * Math.PI) * 0.1);
        }
        
      } else {
        // Phase 3: Return to rest with natural easing
        const returnProgress = (progress - 0.75) / 0.25;
        const easeIn = Math.pow(returnProgress, 2); // Ease in quadratic
        
        // Return right arm to rest smoothly
        rigRotation(vrm, "rightUpperArm", {
          x: -1.2 + easeIn * 1.2,
          y: 0.0 - easeIn * 0.0,
          z: 0.4 - easeIn * 0.4
        }, 1, 0.6);
        
        rigRotation(vrm, "rightLowerArm", {
          x: -0.8 + easeIn * 0.8,
          y: 0.0 - easeIn * 0.0,
          z: 0.4 - easeIn * 0.4
        }, 1, 0.6);
        
        // Return left arm to rest smoothly
        rigRotation(vrm, "leftUpperArm", {
          x: -1.2 + easeIn * 1.2,
          y: 0.0 + easeIn * 0.0,
          z: -0.4 + easeIn * 0.4
        }, 1, 0.6);
        
        rigRotation(vrm, "leftLowerArm", {
          x: -0.8 + easeIn * 0.8,
          y: 0.0 + easeIn * 0.0,
          z: -0.4 + easeIn * 0.4
        }, 1, 0.6);
        
        // Fade expressions smoothly
        if (vrm.expressionManager) {
          vrm.expressionManager?.setValue("happy", 0.9 * (1 - easeIn));
          vrm.expressionManager?.setValue("surprised", 0.2 * (1 - easeIn));
        }
      }
      
      animationManager.current.startAnimation(bigWaveAnimationRef, bigWaveAnimation);
    };
    
    animationManager.current.startAnimation(bigWaveAnimationRef, bigWaveAnimation);
  };


  // Bow/nod gesture animation - simple traditional bow with hands together
  const performBow = (vrm: VRM) => {
    if (!vrm.humanoid || isBowing) return;
    
    setIsBowing(true);
    const startTime = Date.now();
    const duration = 2500; // 2.5 seconds for respectful bow
    
    const bowAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress >= 1) {
        setIsBowing(false);
        if (bowAnimationRef.current) {
          cancelAnimationFrame(bowAnimationRef.current);
          bowAnimationRef.current = null;
        }
        return;
      }
      
      // Simple bow phases
      if (progress < 0.4) {
        // Phase 1: Bow forward
        const bowProgress = progress / 0.4;
        
        // Head: nod forward
        rigRotation(vrm, "neck", {
          x: bowProgress * -0.6, // Head nods forward
          y: 0,
          z: 0
        }, 1, 0.8);
        
        // Spine: torso leans forward
        rigRotation(vrm, "spine", {
          x: bowProgress * -0.3, // Spine bends forward
          y: 0,
          z: 0
        }, 1, 0.8);
        
        // Arms: simple hands together position
        rigRotation(vrm, "rightUpperArm", {
          x: bowProgress * 0, // Slight forward
          y: bowProgress * 0.4, // Bring inward
          z: bowProgress * 0.3   // Slight outward
        }, 0, 0.6);
        
        rigRotation(vrm, "leftUpperArm", {
          x: bowProgress * 0, // Slight forward
          y: bowProgress * 0.4, // Bring inward
          z: bowProgress * 0.3 // Slight outward
        }, 0, 0.6);
        
        // Lower arms: hands together
        rigRotation(vrm, "rightLowerArm", {
          x: bowProgress * -0.5, // Bend elbow
          y: bowProgress * -0.3, // Move toward center
          z: 0
        }, 1, 0.6);
        
        rigRotation(vrm, "leftLowerArm", {
          x: bowProgress * -0.5, // Bend elbow
          y: bowProgress * 0.3, // Move toward center
          z: 0
        }, 1, 0.6);
        
        // Close eyes and neutral expression
        if (vrm.expressionManager) {
          vrm.expressionManager?.setValue("blink", bowProgress * 1.0);
          vrm.expressionManager?.setValue("happy", 0);
        }
        
      } else if (progress < 0.7) {
        // Phase 2: Hold bow
        // Maintain positions
        rigRotation(vrm, "neck", { x: -0.6, y: 0, z: 0 }, 1, 0.8);
        rigRotation(vrm, "spine", { x: -0.3, y: 0, z: 0 }, 1, 0.8);
        rigRotation(vrm, "rightUpperArm", { x: -0.1, y: -0.8, z: 0.2 }, 1, 0.6);
        rigRotation(vrm, "leftUpperArm", { x: -0.1, y: 0.8, z: -0.2 }, 1, 0.6);
        rigRotation(vrm, "rightLowerArm", { x: -0.5, y: -0.3, z: 0 }, 1, 0.6);
        rigRotation(vrm, "leftLowerArm", { x: -0.5, y: 0.3, z: 0 }, 1, 0.6);
        
        if (vrm.expressionManager) {
          vrm.expressionManager?.setValue("blink", 1.0);
          vrm.expressionManager?.setValue("happy", 0);
        }
        
      } else {
        // Phase 3: Return to rest
        const returnProgress = (progress - 0.7) / 0.3;
        
        // Return to neutral
        rigRotation(vrm, "neck", {
          x: -0.6 + returnProgress * 0.6,
          y: 0,
          z: 0
        }, 1, 0.8);
        
        rigRotation(vrm, "spine", {
          x: -0.3 + returnProgress * 0.3,
          y: 0,
          z: 0
        }, 1, 0.8);
        
        rigRotation(vrm, "rightUpperArm", {
          x: -0.1 + returnProgress * 0.1,
          y: -0.8 + returnProgress * 0.8,
          z: 0.2 - returnProgress * 0.2
        }, 1, 0.6);
        
        rigRotation(vrm, "leftUpperArm", {
          x: -0.1 + returnProgress * 0.1,
          y: 0.8 - returnProgress * 0.8,
          z: -0.2 + returnProgress * 0.2
        }, 1, 0.6);
        
        rigRotation(vrm, "rightLowerArm", {
          x: -0.5 + returnProgress * 0.5,
          y: -0.3 + returnProgress * 0.3,
          z: 0
        }, 1, 0.6);
        
        rigRotation(vrm, "leftLowerArm", {
          x: -0.5 + returnProgress * 0.5,
          y: 0.3 - returnProgress * 0.3,
          z: 0
        }, 1, 0.6);
        
        // Open eyes
        if (vrm.expressionManager) {
          vrm.expressionManager?.setValue("blink", 1.0 - returnProgress);
          vrm.expressionManager?.setValue("happy", 0);
        }
      }
      
      bowAnimationRef.current = requestAnimationFrame(bowAnimation);
    };
    
    bowAnimationRef.current = requestAnimationFrame(bowAnimation);
  };

  // Wink animation - single eye blink with timing
  const performWink = (vrm: VRM) => {
    if (!vrm.humanoid || !vrm.expressionManager || isWinking) return;
    
    setIsWinking(true);
    const startTime = Date.now();
    const duration = 800; // Quick wink animation
    
    const winkAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress >= 1) {
        setIsWinking(false);
        if (winkAnimationRef.current) {
          cancelAnimationFrame(winkAnimationRef.current);
          winkAnimationRef.current = null;
        }
        return;
      }
      
      // Wink phases
      if (progress < 0.3) {
        // Phase 1: Close right eye (wink)
        const winkProgress = progress / 0.3;
        const winkIntensity = Math.sin(winkProgress * Math.PI);
        
        // Use individual eye controls for proper wink
        // Close only the right eye while keeping left eye open
        vrm.expressionManager?.setValue("blinkLeft", 0); // Keep left eye open
        vrm.expressionManager?.setValue("blinkRight", winkIntensity * 0.9); // Close right eye
        
        // Slight head tilt for more natural wink
        rigRotation(vrm, "neck", {
          x: winkProgress * 0.1,
          y: winkProgress * 0.05,
          z: 0
        }, 1, 0.5);
        
      } else if (progress < 0.7) {
        // Phase 2: Hold wink briefly
        vrm.expressionManager?.setValue("blinkLeft", 0); // Keep left eye open
        vrm.expressionManager?.setValue("blinkRight", 0.9); // Keep right eye closed
        
        // Maintain slight head tilt
        rigRotation(vrm, "neck", {
          x: 0.1,
          y: 0.05,
          z: 0
        }, 1, 0.5);
        
      } else {
        // Phase 3: Open eye and return to normal
        const returnProgress = (progress - 0.7) / 0.3;
        
        // Open right eye completely
        vrm.expressionManager?.setValue("blinkLeft", 0); // Keep left eye open
        vrm.expressionManager?.setValue("blinkRight", 0); // Fully open right eye
        
        // Return head to normal
        rigRotation(vrm, "neck", {
          x: 0.1 * (1 - returnProgress),
          y: 0.05 * (1 - returnProgress),
          z: 0
        }, 1, 0.5);
      }
      
      winkAnimationRef.current = requestAnimationFrame(winkAnimation);
    };
    
    winkAnimationRef.current = requestAnimationFrame(winkAnimation);
  };

  // Surprised face animation - wide eyes and open mouth
  const performSurprised = (vrm: VRM) => {
    if (!vrm.humanoid || !vrm.expressionManager || isSurprised) return;
    
    setIsSurprised(true);
    const startTime = Date.now();
    const duration = 2000; // 2 seconds for surprised expression
    
    const surprisedAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress >= 1) {
        setIsSurprised(false);
        if (surprisedAnimationRef.current) {
          cancelAnimationFrame(surprisedAnimationRef.current);
          surprisedAnimationRef.current = null;
        }
        return;
      }
      
      // Surprised phases
      if (progress < 0.2) {
        // Phase 1: Build surprise expression
        const surpriseProgress = progress / 0.2;
        
        // Wide eyes (negative blink value)
        vrm.expressionManager?.setValue("blink", -surpriseProgress * 0.3);
        
        // Open mouth wide (use 'a' expression)
        vrm.expressionManager?.setValue("a", surpriseProgress * 0.8);
        
        // Slight backward head movement
        rigRotation(vrm, "neck", {
          x: surpriseProgress * 0.2,
          y: 0,
          z: 0
        }, 1, 0.6);
        
        // Slight eyebrow raise (use surprised expression if available)
        vrm.expressionManager?.setValue("surprised", surpriseProgress * 0.9);
        
      } else if (progress < 0.8) {
        // Phase 2: Hold surprised expression
        vrm.expressionManager?.setValue("blink", -0.3);
        vrm.expressionManager?.setValue("a", 0.8);
        vrm.expressionManager?.setValue("surprised", 0.9);
        
        // Maintain head position
        rigRotation(vrm, "neck", {
          x: 0.2,
          y: 0,
          z: 0
        }, 1, 0.6);
        
      } else {
        // Phase 3: Return to normal
        const returnProgress = (progress - 0.8) / 0.2;
        
        // Fade expressions
        vrm.expressionManager?.setValue("blink", -0.3 * (1 - returnProgress));
        vrm.expressionManager?.setValue("a", 0.8 * (1 - returnProgress));
        vrm.expressionManager?.setValue("surprised", 0.9 * (1 - returnProgress));
        
        // Return head to normal
        rigRotation(vrm, "neck", {
          x: 0.2 * (1 - returnProgress),
          y: 0,
          z: 0
        }, 1, 0.6);
      }
      
      surprisedAnimationRef.current = requestAnimationFrame(surprisedAnimation);
    };
    
    surprisedAnimationRef.current = requestAnimationFrame(surprisedAnimation);
  };

  // Confused face animation - tilted head and puzzled expression
  const performConfused = (vrm: VRM) => {
    if (!vrm.humanoid || !vrm.expressionManager || isConfused) return;
    
    setIsConfused(true);
    const startTime = Date.now();
    const duration = 2500; // 2.5 seconds for confused expression
    
    const confusedAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress >= 1) {
        setIsConfused(false);
        if (confusedAnimationRef.current) {
          cancelAnimationFrame(confusedAnimationRef.current);
          confusedAnimationRef.current = null;
        }
        return;
      }
      
      // Confused phases
      if (progress < 0.3) {
        // Phase 1: Build confused expression
        const confusedProgress = progress / 0.3;
        
        // Slight frown (use 'u' expression)
        vrm.expressionManager?.setValue("u", confusedProgress * 0.4);
        
        // Tilt head to the side
        rigRotation(vrm, "neck", {
          x: 0,
          y: 0,
          z: confusedProgress * 0.3
        }, 1, 0.6);
        
        // Slight eyebrow furrow (use angry expression if available)
        vrm.expressionManager?.setValue("angry", confusedProgress * 0.3);
        
        // Slight mouth movement (confused 'o' shape)
        vrm.expressionManager?.setValue("o", confusedProgress * 0.3);
        
      } else if (progress < 0.7) {
        // Phase 2: Hold confused expression with slight movement
        const holdProgress = (progress - 0.3) / 0.4;
        const headBob = Math.sin(holdProgress * Math.PI * 4) * 0.05;
        
        vrm.expressionManager?.setValue("u", 0.4);
        vrm.expressionManager?.setValue("angry", 0.3);
        vrm.expressionManager?.setValue("o", 0.3);
        
        // Slight head bobbing
        rigRotation(vrm, "neck", {
          x: headBob,
          y: 0,
          z: 0.3
        }, 1, 0.6);
        
      } else {
        // Phase 3: Return to normal
        const returnProgress = (progress - 0.7) / 0.3;
        
        // Fade expressions
        vrm.expressionManager?.setValue("u", 0.4 * (1 - returnProgress));
        vrm.expressionManager?.setValue("angry", 0.3 * (1 - returnProgress));
        vrm.expressionManager?.setValue("o", 0.3 * (1 - returnProgress));
        
        // Return head to normal
        rigRotation(vrm, "neck", {
          x: 0,
          y: 0,
          z: 0.3 * (1 - returnProgress)
        }, 1, 0.6);
      }
      
      confusedAnimationRef.current = requestAnimationFrame(confusedAnimation);
    };
    
    confusedAnimationRef.current = requestAnimationFrame(confusedAnimation);
  };

  // Excited face animation - big smile with wide eyes
  const performExcited = (vrm: VRM) => {
    if (!vrm.humanoid || !vrm.expressionManager || isExcited) return;
    
    setIsExcited(true);
    const startTime = Date.now();
    const duration = 3000; // 3 seconds for excited expression
    
    const excitedAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress >= 1) {
        setIsExcited(false);
        if (excitedAnimationRef.current) {
          cancelAnimationFrame(excitedAnimationRef.current);
          excitedAnimationRef.current = null;
        }
        return;
      }
      
      // Excited phases
      if (progress < 0.25) {
        // Phase 1: Build excitement
        const excitedProgress = progress / 0.25;
        
        // Big smile
        vrm.expressionManager?.setValue("happy", excitedProgress * 1.0);
        
        // Wide eyes (negative blink)
        vrm.expressionManager?.setValue("blink", -excitedProgress * 0.2);
        
        // Open mouth for excitement (use 'a' expression)
        vrm.expressionManager?.setValue("a", excitedProgress * 0.6);
        
        // Slight head tilt up
        rigRotation(vrm, "neck", {
          x: excitedProgress * -0.1,
          y: 0,
          z: 0
        }, 1, 0.6);
        
      } else if (progress < 0.75) {
        // Phase 2: Hold excitement with energy
        const holdProgress = (progress - 0.25) / 0.5;
        const energyBounce = Math.sin(holdProgress * Math.PI * 6) * 0.05;
        
        // Maintain big smile
        vrm.expressionManager?.setValue("happy", 1.0);
        vrm.expressionManager?.setValue("blink", -0.2);
        vrm.expressionManager?.setValue("a", 0.6);
        
        // Energetic head movement
        rigRotation(vrm, "neck", {
          x: -0.1 + energyBounce,
          y: Math.sin(holdProgress * Math.PI * 4) * 0.03,
          z: 0
        }, 1, 0.6);
        
        // Add surprised expression for extra excitement
        vrm.expressionManager?.setValue("surprised", 0.3 + Math.sin(holdProgress * Math.PI * 8) * 0.1);
        
      } else {
        // Phase 3: Return to normal
        const returnProgress = (progress - 0.75) / 0.25;
        
        // Fade expressions
        vrm.expressionManager?.setValue("happy", 1.0 * (1 - returnProgress));
        vrm.expressionManager?.setValue("blink", -0.2 * (1 - returnProgress));
        vrm.expressionManager?.setValue("a", 0.6 * (1 - returnProgress));
        vrm.expressionManager?.setValue("surprised", 0.3 * (1 - returnProgress));
        
        // Return head to normal
        rigRotation(vrm, "neck", {
          x: -0.1 * (1 - returnProgress),
          y: 0,
          z: 0
        }, 1, 0.6);
      }
      
      excitedAnimationRef.current = requestAnimationFrame(excitedAnimation);
    };
    
    excitedAnimationRef.current = requestAnimationFrame(excitedAnimation);
  };

  // Head bob dance move - rhythmic head movement
  const performHeadBob = (vrm: VRM) => {
    if (!vrm.humanoid || isHeadBob) return;
    
    setIsHeadBob(true);
    const startTime = Date.now();
    const duration = 3000; // 3 seconds of head bobbing
    
    const headBobAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress >= 1) {
        setIsHeadBob(false);
        if (headBobAnimationRef.current) {
          cancelAnimationFrame(headBobAnimationRef.current);
          headBobAnimationRef.current = null;
        }
        return;
      }
      
      // Create rhythmic head bobbing motion
      const bobFrequency = 4; // 4 bobs per second
      const bobIntensity = 0.3;
      const bobOffset = Math.sin(elapsed * 0.01 * bobFrequency * Math.PI * 2) * bobIntensity;
      
      // Vertical head movement (bobbing up and down)
      rigRotation(vrm, "neck", {
        x: bobOffset,
        y: 0,
        z: 0
      }, 1, 0.8);
      
      // Slight side-to-side movement for more natural dance feel
      const sideBob = Math.sin(elapsed * 0.01 * bobFrequency * Math.PI * 2 + Math.PI * 0.5) * 0.1;
      rigRotation(vrm, "neck", {
        x: bobOffset,
        y: sideBob,
        z: 0
      }, 1, 0.8);
      
      // Add slight spine movement to enhance the dance
      rigRotation(vrm, "spine", {
        x: bobOffset * 0.3,
        y: 0,
        z: 0
      }, 1, 0.6);
      
      headBobAnimationRef.current = requestAnimationFrame(headBobAnimation);
    };
    
    headBobAnimationRef.current = requestAnimationFrame(headBobAnimation);
  };

  // Shoulder shimmy dance move - alternating shoulder movement
  const performShoulderShimmy = (vrm: VRM) => {
    if (!vrm.humanoid || isShoulderShimmy) return;
    
    setIsShoulderShimmy(true);
    const startTime = Date.now();
    const duration = 4000; // 4 seconds of shoulder shimmy
    
    const shoulderShimmyAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress >= 1) {
        setIsShoulderShimmy(false);
        if (shoulderShimmyAnimationRef.current) {
          cancelAnimationFrame(shoulderShimmyAnimationRef.current);
          shoulderShimmyAnimationRef.current = null;
        }
        return;
      }
      
      // Create alternating shoulder movement
      const shimmyFrequency = 6; // 6 shimmies per second
      const shimmyIntensity = 0.4;
      
      // Right shoulder movement
      const rightShoulderBob = Math.sin(elapsed * 0.01 * shimmyFrequency * Math.PI * 2) * shimmyIntensity;
      rigRotation(vrm, "rightUpperArm", {
        x: rightShoulderBob,
        y: 0,
        z: rightShoulderBob * 0.5
      }, 1, 0.7);
      
      // Left shoulder movement (offset by half cycle for alternating effect)
      const leftShoulderBob = Math.sin(elapsed * 0.01 * shimmyFrequency * Math.PI * 2 + Math.PI) * shimmyIntensity;
      rigRotation(vrm, "leftUpperArm", {
        x: leftShoulderBob,
        y: 0,
        z: leftShoulderBob * 0.5
      }, 1, 0.7);
      
      // Add chest movement to enhance the shimmy
      const chestBob = Math.sin(elapsed * 0.01 * shimmyFrequency * Math.PI * 2) * 0.2;
      rigRotation(vrm, "chest", {
        x: chestBob,
        y: 0,
        z: 0
      }, 1, 0.5);
      
      // Slight head movement to follow the shoulders
      const headFollow = Math.sin(elapsed * 0.01 * shimmyFrequency * Math.PI * 2) * 0.1;
      rigRotation(vrm, "neck", {
        x: headFollow,
        y: 0,
        z: 0
      }, 1, 0.6);
      
      shoulderShimmyAnimationRef.current = requestAnimationFrame(shoulderShimmyAnimation);
    };
    
    shoulderShimmyAnimationRef.current = requestAnimationFrame(shoulderShimmyAnimation);
  };

  // Hip sway dance move - rhythmic hip movement
  const performHipSway = (vrm: VRM) => {
    if (!vrm.humanoid || isHipSway) return;
    
    setIsHipSway(true);
    const startTime = Date.now();
    const duration = 3500; // 3.5 seconds of hip swaying
    
    const hipSwayAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress >= 1) {
        setIsHipSway(false);
        if (hipSwayAnimationRef.current) {
          cancelAnimationFrame(hipSwayAnimationRef.current);
          hipSwayAnimationRef.current = null;
        }
        return;
      }
      
      // Create subtle rhythmic hip swaying motion
      const swayFrequency = 2.5; // 2.5 sways per second (slower)
      const swayIntensity = 0.2; // Much more subtle intensity
      
      // Hip rotation (side to side swaying) - very subtle
      const hipRotation = Math.sin(elapsed * 0.01 * swayFrequency * Math.PI * 2) * swayIntensity;
      rigRotation(vrm, "hips", {
        x: 0,
        y: hipRotation,
        z: 0
      }, 1, 0.6);
      
      // No hip position movement - keep model stable
      
      // Minimal spine movement - just a tiny bit
      const spineFollow = Math.sin(elapsed * 0.01 * swayFrequency * Math.PI * 2) * 0.08;
      rigRotation(vrm, "spine", {
        x: 0,
        y: spineFollow,
        z: 0
      }, 1, 0.3);
      
      // No chest movement - keep upper body still
      // No head movement - keep head stable
      // No arm movement - keep arms natural
      
      hipSwayAnimationRef.current = requestAnimationFrame(hipSwayAnimation);
    };
    
    hipSwayAnimationRef.current = requestAnimationFrame(hipSwayAnimation);
  };

  // Sitting pose function - DISABLED
  // const performSitting = (vrm: VRM) => {
  //   if (!vrm.humanoid) return;
  //   
  //   // Sitting pose - adjust avatar position and pose for sitting on bench
  //   // Move avatar down to bench level
  //   vrm.scene.position.y = -0.3; // Lower position for sitting
  //   
  //   // Adjust leg positions for sitting
  //   rigRotation(vrm, "leftUpperLeg", {
  //     x: 0.8,  // Bend thigh forward
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   rigRotation(vrm, "leftLowerLeg", {
  //     x: 1.2,  // Bend knee
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   rigRotation(vrm, "rightUpperLeg", {
  //     x: 0.8,  // Bend thigh forward
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   rigRotation(vrm, "rightLowerLeg", {
  //     x: 1.2,  // Bend knee
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   // Adjust spine for sitting posture
  //   rigRotation(vrm, "spine", {
  //     x: 0.1,  // Slight forward lean
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   // Relaxed arm position
  //   rigRotation(vrm, "leftUpperArm", {
  //     x: -0.3,  // Relaxed arm position
  //     y: 0.0,
  //     z: 0.2
  //   }, 1, 0.8);
  //   
  //   rigRotation(vrm, "rightUpperArm", {
  //     x: -0.3,  // Relaxed arm position
  //     y: 0.0,
  //     z: -0.2
  //   }, 1, 0.8);
  //   
  //   console.log(`[${instanceId}] Applied sitting pose`);
  // };

  // Standing pose function - DISABLED
  // const performStanding = (vrm: VRM) => {
  //   if (!vrm.humanoid) return;
  //   
  //   // Reset to standing position
  //   vrm.scene.position.y = 0; // Normal standing height
  //   
  //   // Reset all rotations to default standing pose
  //   rigRotation(vrm, "leftUpperLeg", {
  //     x: 0.0,
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   rigRotation(vrm, "leftLowerLeg", {
  //     x: 0.0,
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   rigRotation(vrm, "rightUpperLeg", {
  //     x: 0.0,
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   rigRotation(vrm, "rightLowerLeg", {
  //     x: 0.0,
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   rigRotation(vrm, "spine", {
  //     x: 0.0,
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   rigRotation(vrm, "leftUpperArm", {
  //     x: 0.0,
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   rigRotation(vrm, "rightUpperArm", {
  //     x: 0.0,
  //     y: 0.0,
  //     z: 0.0
  //   }, 1, 0.8);
  //   
  //   console.log(`[${instanceId}] Applied standing pose`);
  // };

  // Helper functions for hand gesture recognition
  const calculateHandOpenness = (handLandmarks: any[]) => {
    if (!handLandmarks || handLandmarks.length < 21) return 0;
    
    // Calculate distance between fingertips and palm center
    const palmCenter = handLandmarks[9]; // Middle finger base
    const thumbTip = handLandmarks[4];
    const indexTip = handLandmarks[8];
    const middleTip = handLandmarks[12];
    const ringTip = handLandmarks[16];
    const pinkyTip = handLandmarks[20];
    
    const distances = [
      Math.sqrt(Math.pow(thumbTip.x - palmCenter.x, 2) + Math.pow(thumbTip.y - palmCenter.y, 2)),
      Math.sqrt(Math.pow(indexTip.x - palmCenter.x, 2) + Math.pow(indexTip.y - palmCenter.y, 2)),
      Math.sqrt(Math.pow(middleTip.x - palmCenter.x, 2) + Math.pow(middleTip.y - palmCenter.y, 2)),
      Math.sqrt(Math.pow(ringTip.x - palmCenter.x, 2) + Math.pow(ringTip.y - palmCenter.y, 2)),
      Math.sqrt(Math.pow(pinkyTip.x - palmCenter.x, 2) + Math.pow(pinkyTip.y - palmCenter.y, 2))
    ];
    
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    return Math.min(1, avgDistance * 10); // Normalize to 0-1
  };
  
  const calculateThumbsUp = (handLandmarks: any[]) => {
    if (!handLandmarks || handLandmarks.length < 21) return false;
    
    const thumbTip = handLandmarks[4];
    const thumbIP = handLandmarks[3];
    const thumbMCP = handLandmarks[2];
    const indexTip = handLandmarks[8];
    const indexPIP = handLandmarks[6];
    
    // Check if thumb is extended and other fingers are curled
    const thumbExtended = thumbTip.y < thumbIP.y && thumbIP.y < thumbMCP.y;
    const otherFingersCurled = indexTip.y > indexPIP.y;
    
    return thumbExtended && otherFingersCurled;
  };
  
  const calculatePointing = (handLandmarks: any[]) => {
    if (!handLandmarks || handLandmarks.length < 21) return false;
    
    const indexTip = handLandmarks[8];
    const indexPIP = handLandmarks[6];
    const middleTip = handLandmarks[12];
    const middlePIP = handLandmarks[10];
    const ringTip = handLandmarks[16];
    const ringPIP = handLandmarks[14];
    const pinkyTip = handLandmarks[20];
    const pinkyPIP = handLandmarks[18];
    
    // Check if index finger is extended and others are curled
    const indexExtended = indexTip.y < indexPIP.y;
    const othersCurled = middleTip.y > middlePIP.y && 
                        ringTip.y > ringPIP.y && 
                        pinkyTip.y > pinkyPIP.y;
    
    return indexExtended && othersCurled;
  };

  // Send avatar data to parent component
  // Arm movement change detection for compression
  const lastArmData = useRef({
    leftUpperArm: { x: 0, y: 0, z: 0 },
    leftLowerArm: { x: 0, y: 0, z: 0 },
    rightUpperArm: { x: 0, y: 0, z: 0 },
    rightLowerArm: { x: 0, y: 0, z: 0 }
  });

  const hasSignificantArmChange = useCallback((newArmData: any, threshold: number = 0.02) => {
    const changes = {
      leftUpperArm: Math.abs(newArmData.leftUpperArmX - lastArmData.current.leftUpperArm.x) > threshold ||
                   Math.abs(newArmData.leftUpperArmY - lastArmData.current.leftUpperArm.y) > threshold ||
                   Math.abs(newArmData.leftUpperArmZ - lastArmData.current.leftUpperArm.z) > threshold,
      leftLowerArm: Math.abs(newArmData.leftLowerArmX - lastArmData.current.leftLowerArm.x) > threshold ||
                   Math.abs(newArmData.leftLowerArmY - lastArmData.current.leftLowerArm.y) > threshold ||
                   Math.abs(newArmData.leftLowerArmZ - lastArmData.current.leftLowerArm.z) > threshold,
      rightUpperArm: Math.abs(newArmData.rightUpperArmX - lastArmData.current.rightUpperArm.x) > threshold ||
                    Math.abs(newArmData.rightUpperArmY - lastArmData.current.rightUpperArm.y) > threshold ||
                    Math.abs(newArmData.rightUpperArmZ - lastArmData.current.rightUpperArm.z) > threshold,
      rightLowerArm: Math.abs(newArmData.rightLowerArmX - lastArmData.current.rightLowerArm.x) > threshold ||
                    Math.abs(newArmData.rightLowerArmY - lastArmData.current.rightLowerArm.y) > threshold ||
                    Math.abs(newArmData.rightLowerArmZ - lastArmData.current.rightLowerArm.z) > threshold
    };
    
    return changes.leftUpperArm || changes.leftLowerArm || changes.rightUpperArm || changes.rightLowerArm;
  }, []);

  const sendAvatarData = useCallback((riggedFace: any, riggedPose: any, poseLandmarks?: any, leftHandLandmarks?: any, rightHandLandmarks?: any) => {
    console.log(`[${instanceId}] sendAvatarData called with:`, { 
      hasOnAvatarDataUpdate: !!onAvatarDataUpdate, 
      hasRiggedFace: !!riggedFace,
      hasRiggedPose: !!riggedPose,
      hasPoseLandmarks: !!poseLandmarks,
      hasLeftHand: !!leftHandLandmarks,
      hasRightHand: !!rightHandLandmarks
    });
    
    if (!onAvatarDataUpdate) {
      console.log(`[${instanceId}] ⚠️ Cannot send avatar data: no onAvatarDataUpdate callback`);
      return;
    }
    
    // Calculate facial expressions from riggedFace
    const facialExpressions = {
      blink: riggedFace?.eye?.l || 0,
      happy: Math.max(0, (riggedFace?.mouth?.shape?.A || 0) + (riggedFace?.mouth?.shape?.E || 0) * 0.5),
      angry: Math.max(0, (riggedFace?.mouth?.shape?.O || 0) * 0.3),
      surprised: Math.max(0, (riggedFace?.mouth?.shape?.U || 0) * 0.5),
      i: riggedFace?.mouth?.shape?.I || 0,
      a: riggedFace?.mouth?.shape?.A || 0,
      e: riggedFace?.mouth?.shape?.E || 0,
      o: riggedFace?.mouth?.shape?.O || 0,
      u: riggedFace?.mouth?.shape?.U || 0,
    };
    
    // Calculate head and eye movements
    const headMovement = {
      headX: riggedFace?.head?.x || 0,
      headY: riggedFace?.head?.y || 0,
      headZ: riggedFace?.head?.z || 0,
      eyeX: riggedFace?.pupil?.x || 0,
      eyeY: riggedFace?.pupil?.y || 0,
    };
    
    // Calculate pose data from pose landmarks and rigged pose
    const poseData = poseLandmarks ? {
      // Shoulder positions
      leftShoulderX: poseLandmarks[11]?.x || 0,
      leftShoulderY: poseLandmarks[11]?.y || 0,
      rightShoulderX: poseLandmarks[12]?.x || 0,
      rightShoulderY: poseLandmarks[12]?.y || 0,
      
      // Elbow positions
      leftElbowX: poseLandmarks[13]?.x || 0,
      leftElbowY: poseLandmarks[13]?.y || 0,
      rightElbowX: poseLandmarks[14]?.x || 0,
      rightElbowY: poseLandmarks[14]?.y || 0,
      
      // Wrist positions
      leftWristX: poseLandmarks[15]?.x || 0,
      leftWristY: poseLandmarks[15]?.y || 0,
      rightWristX: poseLandmarks[16]?.x || 0,
      rightWristY: poseLandmarks[16]?.y || 0,
      
      // Hip positions
      leftHipX: poseLandmarks[23]?.x || 0,
      leftHipY: poseLandmarks[23]?.y || 0,
      rightHipX: poseLandmarks[24]?.x || 0,
      rightHipY: poseLandmarks[24]?.y || 0,
      
      // Body rotation
      bodyRotationX: riggedPose?.spine?.x || 0,
      bodyRotationY: riggedPose?.spine?.y || 0,
      bodyRotationZ: riggedPose?.spine?.z || 0,
      
      // Full arm rotation data from Kalidokit
      leftUpperArmX: riggedPose?.LeftUpperArm?.x || 0,
      leftUpperArmY: riggedPose?.LeftUpperArm?.y || 0,
      leftUpperArmZ: riggedPose?.LeftUpperArm?.z || 0,
      leftLowerArmX: riggedPose?.LeftLowerArm?.x || 0,
      leftLowerArmY: riggedPose?.LeftLowerArm?.y || 0,
      leftLowerArmZ: riggedPose?.LeftLowerArm?.z || 0,
      rightUpperArmX: riggedPose?.RightUpperArm?.x || 0,
      rightUpperArmY: riggedPose?.RightUpperArm?.y || 0,
      rightUpperArmZ: riggedPose?.RightUpperArm?.z || 0,
      rightLowerArmX: riggedPose?.RightLowerArm?.x || 0,
      rightLowerArmY: riggedPose?.RightLowerArm?.y || 0,
      rightLowerArmZ: riggedPose?.RightLowerArm?.z || 0,
      
      // Hand rotation data
      leftHandX: riggedPose?.LeftHand?.x || 0,
      leftHandY: riggedPose?.LeftHand?.y || 0,
      leftHandZ: riggedPose?.LeftHand?.z || 0,
      rightHandX: riggedPose?.RightHand?.x || 0,
      rightHandY: riggedPose?.RightHand?.y || 0,
      rightHandZ: riggedPose?.RightHand?.z || 0,
    } : {};
    
    // Debug arm data generation
    if (poseLandmarks && riggedPose) {
      console.log(`[${instanceId}] 🎭 Generated arm data:`, {
        leftUpperArm: { x: riggedPose?.LeftUpperArm?.x, y: riggedPose?.LeftUpperArm?.y, z: riggedPose?.LeftUpperArm?.z },
        leftLowerArm: { x: riggedPose?.LeftLowerArm?.x, y: riggedPose?.LeftLowerArm?.y, z: riggedPose?.LeftLowerArm?.z },
        rightUpperArm: { x: riggedPose?.RightUpperArm?.x, y: riggedPose?.RightUpperArm?.y, z: riggedPose?.RightUpperArm?.z },
        rightLowerArm: { x: riggedPose?.RightLowerArm?.x, y: riggedPose?.RightLowerArm?.y, z: riggedPose?.RightLowerArm?.z },
        hasPoseLandmarks: !!poseLandmarks,
        hasRiggedPose: !!riggedPose
      });
    } else {
      console.log(`[${instanceId}] ❌ No pose data available:`, {
        hasPoseLandmarks: !!poseLandmarks,
        hasRiggedPose: !!riggedPose
      });
    }
    
    // Calculate hand gestures
    const handData = {
      leftHandOpen: leftHandLandmarks ? calculateHandOpenness(leftHandLandmarks) : 0,
      rightHandOpen: rightHandLandmarks ? calculateHandOpenness(rightHandLandmarks) : 0,
      leftHandThumbsUp: leftHandLandmarks ? calculateThumbsUp(leftHandLandmarks) : false,
      rightHandThumbsUp: rightHandLandmarks ? calculateThumbsUp(rightHandLandmarks) : false,
      leftHandPointing: leftHandLandmarks ? calculatePointing(leftHandLandmarks) : false,
      rightHandPointing: rightHandLandmarks ? calculatePointing(rightHandLandmarks) : false,
    };
    
    const avatarData = {
      // Facial expressions
      ...facialExpressions,
      
      // Head and eye movement
      ...headMovement,
      
      // Pose data
      ...poseData,
      
      // Hand data
      ...handData,
      
      // Send the pressed key only if it exists (one-time trigger)
      ...(pressedKeyRef.current ? { pressedKey: pressedKeyRef.current } : {}),
      
      // Audio level (placeholder)
      audioLevel: 0,
      
      // Timestamp for sync
      timestamp: Date.now()
    };
    
    // Check if arm movement has significant changes for compression
    const hasArmChanges = hasSignificantArmChange(avatarData, 0.02);
    console.log(`[${instanceId}] 🎭 Arm changes detected:`, hasArmChanges);
    
    // Update last arm data for next comparison
    if (hasArmChanges) {
      lastArmData.current = {
        leftUpperArm: { x: avatarData.leftUpperArmX || 0, y: avatarData.leftUpperArmY || 0, z: avatarData.leftUpperArmZ || 0 },
        leftLowerArm: { x: avatarData.leftLowerArmX || 0, y: avatarData.leftLowerArmY || 0, z: avatarData.leftLowerArmZ || 0 },
        rightUpperArm: { x: avatarData.rightUpperArmX || 0, y: avatarData.rightUpperArmY || 0, z: avatarData.rightUpperArmZ || 0 },
        rightLowerArm: { x: avatarData.rightLowerArmX || 0, y: avatarData.rightLowerArmY || 0, z: avatarData.rightLowerArmZ || 0 }
      };
    }
    
    // Only send arm data if there are significant changes (compression)
    // But always send arm data if pose data exists (disable compression for now)
    if (false && !hasArmChanges && poseData) {
      console.log(`[${instanceId}] 🎭 Compressing arm data - removing from transmission`);
      // Remove arm data to reduce network overhead
      delete avatarData.leftUpperArmX;
      delete avatarData.leftUpperArmY;
      delete avatarData.leftUpperArmZ;
      delete avatarData.leftLowerArmX;
      delete avatarData.leftLowerArmY;
      delete avatarData.leftLowerArmZ;
      delete avatarData.rightUpperArmX;
      delete avatarData.rightUpperArmY;
      delete avatarData.rightUpperArmZ;
      delete avatarData.rightLowerArmX;
      delete avatarData.rightLowerArmY;
      delete avatarData.rightLowerArmZ;
    } else {
      console.log(`[${instanceId}] 🎭 Sending full arm data`);
    }
    
    // Debug: Log pressed key being sent (only when key exists)
    if (pressedKeyRef.current) {
      console.log(`🚀 KEY_SENDER [${instanceId}] SENDING KEY:`, pressedKeyRef.current);
    }
    
    onAvatarDataUpdate(avatarData);
    
    // Clear the pressed key after sending to avoid repeated execution
    pressedKeyRef.current = null;
  }, [onAvatarDataUpdate, isWaving, isBigWave, isBowing, isWinking, isSurprised, isConfused, isExcited, isHeadBob, isShoulderShimmy, isHipSway, hasSignificantArmChange]);

  // Arm movement smoothing and prediction
  const armSmoothingData = useRef({
    leftUpperArm: { x: 0, y: 0, z: 0, velocity: { x: 0, y: 0, z: 0 } },
    leftLowerArm: { x: 0, y: 0, z: 0, velocity: { x: 0, y: 0, z: 0 } },
    rightUpperArm: { x: 0, y: 0, z: 0, velocity: { x: 0, y: 0, z: 0 } },
    rightLowerArm: { x: 0, y: 0, z: 0, velocity: { x: 0, y: 0, z: 0 } }
  });

  // Arm rotation calibration for better accuracy
  const calibrateArmRotation = useCallback((rotation: any, side: 'left' | 'right', part: 'upper' | 'lower' = 'upper') => {
    const calibrated = { ...rotation };
    
    // Apply calibration adjustments based on side and part
    if (side === 'left') {
      if (part === 'lower') {
        // Left lower arm - much more sensitive for better reactivity
        calibrated.x = rotation.x * 1.8; // Significantly increase X rotation sensitivity for lower arm
        calibrated.y = rotation.y * 1.6; // Significantly increase Y rotation sensitivity for lower arm
        calibrated.z = rotation.z * 1.4; // Increase Z rotation sensitivity for lower arm
      } else {
        // Left upper arm calibration adjustments
        calibrated.x = rotation.x * 1.1; // Slightly increase X rotation sensitivity
        calibrated.y = rotation.y * 0.9; // Slightly decrease Y rotation sensitivity
        calibrated.z = rotation.z * 1.0; // Keep Z rotation as is
      }
    } else {
      if (part === 'lower') {
        // Right lower arm - much more sensitive for better reactivity
        calibrated.x = rotation.x * 1.8; // Significantly increase X rotation sensitivity for lower arm
        calibrated.y = rotation.y * 1.6; // Significantly increase Y rotation sensitivity for lower arm
        calibrated.z = rotation.z * 1.4; // Increase Z rotation sensitivity for lower arm
      } else {
        // Right upper arm calibration adjustments
        calibrated.x = rotation.x * 1.1; // Slightly increase X rotation sensitivity
        calibrated.y = rotation.y * 0.9; // Slightly decrease Y rotation sensitivity
        calibrated.z = rotation.z * 1.0; // Keep Z rotation as is
      }
    }
    
    return calibrated;
  }, []);

  const smoothArmMovement = useCallback((current: any, target: any, smoothingFactor: number = 0.4) => {
    const smoothed = { ...current };
    
    // Calculate velocity for prediction
    smoothed.velocity.x = (target.x - current.x) * smoothingFactor;
    smoothed.velocity.y = (target.y - current.y) * smoothingFactor;
    smoothed.velocity.z = (target.z - current.z) * smoothingFactor;
    
    // Apply smoothing with prediction
    smoothed.x = current.x + smoothed.velocity.x;
    smoothed.y = current.y + smoothed.velocity.y;
    smoothed.z = current.z + smoothed.velocity.z;
    
    return smoothed;
  }, []);

  // Apply remote avatar data to VRM
  const applyRemoteAvatarData = useCallback((vrm: VRM, avatarData: any) => {
    if (!avatarData || !vrm.expressionManager) {
      return;
    }
    
    // Debug: Check if arm data is present
    if (avatarData.leftUpperArmX !== undefined || avatarData.rightUpperArmX !== undefined) {
      console.log(`[${instanceId}] 🎭 Remote avatar data contains arm data:`, {
        leftUpperArm: { x: avatarData.leftUpperArmX, y: avatarData.leftUpperArmY, z: avatarData.leftUpperArmZ },
        rightUpperArm: { x: avatarData.rightUpperArmX, y: avatarData.rightUpperArmY, z: avatarData.rightUpperArmZ }
      });
    } else {
      console.log(`[${instanceId}] ❌ No arm data in remote avatar data`);
    }
    
    // Debug: Check if pressed key is present
    console.log(`🎯 KEY_RECEIVER [${instanceId}] RECEIVED KEY:`, avatarData.pressedKey);
    
    // Apply facial expressions
    if (avatarData.blink !== undefined) {
      vrm.expressionManager.setValue("blink", avatarData.blink);
    }
    if (avatarData.happy !== undefined) {
      vrm.expressionManager.setValue("happy", avatarData.happy);
    }
    if (avatarData.angry !== undefined) {
      vrm.expressionManager.setValue("angry", avatarData.angry);
    }
    if (avatarData.surprised !== undefined) {
      vrm.expressionManager.setValue("surprised", avatarData.surprised);
    }
    if (avatarData.i !== undefined) {
      vrm.expressionManager.setValue("i", avatarData.i);
    }
    if (avatarData.a !== undefined) {
      vrm.expressionManager.setValue("a", avatarData.a);
    }
    if (avatarData.e !== undefined) {
      vrm.expressionManager.setValue("e", avatarData.e);
    }
    if (avatarData.o !== undefined) {
      vrm.expressionManager.setValue("o", avatarData.o);
    }
    if (avatarData.u !== undefined) {
      vrm.expressionManager.setValue("u", avatarData.u);
    }
    
    // Apply head movement with faster interpolation for remote avatars
    if (avatarData.headX !== undefined || avatarData.headY !== undefined || avatarData.headZ !== undefined) {
      rigRotation(vrm, "neck", {
        x: avatarData.headX || 0,
        y: avatarData.headY || 0,
        z: avatarData.headZ || 0
      }, 1, 0.7); // Increased from 0.8 to 0.7 for more responsive movement
    }
    
    // Apply eye movement
    if (avatarData.eyeX !== undefined || avatarData.eyeY !== undefined) {
      const lookTarget = new THREE.Euler(
        avatarData.eyeY || 0,
        avatarData.eyeX || 0,
        0,
        "XYZ"
      );
      
      if (vrm.lookAt?.target) {
        vrm.lookAt.target.position.set(
          Math.sin(lookTarget.y) * 2.5,
          -Math.sin(lookTarget.x) * 2.5,
          -3
        );
      }
    }
    
    // Apply pose data (upper body movements)
    // Apply body rotation (skip if reaction is active)
    if (!remoteReactionActiveRef.current && (avatarData.bodyRotationX !== undefined || avatarData.bodyRotationY !== undefined || avatarData.bodyRotationZ !== undefined)) {
      console.log(`[${instanceId}] 🎭 Applying body rotation:`, { 
        bodyRotationX: avatarData.bodyRotationX, 
        bodyRotationY: avatarData.bodyRotationY, 
        bodyRotationZ: avatarData.bodyRotationZ 
      });
      rigRotation(vrm, "spine", {
        x: avatarData.bodyRotationX || 0,
        y: avatarData.bodyRotationY || 0,
        z: avatarData.bodyRotationZ || 0
      }, 1, 0.6); // Faster interpolation for remote avatar responsiveness
    } else if (remoteReactionActiveRef.current) {
      console.log(`⏸️ REMOTE_PAUSE [${instanceId}] SKIPPING BODY ROTATION - REACTION ACTIVE`);
    }
    
    // Apply full arm movements using Kalidokit rotation data with smoothing (skip if reaction is active)
    if (!remoteReactionActiveRef.current && (avatarData.leftUpperArmX !== undefined || avatarData.leftUpperArmY !== undefined || avatarData.leftUpperArmZ !== undefined)) {
      const rawRotation = {
        x: avatarData.leftUpperArmX || 0,
        y: avatarData.leftUpperArmY || 0,
        z: avatarData.leftUpperArmZ || 0
      };
      
      const calibratedRotation = calibrateArmRotation(rawRotation, 'left', 'upper');
      const smoothedRotation = smoothArmMovement(armSmoothingData.current.leftUpperArm, calibratedRotation, 0.7);
      armSmoothingData.current.leftUpperArm = smoothedRotation;
      
      console.log(`[${instanceId}] 🎭 Applying smoothed left upper arm rotation:`, smoothedRotation);
      console.log(`[${instanceId}] 🎭 VRM bones available:`, Object.keys(vrm.humanoid?.normalizedHumanBones || {}));
      
      // Check if the bone exists
      const leftUpperArmBone = vrm.humanoid?.normalizedHumanBones?.leftUpperArm;
      if (leftUpperArmBone) {
        console.log(`[${instanceId}] 🎭 Left upper arm bone found:`, leftUpperArmBone.name);
        rigRotation(vrm, "leftUpperArm", smoothedRotation, 0.8, 0.7); // Improved accuracy
      } else {
        console.log(`[${instanceId}] ❌ Left upper arm bone not found in VRM model`);
      }
    }
    
    if (!remoteReactionActiveRef.current && (avatarData.leftLowerArmX !== undefined || avatarData.leftLowerArmY !== undefined || avatarData.leftLowerArmZ !== undefined)) {
      const rawRotation = {
        x: avatarData.leftLowerArmX || 0,
        y: avatarData.leftLowerArmY || 0,
        z: avatarData.leftLowerArmZ || 0
      };
      
      const calibratedRotation = calibrateArmRotation(rawRotation, 'left', 'lower');
      const smoothedRotation = smoothArmMovement(armSmoothingData.current.leftLowerArm, calibratedRotation, 0.7);
      armSmoothingData.current.leftLowerArm = smoothedRotation;
      
      console.log(`[${instanceId}] 🎭 Applying smoothed left lower arm rotation:`, smoothedRotation);
      
      // Check if the bone exists
      const leftLowerArmBone = vrm.humanoid?.normalizedHumanBones?.leftLowerArm;
      if (leftLowerArmBone) {
        console.log(`[${instanceId}] 🎭 Left lower arm bone found:`, leftLowerArmBone.name);
        rigRotation(vrm, "leftLowerArm", smoothedRotation, 1.0, 0.9); // Maximum dampener and lerp for better reactivity
      } else {
        console.log(`[${instanceId}] ❌ Left lower arm bone not found in VRM model`);
      }
    }
    
    if (!remoteReactionActiveRef.current && (avatarData.rightUpperArmX !== undefined || avatarData.rightUpperArmY !== undefined || avatarData.rightUpperArmZ !== undefined)) {
      const rawRotation = {
        x: avatarData.rightUpperArmX || 0,
        y: avatarData.rightUpperArmY || 0,
        z: avatarData.rightUpperArmZ || 0
      };
      
      const calibratedRotation = calibrateArmRotation(rawRotation, 'right', 'upper');
      const smoothedRotation = smoothArmMovement(armSmoothingData.current.rightUpperArm, calibratedRotation, 0.7);
      armSmoothingData.current.rightUpperArm = smoothedRotation;
      
      console.log(`[${instanceId}] 🎭 Applying smoothed right upper arm rotation:`, smoothedRotation);
      
      // Check if the bone exists
      const rightUpperArmBone = vrm.humanoid?.normalizedHumanBones?.rightUpperArm;
      if (rightUpperArmBone) {
        console.log(`[${instanceId}] 🎭 Right upper arm bone found:`, rightUpperArmBone.name);
        rigRotation(vrm, "rightUpperArm", smoothedRotation, 0.8, 0.7); // Improved accuracy
      } else {
        console.log(`[${instanceId}] ❌ Right upper arm bone not found in VRM model`);
      }
    }
    
    if (!remoteReactionActiveRef.current && (avatarData.rightLowerArmX !== undefined || avatarData.rightLowerArmY !== undefined || avatarData.rightLowerArmZ !== undefined)) {
      const rawRotation = {
        x: avatarData.rightLowerArmX || 0,
        y: avatarData.rightLowerArmY || 0,
        z: avatarData.rightLowerArmZ || 0
      };
      
      const calibratedRotation = calibrateArmRotation(rawRotation, 'right', 'lower');
      const smoothedRotation = smoothArmMovement(armSmoothingData.current.rightLowerArm, calibratedRotation, 0.7);
      armSmoothingData.current.rightLowerArm = smoothedRotation;
      
      console.log(`[${instanceId}] 🎭 Applying smoothed right lower arm rotation:`, smoothedRotation);
      
      // Check if the bone exists
      const rightLowerArmBone = vrm.humanoid?.normalizedHumanBones?.rightLowerArm;
      if (rightLowerArmBone) {
        console.log(`[${instanceId}] 🎭 Right lower arm bone found:`, rightLowerArmBone.name);
        rigRotation(vrm, "rightLowerArm", smoothedRotation, 1.0, 0.9); // Maximum dampener and lerp for better reactivity
      } else {
        console.log(`[${instanceId}] ❌ Right lower arm bone not found in VRM model`);
      }
    }
    
    // Apply hand rotations with improved sensitivity (skip if reaction is active)
    if (!remoteReactionActiveRef.current && (avatarData.leftHandX !== undefined || avatarData.leftHandY !== undefined || avatarData.leftHandZ !== undefined)) {
      console.log(`[${instanceId}] 🎭 Applying left hand rotation:`, {
        x: avatarData.leftHandX,
        y: avatarData.leftHandY,
        z: avatarData.leftHandZ
      });
      rigRotation(vrm, "leftHand", {
        x: (avatarData.leftHandX || 0) * 1.5, // Increase sensitivity
        y: (avatarData.leftHandY || 0) * 1.5, // Increase sensitivity
        z: (avatarData.leftHandZ || 0) * 1.5  // Increase sensitivity
      }, 1, 0.8); // Better dampening and lerp
    }
    
    if (!remoteReactionActiveRef.current && (avatarData.rightHandX !== undefined || avatarData.rightHandY !== undefined || avatarData.rightHandZ !== undefined)) {
      console.log(`[${instanceId}] 🎭 Applying right hand rotation:`, {
        x: avatarData.rightHandX,
        y: avatarData.rightHandY,
        z: avatarData.rightHandZ
      });
      rigRotation(vrm, "rightHand", {
        x: (avatarData.rightHandX || 0) * 1.5, // Increase sensitivity
        y: (avatarData.rightHandY || 0) * 1.5, // Increase sensitivity
        z: (avatarData.rightHandZ || 0) * 1.5  // Increase sensitivity
      }, 1, 0.8); // Better dampening and lerp
    }
    
    // Apply hand gestures with improved sensitivity (skip if reaction is active)
    if (!remoteReactionActiveRef.current && avatarData.leftHandOpen !== undefined) {
      console.log(`[${instanceId}] 🎭 Applying left hand openness:`, avatarData.leftHandOpen);
      rigRotation(vrm, "leftHand", {
        x: 0,
        y: 0,
        z: avatarData.leftHandOpen * 0.5 // Increase sensitivity for hand openness
      }, 1, 0.8); // Better dampening and lerp
    }
    
    if (!remoteReactionActiveRef.current && avatarData.rightHandOpen !== undefined) {
      console.log(`[${instanceId}] 🎭 Applying right hand openness:`, avatarData.rightHandOpen);
      rigRotation(vrm, "rightHand", {
        x: 0,
        y: 0,
        z: avatarData.rightHandOpen * 0.5 // Increase sensitivity for hand openness
      }, 1, 0.8); // Better dampening and lerp
    }
    
    // Apply hand gestures (thumbs up, pointing)
    if (avatarData.leftHandThumbsUp) {
      console.log(`[${instanceId}] 🎭 Applying left hand thumbs up`);
      rigRotation(vrm, "leftThumbProximal", {
        x: 0,
        y: 0,
        z: 0.5
      }, 1, 0.7);
    }
    
    if (avatarData.rightHandThumbsUp) {
      console.log(`[${instanceId}] 🎭 Applying right hand thumbs up`);
      rigRotation(vrm, "rightThumbProximal", {
        x: 0,
        y: 0,
        z: -0.5
      }, 1, 0.7);
    }
    
    if (avatarData.leftHandPointing) {
      console.log(`[${instanceId}] 🎭 Applying left hand pointing`);
      rigRotation(vrm, "leftIndexProximal", {
        x: 0,
        y: 0,
        z: 0.3
      }, 1, 0.7);
    }
    
    if (avatarData.rightHandPointing) {
      console.log(`[${instanceId}] 🎭 Applying right hand pointing`);
      rigRotation(vrm, "rightIndexProximal", {
        x: 0,
        y: 0,
        z: -0.3
      }, 1, 0.7);
    }
    
    // Apply remote reactions based on pressed key
    if (avatarData.pressedKey) {
      const key = avatarData.pressedKey.toLowerCase();
      console.log(`🔥 REMOTE_KEY [${instanceId}] EXECUTING KEY: ${key}`);
      
      // Set reaction as active
      remoteReactionActiveRef.current = true;
      
      // Clear any existing timeout
      if (remoteReactionTimeoutRef.current) {
        clearTimeout(remoteReactionTimeoutRef.current);
      }
      
      // Execute the same reaction function based on the key
      if (key === 'q') {
        performGreeting(vrm);
        remoteReactionTimeoutRef.current = setTimeout(() => {
          remoteReactionActiveRef.current = false;
          console.log(`⏸️ REMOTE_PAUSE [${instanceId}] RESUMING POSE TRACKING`);
        }, 2000);
      } else if (key === 'w') {
        performBigWave(vrm);
        remoteReactionTimeoutRef.current = setTimeout(() => {
          remoteReactionActiveRef.current = false;
          console.log(`⏸️ REMOTE_PAUSE [${instanceId}] RESUMING POSE TRACKING`);
        }, 3000);
      } else if (key === 'o') {
        performBow(vrm);
        remoteReactionTimeoutRef.current = setTimeout(() => {
          remoteReactionActiveRef.current = false;
          console.log(`⏸️ REMOTE_PAUSE [${instanceId}] RESUMING POSE TRACKING`);
        }, 2000);
      } else if (key === 'd' || key === '1') {
        performWink(vrm);
        remoteReactionTimeoutRef.current = setTimeout(() => {
          remoteReactionActiveRef.current = false;
          console.log(`⏸️ REMOTE_PAUSE [${instanceId}] RESUMING POSE TRACKING`);
        }, 1000);
      } else if (key === 'f' || key === '2') {
        performSurprised(vrm);
        remoteReactionTimeoutRef.current = setTimeout(() => {
          remoteReactionActiveRef.current = false;
          console.log(`⏸️ REMOTE_PAUSE [${instanceId}] RESUMING POSE TRACKING`);
        }, 2000);
      } else if (key === 'g' || key === '3') {
        performConfused(vrm);
        remoteReactionTimeoutRef.current = setTimeout(() => {
          remoteReactionActiveRef.current = false;
          console.log(`⏸️ REMOTE_PAUSE [${instanceId}] RESUMING POSE TRACKING`);
        }, 2500);
      } else if (key === 'h' || key === '4') {
        performExcited(vrm);
        remoteReactionTimeoutRef.current = setTimeout(() => {
          remoteReactionActiveRef.current = false;
          console.log(`⏸️ REMOTE_PAUSE [${instanceId}] RESUMING POSE TRACKING`);
        }, 3000);
      } else if (key === 'j') {
        performHeadBob(vrm);
        remoteReactionTimeoutRef.current = setTimeout(() => {
          remoteReactionActiveRef.current = false;
          console.log(`⏸️ REMOTE_PAUSE [${instanceId}] RESUMING POSE TRACKING`);
        }, 2000);
      } else if (key === 'k') {
        performShoulderShimmy(vrm);
        remoteReactionTimeoutRef.current = setTimeout(() => {
          remoteReactionActiveRef.current = false;
          console.log(`⏸️ REMOTE_PAUSE [${instanceId}] RESUMING POSE TRACKING`);
        }, 2000);
      } else if (key === 'l') {
        performHipSway(vrm);
        remoteReactionTimeoutRef.current = setTimeout(() => {
          remoteReactionActiveRef.current = false;
          console.log(`⏸️ REMOTE_PAUSE [${instanceId}] RESUMING POSE TRACKING`);
        }, 2000);
      }
      
      console.log(`⏸️ REMOTE_PAUSE [${instanceId}] PAUSING POSE TRACKING FOR REACTION`);
    }
    
    // Skip pose data application if reaction is active
    if (remoteReactionActiveRef.current) {
      console.log(`⏸️ REMOTE_PAUSE [${instanceId}] SKIPPING POSE DATA - REACTION ACTIVE`);
      return;
    }
  }, []);

  // Apply remote avatar data to remote VRM in dual avatar mode
  const applyRemoteAvatarDataToRemote = useCallback((avatarData: any) => {
    if (!isDualAvatar || !remoteVrm.current || !avatarData) return;
    applyRemoteAvatarData(remoteVrm.current, avatarData);
  }, [isDualAvatar, applyRemoteAvatarData]);

  const animateVRM = (vrm: VRM, results: any) => {
      if (!currentVrm.current || !isCameraEnabled) return;

      let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;
      const videoElement = videoRef.current;
      if (!videoElement) return;

      try {
        // Try multiple possible property names for face landmarks
        const faceLandmarks = results.faceLandmarks || results.faceLandmarksList?.[0] || results.multiFaceLandmarks?.[0];
        // Note: 'ea' is used for 3D landmarks based on the library version being loaded.
        const pose3DLandmarks = results.ea; 
        const pose2DLandmarks = results.poseLandmarks;
        const leftHandLandmarks = results.leftHandLandmarks;
        const rightHandLandmarks = results.rightHandLandmarks;

        // Animate Pose
        if (pose2DLandmarks) {
            console.log(`[${instanceId}] Pose landmarks detected, solving...`);
            // Use the correct pose solving with 3D landmarks if available, otherwise use 2D
            if (pose3DLandmarks) {
              riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, { runtime: "mediapipe", video: videoElement });
            } else {
              // Fallback to 2D only pose solving
              riggedPose = Kalidokit.Pose.solve(pose2DLandmarks, pose2DLandmarks, { runtime: "mediapipe", video: videoElement });
            }
            if (riggedPose) {
              console.log(`[${instanceId}] Pose solved successfully:`, riggedPose);
              console.log(`[${instanceId}] Arm data in riggedPose:`, {
                leftUpperArm: riggedPose.LeftUpperArm,
                rightUpperArm: riggedPose.RightUpperArm
              });
              rigPose(vrm, riggedPose);
            } else {
              console.log(`[${instanceId}] Pose solve failed`);
            }
        }

        // Animate Hands
        if (leftHandLandmarks) {
            console.log(`[${instanceId}] Left hand landmarks detected, solving...`);
            riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, "Left");
            if (riggedLeftHand) {
              console.log(`[${instanceId}] Left hand solved successfully:`, riggedLeftHand);
              rigLeftHand(vrm, riggedLeftHand);
            }
        }

        if (rightHandLandmarks) {
            console.log(`[${instanceId}] Right hand landmarks detected, solving...`);
            riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");
            if (riggedRightHand) {
              console.log(`[${instanceId}] Right hand solved successfully:`, riggedRightHand);
              rigRightHand(vrm, riggedRightHand);
            }
        }

        // Animate Face
        if (faceLandmarks) {
            console.log(`[${instanceId}] Face landmarks detected, solving...`);
            riggedFace = Kalidokit.Face.solve(faceLandmarks);
            if (riggedFace) {
              console.log(`[${instanceId}] Face solved successfully:`, riggedFace);
              rigFace(vrm, riggedFace);
              // Send complete avatar data with pose and hand landmarks
              sendAvatarData(riggedFace, riggedPose, pose2DLandmarks, leftHandLandmarks, rightHandLandmarks);
            } else {
              console.log(`[${instanceId}] Face solve failed`);
            }
        } else {
          console.log(`[${instanceId}] No face landmarks detected`);
          console.log(`[${instanceId}] Debug - videoElement readyState:`, videoElement.readyState);
          console.log(`[${instanceId}] Debug - videoElement videoWidth:`, videoElement.videoWidth);
          console.log(`[${instanceId}] Debug - videoElement videoHeight:`, videoElement.videoHeight);
          console.log(`[${instanceId}] Debug - videoElement srcObject:`, !!videoElement.srcObject);
          console.log(`[${instanceId}] Debug - results object:`, results);
          console.log(`[${instanceId}] Debug - faceLandmarks:`, results.faceLandmarks);
          console.log(`[${instanceId}] Debug - poseLandmarks:`, results.poseLandmarks);
          console.log(`[${instanceId}] Debug - All results keys:`, Object.keys(results));
          console.log(`[${instanceId}] Debug - multiFaceGeometry:`, results.multiFaceGeometry);
          
          // Check if face landmarks are in a different property
          if (results.multiFaceGeometry && results.multiFaceGeometry.length > 0) {
            console.log(`[${instanceId}] Found face geometry in multiFaceGeometry:`, results.multiFaceGeometry[0]);
            // Try to use the first face from multiFaceGeometry
            const faceGeometry = results.multiFaceGeometry[0];
            if (faceGeometry && faceGeometry.landmarks) {
              console.log(`[${instanceId}] Using face landmarks from multiFaceGeometry`);
              const riggedFace = Kalidokit.Face.solve(faceGeometry.landmarks, { runtime: "mediapipe", video: videoElement });
              if (riggedFace) {
                console.log(`[${instanceId}] Face solved successfully from multiFaceGeometry:`, riggedFace);
                rigFace(vrm, riggedFace);
                sendAvatarData(riggedFace, riggedPose);
              }
            }
          } else {
            // Fallback: Send dynamic avatar data even without face detection
            console.log(`[${instanceId}] Sending dynamic fallback avatar data with pose and hand data`);
            
            // Create more dynamic fallback data with subtle movements
            const time = Date.now() * 0.001; // Convert to seconds
            // Mobile-specific: Disable problematic animations that cause upward drift
            if (isMobile) {
              console.log(`[${instanceId}] Mobile: Using fallback animation with disabled hip Y and body Y rotation`);
            }
            
            const fallbackAvatarData = {
              // Facial expressions
              blink: Math.sin(time * 2) * 0.1 + 0.1, // Subtle blinking
              happy: Math.sin(time * 0.5) * 0.05, // Subtle happy expression
              angry: 0,
              surprised: 0,
              sad: Math.sin(time * 0.3) * 0.02, // Subtle sad expression
              fearful: Math.sin(time * 0.4) * 0.01, // Subtle fearful expression
              disgusted: Math.sin(time * 0.6) * 0.01, // Subtle disgusted expression
              relaxed: Math.sin(time * 0.2) * 0.03 + 0.1, // Subtle relaxed expression
              i: Math.sin(time * 1.5) * 0.1, // Subtle mouth movement
              a: Math.sin(time * 1.2) * 0.1,
              e: Math.sin(time * 1.8) * 0.1,
              o: Math.sin(time * 1.1) * 0.1,
              u: Math.sin(time * 1.3) * 0.1,
              
              // Head and eye movement
              headX: Math.sin(time * 0.3) * 0.1, // Subtle head movement
              headY: Math.sin(time * 0.4) * 0.05,
              headZ: Math.sin(time * 0.2) * 0.05,
              eyeX: Math.sin(time * 0.6) * 0.1, // Subtle eye movement
              eyeY: Math.sin(time * 0.7) * 0.05,
              
              // Pose data (subtle body movements)
              leftShoulderX: Math.sin(time * 0.2) * 0.05,
              leftShoulderY: Math.sin(time * 0.25) * 0.03,
              rightShoulderX: Math.sin(time * 0.22) * 0.05,
              rightShoulderY: Math.sin(time * 0.27) * 0.03,
              leftElbowX: Math.sin(time * 0.3) * 0.08,
              leftElbowY: Math.sin(time * 0.35) * 0.05,
              rightElbowX: Math.sin(time * 0.32) * 0.08,
              rightElbowY: Math.sin(time * 0.37) * 0.05,
              leftWristX: Math.sin(time * 0.4) * 0.1,
              leftWristY: Math.sin(time * 0.45) * 0.08,
              rightWristX: Math.sin(time * 0.42) * 0.1,
              rightWristY: Math.sin(time * 0.47) * 0.08,
              leftHipX: Math.sin(time * 0.15) * 0.03,
              leftHipY: isMobile ? 0 : Math.sin(time * 0.18) * 0.02, // Disable hip Y movement on mobile
              rightHipX: Math.sin(time * 0.17) * 0.03,
              rightHipY: isMobile ? 0 : Math.sin(time * 0.19) * 0.02, // Disable hip Y movement on mobile
              bodyRotationX: Math.sin(time * 0.1) * 0.05,
              bodyRotationY: isMobile ? 0 : Math.sin(time * 0.12) * 0.03, // Disable body Y rotation on mobile
              bodyRotationZ: Math.sin(time * 0.08) * 0.02,
              
              // Hand data (subtle hand movements)
              leftHandOpen: Math.sin(time * 0.8) * 0.3 + 0.3, // Subtle hand opening/closing
              rightHandOpen: Math.sin(time * 0.85) * 0.3 + 0.3,
              leftHandThumbsUp: Math.sin(time * 2) > 0.8, // Occasional thumbs up
              rightHandThumbsUp: Math.sin(time * 2.1) > 0.8,
              leftHandPointing: Math.sin(time * 1.5) > 0.9, // Occasional pointing
              rightHandPointing: Math.sin(time * 1.6) > 0.9,
              
              // Gestures
              isWaving: false,
              isBigWave: false,
              isBowing: false,
              isWinking: false,
              isSurprised: false,
              isConfused: false,
              isExcited: false,
              isHeadBob: false,
              isShoulderShimmy: false,
              isHipSway: false,
              audioLevel: 0
            };
            sendAvatarData(fallbackAvatarData, riggedPose);
          }
        }

        // Animate Pose with improved smoothness and stability
        if (pose2DLandmarks && pose3DLandmarks) {
            riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, { runtime: "mediapipe", video: videoElement });
            if (riggedPose) {
                // Lower body - enhanced stability with smoother movement
                rigRotation(vrm, "hips", riggedPose.Hips.rotation, 0.4, 0.6); // Increased dampener and lerp for smoother hip movement
                
                // Limit hip position movement to keep lower body in place and centered
                const hipPositionDampener = 0.4; // Increased for more natural movement
                rigPosition(vrm, "hips", {
                    x: -riggedPose.Hips.position.x * hipPositionDampener,
                    y: (riggedPose.Hips.position.y + 1.2) * hipPositionDampener, // Adjusted offset to keep avatar centered
                    z: -riggedPose.Hips.position.z * hipPositionDampener,
                }, 1, 0.2); // Increased lerp for smoother movement

                // Upper body - enhanced fluidity and natural movement
                rigRotation(vrm, "chest", riggedPose.Spine, 0.5, 0.7); // Increased dampener and lerp for smoother chest movement
                rigRotation(vrm, "spine", riggedPose.Spine, 0.7, 0.7); // Increased dampener and lerp for smoother spine movement
                
                // Arms - enhanced fluidity and responsiveness
                console.log(`[${instanceId}] Animating arms with pose data...`);
                console.log(`[${instanceId}] 🦴 Available bones for pose:`, Object.keys(vrm.humanoid?.normalizedHumanBones || {}));
                console.log(`[${instanceId}] 🎭 Pose data:`, {
                  rightUpperArm: riggedPose.RightUpperArm,
                  rightLowerArm: riggedPose.RightLowerArm,
                  leftUpperArm: riggedPose.LeftUpperArm,
                  leftLowerArm: riggedPose.LeftLowerArm
                });
                rigRotation(vrm, "rightUpperArm", riggedPose.RightUpperArm, 0.9, 0.8); // Increased dampener and lerp for smoother movement
                rigRotation(vrm, "rightLowerArm", riggedPose.RightLowerArm, 1.0, 0.9); // Maximum dampener and lerp for fluid lower arm tracking
                rigRotation(vrm, "leftUpperArm", riggedPose.LeftUpperArm, 0.9, 0.8); // Increased dampener and lerp for smoother movement
                rigRotation(vrm, "leftLowerArm", riggedPose.LeftLowerArm, 1.0, 0.9); // Maximum dampener and lerp for fluid lower arm tracking
                
                // Legs - minimal movement to keep lower body stable
                rigRotation(vrm, "leftUpperLeg", riggedPose.LeftUpperLeg, 0.2, 0.4); // Much reduced dampener
                rigRotation(vrm, "leftLowerLeg", riggedPose.LeftLowerLeg, 0.2, 0.4); // Much reduced dampener
                rigRotation(vrm, "rightUpperLeg", riggedPose.RightUpperLeg, 0.2, 0.4); // Much reduced dampener
                rigRotation(vrm, "rightLowerLeg", riggedPose.RightLowerLeg, 0.2, 0.4); // Much reduced dampener
            
                // Animate Hands with smoother tracking
                if (leftHandLandmarks) {
                    console.log(`[${instanceId}] Left hand landmarks detected, animating left hand...`);
                    riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, "Left");
                    if (riggedLeftHand) {
                      console.log(`[${instanceId}] Left hand rigged successfully`);
                      rigRotation(vrm, "leftHand", { z: riggedPose.LeftHand.z, y: riggedLeftHand.LeftWrist.y, x: riggedLeftHand.LeftWrist.x, }, 1, 0.6); // Increased lerp for smoother hand movement
                      rigRotation(vrm, "leftRingProximal", riggedLeftHand.LeftRingProximal, 1, 0.5);
                      rigRotation(vrm, "leftRingIntermediate", riggedLeftHand.LeftRingIntermediate, 1, 0.5);
                      rigRotation(vrm, "leftRingDistal", riggedLeftHand.LeftRingDistal, 1, 0.5);
                      rigRotation(vrm, "leftIndexProximal", riggedLeftHand.LeftIndexProximal, 1, 0.5);
                      rigRotation(vrm, "leftIndexIntermediate", riggedLeftHand.LeftIndexIntermediate, 1, 0.5);
                      rigRotation(vrm, "leftIndexDistal", riggedLeftHand.LeftIndexDistal, 1, 0.5);
                      rigRotation(vrm, "leftMiddleProximal", riggedLeftHand.LeftMiddleProximal, 1, 0.5);
                      rigRotation(vrm, "leftMiddleIntermediate", riggedLeftHand.LeftMiddleIntermediate, 1, 0.5);
                      rigRotation(vrm, "leftMiddleDistal", riggedLeftHand.LeftMiddleDistal, 1, 0.5);
                      rigRotation(vrm, "leftThumbProximal", riggedLeftHand.LeftThumbProximal, 1, 0.5);
                      rigRotation(vrm, "leftThumbIntermediate" as any, riggedLeftHand.LeftThumbIntermediate, 1, 0.5);
                      rigRotation(vrm, "leftThumbDistal", riggedLeftHand.LeftThumbDistal, 1, 0.5);
                      rigRotation(vrm, "leftLittleProximal", riggedLeftHand.LeftLittleProximal, 1, 0.5);
                      rigRotation(vrm, "leftLittleIntermediate", riggedLeftHand.LeftLittleIntermediate, 1, 0.5);
                      rigRotation(vrm, "leftLittleDistal", riggedLeftHand.LeftLittleDistal, 1, 0.5);
                    }
                }
                if (rightHandLandmarks) {
                    console.log(`[${instanceId}] Right hand landmarks detected, animating right hand...`);
                    riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");
                    if (riggedRightHand) {
                      console.log(`[${instanceId}] Right hand rigged successfully`);
                      rigRotation(vrm, "rightHand", { z: riggedPose.RightHand.z, y: riggedRightHand.RightWrist.y, x: riggedRightHand.RightWrist.x, }, 1, 0.6); // Increased lerp for smoother hand movement
                      rigRotation(vrm, "rightRingProximal", riggedRightHand.RightRingProximal, 1, 0.5);
                      rigRotation(vrm, "rightRingIntermediate", riggedRightHand.RightRingIntermediate, 1, 0.5);
                      rigRotation(vrm, "rightRingDistal", riggedRightHand.RightRingDistal, 1, 0.5);
                      rigRotation(vrm, "rightIndexProximal", riggedRightHand.RightIndexProximal, 1, 0.5);
                      rigRotation(vrm, "rightIndexIntermediate", riggedRightHand.RightIndexIntermediate, 1, 0.5);
                      rigRotation(vrm, "rightIndexDistal", riggedRightHand.RightIndexDistal, 1, 0.5);
                      rigRotation(vrm, "rightMiddleProximal", riggedRightHand.RightMiddleProximal, 1, 0.5);
                      rigRotation(vrm, "rightMiddleIntermediate", riggedRightHand.RightMiddleIntermediate, 1, 0.5);
                      rigRotation(vrm, "rightMiddleDistal", riggedRightHand.RightMiddleDistal, 1, 0.5);
                      rigRotation(vrm, "rightThumbProximal", riggedRightHand.RightThumbProximal, 1, 0.5);
                      rigRotation(vrm, "rightThumbIntermediate" as any, riggedRightHand.RightThumbIntermediate, 1, 0.5);
                      rigRotation(vrm, "rightThumbDistal", riggedRightHand.RightThumbDistal, 1, 0.5);
                      rigRotation(vrm, "rightLittleProximal", riggedRightHand.RightLittleProximal, 1, 0.5);
                      rigRotation(vrm, "rightLittleIntermediate", riggedRightHand.RightLittleIntermediate, 1, 0.5);
                      rigRotation(vrm, "rightLittleDistal", riggedRightHand.RightLittleDistal, 1, 0.5);
                    }
                }
            }
        }
        
      } catch (error) {
        // console.error("Kalidokit solve error:", error);
      }
  };


  useEffect(() => {
    if (!enableFaceTracking) return;
    
    const scriptId = "mediapipe-holistic-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const loadScript = () => {
        if (script && (window as any).Holistic) {
            setIsHolisticLoaded(true);
            return;
        }
        
        // Remove existing script if it exists but Holistic is not available
        if (script && !(window as any).Holistic) {
            script.remove();
        }
        
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/holistic.js";
        script.crossOrigin = "anonymous";
        script.async = true;
        script.onload = () => {
            // Wait a bit for the library to be fully available
                setTimeout(() => {
                    if ((window as any).Holistic) {
                        setIsHolisticLoaded(true);
                    } else {
                        console.error("Holistic library loaded but not available on window object");
                        toast({
                            title: "Initialization Error",
                            description: "Face tracking library could not be initialized properly.",
                            variant: "destructive",
                        });
                    }
            }, 100);
        };
        script.onerror = () => {
            toast({
                title: "Script Load Error",
                description: "Failed to load face tracking script. Check your internet connection or disable ad-blockers.",
                variant: "destructive",
            });
        };
        document.body.appendChild(script);
    };
    
    loadScript();

  }, [toast, enableFaceTracking]);

  useEffect(() => {
    console.log(`[${instanceId}] Face tracking conditions check:`, {
      enableFaceTracking,
      isCameraEnabled,
      hasVideoRef: !!videoRef.current,
      isHolisticLoaded,
      allConditionsMet: enableFaceTracking && isCameraEnabled && videoRef.current && isHolisticLoaded
    });
    
    console.log(`[${instanceId}] MediaPipe Holistic available:`, !!(window as any).Holistic);
    console.log(`[${instanceId}] MediaPipe Holistic constructor:`, typeof (window as any).Holistic);
    
    if (!enableFaceTracking || !isCameraEnabled || !videoRef.current || !isHolisticLoaded) {
      console.log(`[${instanceId}] Face tracking not starting - missing conditions`);
      return;
    }

    const videoElement = videoRef.current;
    let holistic: any;
    let holisticFrameId: number;

    const setupCamera = async () => {
      try {
        console.log("Setting up camera...");
        
        // Mobile-optimized camera constraints
        const constraints = isMobile ? {
          video: { 
             width: { ideal: 160, max: 240 },  // Even lower resolution for mobile
             height: { ideal: 120, max: 180 },  // Even lower resolution for mobile
            facingMode: 'user',
             frameRate: { ideal: 8, max: 12 }  // Lower frame rate for mobile
           },
           audio: false,
        } : {
          video: { 
             width: { ideal: 240, max: 320 },  // Reduced resolution for performance
             height: { ideal: 180, max: 240 },  // Reduced resolution for performance
            facingMode: 'user',
             frameRate: { ideal: 12, max: 15 }  // Reduced frame rate for performance
           },
           audio: false,
        };
        
        console.log(`[${instanceId}] Requesting camera access with constraints:`, constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log(`[${instanceId}] Camera stream obtained:`, stream);
        console.log(`[${instanceId}] Stream tracks:`, stream.getTracks().map(track => ({ kind: track.kind, enabled: track.enabled, readyState: track.readyState })));
        videoElement.srcObject = stream;
        
        // Ensure video element is ready
        videoElement.onloadedmetadata = async () => {
          try {
            await videoElement.play();
            console.log("Camera setup successful, video playing");
            toast({
              title: "Camera Active",
              description: "Camera is now capturing for face tracking.",
              variant: "default",
            });
          } catch (playError) {
            console.error("Failed to play video:", playError);
          }
        };
        
      } catch (error) {
        console.error("Failed to get user media", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown camera error";
        toast({
            title: "Camera Error",
            description: `Camera access failed: ${errorMessage}. Please allow camera permissions and refresh.`,
            variant: "destructive",
        });
      }
    };

    const onResults = (results: any) => {
      if (!currentVrm.current || !isCameraEnabled) return;
      
      // Debug logging for MediaPipe results
      
      animateVRM(currentVrm.current, results);
    };
    
    setupCamera();
    
    // Check if Holistic constructor is available
    console.log(`[${instanceId}] Initializing MediaPipe Holistic...`);
    let HolisticConstructor = (window as any).Holistic;
    if (!HolisticConstructor) {
        console.error(`[${instanceId}] Holistic constructor not found on window object.`);
        console.log(`[${instanceId}] Available window properties:`, Object.keys(window).filter(key => key.toLowerCase().includes('holistic')));
        
        if (isHolisticLoaded) {
            toast({
                title: "Initialization Error",
                description: "Face tracking library loaded but could not be initialized. Please refresh the page.",
                variant: "destructive",
            });
        }
        return () => {
            const stream = videoElement.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
        };
    }
    console.log(`[${instanceId}] Holistic constructor found, creating instance...`);
    // Handle cases where the library might be nested under a .default property
    if (typeof HolisticConstructor.default === 'function') {
        HolisticConstructor = HolisticConstructor.default;
    }

    try {
        console.log(`[${instanceId}] Creating Holistic instance...`);
        holistic = new HolisticConstructor({
            locateFile: (file: string) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${file}`;
            },
        });
        console.log(`[${instanceId}] Holistic instance created successfully`);
        
        holistic.setOptions({
             modelComplexity: 2,  // Maximum complexity for better pose detection
             smoothLandmarks: true,  // Enable smoothing for more fluid tracking
             minDetectionConfidence: 0.2,  // Balanced threshold for better detection
             minTrackingConfidence: 0.2,  // Balanced threshold for better tracking
             refineFaceLandmarks: true,  // Enable for full eye/lip tracking
             enableSegmentation: false,  // Disable segmentation for better performance
             // Hand tracking options
             staticImageMode: false,  // Enable real-time tracking
             maxNumHands: 2,  // Track both hands
             minHandDetectionConfidence: 0.3,  // Lowered threshold for better hand detection
             minHandTrackingConfidence: 0.3,  // Lowered threshold for better hand tracking
        });
        
        holistic.onResults(onResults);
        
        // Optimized MediaPipe processing for better responsiveness
        let frameCount = 0;
        const sendToHolistic = async () => {
            if (videoElement.readyState >= 2) {
                // Process every frame for maximum responsiveness (was every 2nd frame)
                await holistic.send({ image: videoElement });
                frameCount++;
            }
            holisticFrameId = requestAnimationFrame(sendToHolistic);
        };

        const loadedDataHandler = () => {
            sendToHolistic();
        };
        videoElement.addEventListener("loadeddata", loadedDataHandler);

        return () => {
            cancelAnimationFrame(holisticFrameId);
            holistic?.close();
            const stream = videoElement.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
            videoElement.removeEventListener("loadeddata", loadedDataHandler);
        };
    } catch (error) {
        console.error("Failed to initialize face tracking:", error);
        toast({
            title: "Face Tracking Disabled",
            description: "VRM model will load without face tracking. Camera access may have failed.",
            variant: "default",
        });
        
        // Return cleanup function for camera only
        return () => {
            const stream = videoElement.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
        };
    }
  }, [isCameraEnabled, toast, isHolisticLoaded]);

  // Keyboard event handler for animations and facial expressions
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!currentVrm.current) return;
      
      const key = event.key.toLowerCase();
      
      // Set the pressed key for remote synchronization
      pressedKeyRef.current = key;
      
      // Gesture animations
      if (key === 'q') {
        performGreeting(currentVrm.current);
      } else if (key === 'w') {
        performBigWave(currentVrm.current);
      } else if (key === 'o') {
        performBow(currentVrm.current);
      }
      
      // Facial expressions
      else if (key === 'd' || key === '1') {
        performWink(currentVrm.current);
      } else if (key === 'f' || key === '2') {
        performSurprised(currentVrm.current);
      } else if (key === 'g' || key === '3') {
        performConfused(currentVrm.current);
      } else if (key === 'h' || key === '4') {
        performExcited(currentVrm.current);
      }
      
      // Dance moves
      else if (key === 'j') {
        performHeadBob(currentVrm.current);
      } else if (key === 'k') {
        performShoulderShimmy(currentVrm.current);
      } else if (key === 'l') {
        performHipSway(currentVrm.current);
      }
      
      // Secret VRM switching with Delete key
      else if (key === 'delete') {
        console.log(`🔐 SECRET_VRM [${instanceId}] Switching to Secret VRM`);
        const secretModel = AVAILABLE_MODELS.find(model => model.id === 'secret');
        if (secretModel && onModelChange) {
          onModelChange(secretModel.url);
        }
      }
      
      // Sitting/Standing toggle - DISABLED
      // else if (key === 's') {
      //   setIsSitting(!isSitting);
      //   console.log(`[${instanceId}] Toggled sitting mode:`, !isSitting);
      // }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Handle sitting/standing state changes - DISABLED
  // useEffect(() => {
  //   if (!currentVrm.current) return;
  //   
  //   if (isSitting) {
  //     performSitting(currentVrm.current);
  //   } else {
  //     performStanding(currentVrm.current);
  //   }
  // }, [isSitting]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Prevent multiple instances from running simultaneously
    activeInstanceCount++;
    console.log(`[${instanceId}] Initializing scene... (Active instances: ${activeInstanceCount})`);
    
    // If there are too many instances, skip this one
    if (activeInstanceCount > 1) {
      console.log(`[${instanceId}] Too many instances, skipping...`);
      activeInstanceCount--;
      return;
    }
    
    const initializeScene = async () => {

    const scene = new THREE.Scene();
    sceneRef.current = scene; // Store scene reference
    // No background - transparent scene
    // Optimized camera for performance - BETTER POSITIONING FOR DUAL AVATARS
    const camera = new THREE.PerspectiveCamera(35.0, mount.clientWidth / mount.clientHeight, 0.1, 100.0); // Increased far plane
    cameraRef.current = camera; // Store camera reference
    
    if (isDualAvatar) {
      if (callMode === 'normal-video') {
        // Camera positioned to frame big remote avatar + small local avatar
        camera.position.set(0.0, 1.0, 2.8); // Centered view for single avatar mode
      } else {
        // Camera positioned to frame both avatars side by side
        camera.position.set(0.0, 1.8, 3.5); // Higher and further back to see both avatars better
      }
    } else {
      // Camera positioned to face single avatar
      camera.position.set(0.0, 1.0, 2.5); // Better positioned to face the avatar
    }
    
    // Debug camera setup
    console.log(`[${instanceId}] Camera position:`, camera.position);
    console.log(`[${instanceId}] Camera FOV:`, camera.fov);
    console.log(`[${instanceId}] Mount dimensions:`, { width: mount.clientWidth, height: mount.clientHeight });

     // Mobile-optimized renderer
    const renderer = new THREE.WebGLRenderer({ 
       antialias: !isMobile,        // Disable antialiasing on mobile
      alpha: true,
       powerPreference: isMobile ? "low-power" : "high-performance",
       precision: isMobile ? "lowp" : "mediump",    // Lower precision on mobile
       logarithmicDepthBuffer: false  // Disable for better performance
    });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
     renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.0) : Math.min(window.devicePixelRatio, 1.5)); // Cap pixel ratio more aggressively on mobile
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Enable shadows only on desktop for performance
    if (!isMobile) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    mount.appendChild(renderer.domElement);
    
    // Store renderer reference in scene for external access
    if (sceneRef.current) {
      sceneRef.current.userData.renderer = renderer;
    }

    // Mobile-optimized controls with rotation limits
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.target.set(0.0, 0.8, 0.0); // Target avatar center position
    controls.enableDamping = true; // Enable damping for smooth movement
    controls.dampingFactor = isMobile ? 0.1 : 0.05; // More damping on mobile
    controls.enableZoom = true; // ENABLE zoom
    controls.enablePan = true;
    controls.enableRotate = true;
    
    // Limit camera rotation to 20° up, 20° down and 45° horizontal
    controls.minPolarAngle = Math.PI / 2 - Math.PI / 9; // 70 degrees from top (20° down from horizontal)
    controls.maxPolarAngle = Math.PI / 2 + Math.PI / 9; // 110 degrees from top (20° up from horizontal)
    controls.minAzimuthAngle = -Math.PI / 4; // -45 degrees left
    controls.maxAzimuthAngle = Math.PI / 4; // 45 degrees right
    
    controls.minDistance = isMobile ? 1.5 : 0.5; // Closer minimum distance on mobile
    controls.maxDistance = isMobile ? 8.0 : 50.0; // Closer maximum distance on mobile
    controls.update();
    
    // Debug controls setup
    console.log(`[${instanceId}] Controls target:`, controls.target);
    console.log(`[${instanceId}] Controls enabled:`, { zoom: controls.enableZoom, pan: controls.enablePan, rotate: controls.enableRotate });
    console.log(`[${instanceId}] Rotation limits:`, {
      polarAngle: `${Math.round(controls.minPolarAngle * 180 / Math.PI)}° to ${Math.round(controls.maxPolarAngle * 180 / Math.PI)}° (20° up, 20° down)`,
      azimuthAngle: `${Math.round(controls.minAzimuthAngle * 180 / Math.PI)}° to ${Math.round(controls.maxAzimuthAngle * 180 / Math.PI)}° (45° horizontal range)`
    });

      // Enhanced lighting setup for better material rendering
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

       // Enhanced directional light with shadows
       const light = new THREE.DirectionalLight(0xffffff, 0.8);
       light.position.set(2.0, 2.0, 2.0).normalize();
       light.castShadow = true; // Enable shadows for better depth perception
       light.shadow.mapSize.width = 1024;
       light.shadow.mapSize.height = 1024;
       light.shadow.camera.near = 0.1;
       light.shadow.camera.far = 100; // Match camera far plane
       scene.add(light);

       // Add a simple ground plane for solo mode
       if (!isDualAvatar) {
         const groundGeometry = new THREE.PlaneGeometry(10, 10);
         const groundMaterial = new THREE.MeshLambertMaterial({ 
           color: 0x404040,
           transparent: true,
           opacity: 0.3
         });
         const ground = new THREE.Mesh(groundGeometry, groundMaterial);
         ground.rotation.x = -Math.PI / 2;
         ground.position.y = -1;
         ground.receiveShadow = true;
         scene.add(ground);
         console.log(`[${instanceId}] Added ground plane for solo mode`);
       }

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const clock = new THREE.Clock();
    let animationFrameId: number;
    let lastTime = 0;
    
    // Performance settings - locked to 30fps for better performance
    const TARGET_FPS = 30; // Increased to 30fps for better performance
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    
     // Preload all models for instant switching
     const preloadModels = async (scene: THREE.Scene) => {
       const loader = new GLTFLoader();
       loader.register((parser) => new VRMLoaderPlugin(parser));
       
       for (const model of AVAILABLE_MODELS) {
         try {
           const gltf = await loader.loadAsync(model.url);
           const vrm = gltf.userData.vrm;
           
           // Store model but don't add to scene yet
           loadedModels.current.set(model.url, vrm);
           console.log(`Preloaded: ${model.name}`);
         } catch (error) {
           console.error(`Failed to preload ${model.name}:`, error);
         }
       }
     };
     
     // Set transparent background for video chat
     scene.background = null;
     console.log(`[${instanceId}] Set transparent background for video chat`);
     
     // Start preloading in background
     preloadModels(scene);
     
     // Load initial model
     const urlToLoad = selectedModel || AVAILABLE_MODELS[0].url;
     console.log(`[${instanceId}] isDualAvatar:`, isDualAvatar);
     console.log(`[${instanceId}] urlToLoad:`, urlToLoad);
     
    if (isDualAvatar) {
      console.log(`[${instanceId}] Loading dual VRM models...`);
      console.log(`[${instanceId}] 🔍 State values:`, {
        selectedModel,
        remoteModel,
        selectedType: typeof selectedModel,
        remoteType: typeof remoteModel
      });
      const localUrl = selectedModel || AVAILABLE_MODELS[0].url;
      const remoteUrl = remoteModel || AVAILABLE_MODELS[0].url;
      console.log(`[${instanceId}] 🔧 Final URLs:`, { localUrl, remoteUrl });
      await loadDualVRMModels(localUrl, remoteUrl, scene);
      console.log(`[${instanceId}] Dual VRM models loaded, scene children:`, scene.children.length);
    } else {
       console.log(`[${instanceId}] Loading single VRM model...`);
       await loadVRMModel(urlToLoad, scene);
       console.log(`[${instanceId}] Single VRM model loaded, scene children:`, scene.children.length);
     }
     
     // Final scene state debug
     console.log(`[${instanceId}] Final scene state:`);
     console.log(`[${instanceId}] - Camera position:`, camera.position);
     console.log(`[${instanceId}] - Camera target:`, controls.target);
     console.log(`[${instanceId}] - Scene children count:`, scene.children.length);
     console.log(`[${instanceId}] - Scene environment:`, !!scene.environment);
     console.log(`[${instanceId}] - Scene children:`, scene.children.map(child => child.type));

    let frameCount = 0;
    
    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Precise 30fps frame rate limiting
      if (currentTime - lastTime >= FRAME_INTERVAL) {
        lastTime = currentTime;
        
        const delta = clock.getDelta();
        
        // Update controls - allow free movement
        controls.update();
        
        // Rotate background sphere with camera movement for 180-degree horizontal effect
        if (scene.userData.backgroundSphere) {
          const backgroundSphere = scene.userData.backgroundSphere;
          // Get camera rotation and apply limited rotation to background
          const cameraRotation = camera.rotation.clone();
          
          // Focus on horizontal movement (left-to-right) with reduced sensitivity
          backgroundSphere.rotation.y = -cameraRotation.y * 0.5; // Reduced horizontal sensitivity
          
          // Minimal vertical movement - much less sensitive
          backgroundSphere.rotation.x = -cameraRotation.x * 0.1; // Very reduced vertical sensitivity
        }
        
        // Optimized VRM update - only when needed
        if (currentVrm.current) {
          currentVrm.current.update(delta);
        }
        if (isDualAvatar && remoteVrm.current) {
          remoteVrm.current.update(delta);
        }
        
        // Optimized rendering
        renderer.render(scene, camera);
      }
    };
    animate(0);

    // Debounced resize handler to prevent ResizeObserver loop errors
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        try {
          camera.aspect = mount.clientWidth / mount.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(mount.clientWidth, mount.clientHeight);
        } catch (error) {
          console.warn('Resize error handled:', error);
        }
      }, 16); // ~60fps
    };

    const resizeObserver = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to prevent ResizeObserver loop errors
      requestAnimationFrame(handleResize);
    });
    resizeObserver.observe(mount);
    
    // Return cleanup function for this scene
    return () => {
      activeInstanceCount--;
      console.log(`[${instanceId}] Cleaning up scene... (Active instances: ${activeInstanceCount})`);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimeout);
      
      // Cleanup mobile stabilization intervals
      if ((window as any).mobileStabilizationIntervals) {
        (window as any).mobileStabilizationIntervals.forEach((interval: any) => clearInterval(interval));
        (window as any).mobileStabilizationIntervals.clear();
        console.log(`[${instanceId}] Mobile: Cleaned up stabilization intervals`);
      }
      
      // Cleanup greeting animation
      animationManager.current.cancelAnimation(waveAnimationRef);
      animationManager.current.cancelAnimation(bigWaveAnimationRef);
      animationManager.current.cancelAnimation(bowAnimationRef);
      animationManager.current.cancelAnimation(winkAnimationRef);
      animationManager.current.cancelAnimation(surprisedAnimationRef);
      animationManager.current.cancelAnimation(confusedAnimationRef);
      animationManager.current.cancelAnimation(excitedAnimationRef);
      animationManager.current.cancelAnimation(headBobAnimationRef);
      animationManager.current.cancelAnimation(shoulderShimmyAnimationRef);
      animationManager.current.cancelAnimation(hipSwayAnimationRef);
      resizeObserver.disconnect();
      if(mount.contains(renderer.domElement)){
          mount.removeChild(renderer.domElement);
      }
      if(currentVrm.current) {
        VRMUtils.deepDispose(currentVrm.current.scene);
      }
      renderer.dispose();
      controls.dispose();
    };
  };
    
    // Initialize the scene
    initializeScene();
  }, [selectedModel, toast]);

  // Handle call mode changes without reinitializing the scene
  useEffect(() => {
    console.log(`[${instanceId}] useEffect triggered - callMode:`, callMode, 'isDualAvatar:', isDualAvatar);
    console.log(`[${instanceId}] Avatar refs:`, { 
      hasCurrentVrm: !!currentVrm.current, 
      hasRemoteVrm: !!remoteVrm.current 
    });
    
    // Wait a bit for avatars to load if they're not ready yet
    if (!isDualAvatar || !currentVrm.current || !remoteVrm.current) {
      console.log(`[${instanceId}] Avatars not ready, waiting...`);
      
      // Try again after a short delay
      const timeoutId = setTimeout(() => {
        if (isDualAvatar && currentVrm.current && remoteVrm.current) {
          console.log(`[${instanceId}] Avatars loaded after delay, updating positions`);
          updateAvatarPositions();
        } else {
          console.log(`[${instanceId}] Avatars still not ready after delay`);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
    
    updateAvatarPositions();
    
    function updateAvatarPositions() {
      if (!currentVrm.current || !remoteVrm.current) {
        console.log(`[${instanceId}] Cannot update positions - avatars still null`);
        return;
      }
      
      console.log(`[${instanceId}] Call mode changed to:`, callMode);
      console.log(`[${instanceId}] Current avatar positions before update:`, {
        local: currentVrm.current.scene.position,
        remote: remoteVrm.current.scene.position
      });
      
      // Only update positions if call mode actually changed, not on model changes
      if (callMode === 'normal-video') {
        // Single Avatar Mode: Remote avatar centered (big), Local avatar small (bottom right)
        // Remote avatar (centered, big)
        remoteVrm.current.scene.position.set(0, 0, 0); // Centered
        remoteVrm.current.scene.scale.setScalar(1.2); // Slightly bigger
        
        // Local avatar (small, bottom right)
        currentVrm.current.scene.position.set(0.8, 0, 0.5); // Bottom right, same height as remote
        currentVrm.current.scene.scale.setScalar(0.4); // Much smaller
      } else {
        // Dual Avatar Mode: Side by side - always reset to proper positions
        // Local avatar (left side)
        currentVrm.current.scene.position.set(-0.8, 0.2, 0); // Left side, slightly higher
        currentVrm.current.scene.scale.setScalar(1.0); // Normal size
        
        // Remote avatar (right side)
        remoteVrm.current.scene.position.set(0.8, 0.2, 0); // Right side, slightly higher
        remoteVrm.current.scene.scale.setScalar(1.0); // Normal size
      }
      
      // Also update camera position based on call mode
      if (cameraRef.current) {
        if (callMode === 'normal-video') {
          // Camera positioned to frame big remote avatar + small local avatar
          cameraRef.current.position.set(0.0, 1.0, 2.8); // Centered view for single avatar mode
        } else {
          // Camera positioned to frame both avatars side by side
          cameraRef.current.position.set(0.0, 1.8, 3.5); // Higher and further back to see both avatars better
        }
        cameraRef.current.lookAt(0, 1, 0); // Look at center
        console.log(`[${instanceId}] Camera repositioned for ${callMode} mode:`, cameraRef.current.position);
      }
      
      console.log(`[${instanceId}] Avatar positions updated for ${callMode} mode:`, {
        local: currentVrm.current.scene.position,
        remote: remoteVrm.current.scene.position,
        localScale: currentVrm.current.scene.scale,
        remoteScale: remoteVrm.current.scene.scale
      });
    }
  }, [callMode, isDualAvatar]);

  // Effect to reload VRM when selectedModel changes
  useEffect(() => {
    if (!selectedModel || !sceneRef.current || isLoadingRef.current) {
      return;
    }

    // Check if the model is already loaded
    if (currentVrm.current && currentVrm.current.scene.userData.modelUrl === selectedModel) {
      return;
    }

    console.log(`[${instanceId}] 🎭 ThreeCanvas model changed via props:`, selectedModel);

    console.log(`[${instanceId}] Selected model changed to:`, selectedModel);
    
    // Notify parent component of model change for synchronization
    if (onModelChange && selectedModel !== vrmUrl) {
      console.log(`[${instanceId}] 🔔 Notifying parent of model change:`, selectedModel);
      onModelChange(selectedModel);
    }
    
    // Reload VRM with new selected model
    const reloadVRM = async () => {
      try {
        isLoadingRef.current = true;
        const scene = sceneRef.current;
        if (!scene) {
          console.log(`[${instanceId}] Scene not ready for reload`);
          return;
        }

        console.log(`[${instanceId}] Reloading VRM with:`, selectedModel);
        
        if (isDualAvatar) {
          console.log(`[${instanceId}] 🔍 Reload State values:`, {
            selectedModel,
            remoteModel,
            selectedType: typeof selectedModel,
            remoteType: typeof remoteModel
          });
          const localUrl = selectedModel || AVAILABLE_MODELS[0].url;
          const remoteUrl = remoteModel || AVAILABLE_MODELS[0].url;
          console.log(`[${instanceId}] 🔧 Reload Final URLs:`, { localUrl, remoteUrl });
          await loadDualVRMModels(localUrl, remoteUrl, scene);
        } else {
          await loadVRMModel(selectedModel, scene);
        }
        
        console.log(`[${instanceId}] ✅ VRM reloaded successfully`);
      } catch (error) {
        console.error(`[${instanceId}] Failed to reload VRM:`, error);
      } finally {
        isLoadingRef.current = false;
      }
    };

    reloadVRM();
  }, [selectedModel, isDualAvatar]); // Removed instanceId from dependencies

  // Apply remote avatar data when it changes
  useEffect(() => {
    if (remoteAvatarData) {
      if (isDualAvatar) {
        applyRemoteAvatarDataToRemote(remoteAvatarData);
      } else if (currentVrm.current) {
        applyRemoteAvatarData(currentVrm.current, remoteAvatarData);
      }
    }
  }, [remoteAvatarData, applyRemoteAvatarData, applyRemoteAvatarDataToRemote, isDualAvatar]);

  // Handle remote model changes
  useEffect(() => {
    if (remoteModelUrl && remoteModelUrl !== remoteModel && isDualAvatar) {
      setRemoteModel(remoteModelUrl);
      
      // Reload only the remote VRM with new model
      const reloadRemoteVRM = async () => {
        try {
          isLoadingRef.current = true;
          const scene = sceneRef.current;
          if (!scene) {
            return;
          }

          console.log(`[${instanceId}] 🔄 Loading remote model:`, remoteModelUrl);
          
          // Load the new remote model
          const loader = new GLTFLoader();
          loader.register((parser) => {
            return new VRMLoaderPlugin(parser);
          });

          try {
            const gltf = await loader.loadAsync(remoteModelUrl);
            console.log(`[${instanceId}] ✅ Remote model loaded successfully:`, remoteModelUrl);
            const remoteVrmNew = gltf.userData.vrm;
            
            if (remoteVrmNew) {
              console.log(`[${instanceId}] ✅ Remote VRM created, updating scene...`);
              
              // Store current remote position before removing
              let remotePreviousPosition = { x: 0.6, y: 0, z: 0 };
              let remotePreviousScale = { x: 1, y: 1, z: 1 };
              
              if (remoteVrm.current) {
                remotePreviousPosition = {
                  x: remoteVrm.current.scene.position.x,
                  y: remoteVrm.current.scene.position.y,
                  z: remoteVrm.current.scene.position.z
                };
                remotePreviousScale = {
                  x: remoteVrm.current.scene.scale.x,
                  y: remoteVrm.current.scene.scale.y,
                  z: remoteVrm.current.scene.scale.z
                };
                console.log(`[${instanceId}] Storing remote avatar position for model change:`, remotePreviousPosition);
                scene.remove(remoteVrm.current.scene);
              }
              
              // Add new remote VRM to scene
              remoteVrmNew.scene.userData.modelUrl = remoteModelUrl;
              
              // Preserve previous position or use default based on call mode
              if (callMode === 'normal-video') {
                remoteVrmNew.scene.position.set(0, 0, 0); // Centered
                remoteVrmNew.scene.rotation.y = Math.PI; // Face forward
                remoteVrmNew.scene.scale.setScalar(1.2); // Slightly bigger
              } else {
                // Preserve previous position for dual mode
                console.log(`[${instanceId}] Setting remote avatar position to preserved:`, remotePreviousPosition);
                remoteVrmNew.scene.position.set(remotePreviousPosition.x, remotePreviousPosition.y, remotePreviousPosition.z);
                remoteVrmNew.scene.rotation.y = Math.PI; // Face forward
                remoteVrmNew.scene.scale.set(remotePreviousScale.x, remotePreviousScale.y, remotePreviousScale.z);
              }
              
              console.log(`[${instanceId}] 🔧 Remote model positioned at:`, {
                position: remoteVrmNew.scene.position,
                scale: remoteVrmNew.scene.scale,
                isMobile: isMobile,
                devicePixelRatio: window.devicePixelRatio,
                preservedPosition: remotePreviousPosition
              });
              
              scene.add(remoteVrmNew.scene);
              
              // Update reference
              remoteVrm.current = remoteVrmNew;
              
              // Reset to proper standing pose (fixes T-pose issue)
              resetVRMToStandingPose(remoteVrmNew, instanceId);
              
              console.log(`[${instanceId}] ✅ Remote VRM updated successfully`);
              
              // Force a re-render by updating the selectedModel state (this will trigger a re-render)
              setTimeout(() => {
                setSelectedModel(prev => prev); // This forces a re-render without changing the value
                console.log(`[${instanceId}] 🔄 Forced re-render after remote model change`);
              }, 100);
            } else {
              console.log(`[${instanceId}] ❌ Failed to create remote VRM from model:`, remoteModelUrl);
            }
          } catch (loadError) {
            console.log(`[${instanceId}] ❌ Failed to load remote model: ${remoteModelUrl}, trying fallback...`);
            
            // Try to load a fallback model that we know exists
            const fallbackModelUrl = '/models/vrm/fem3.vrm'; // Default fallback
            try {
              console.log(`[${instanceId}] 🔄 Loading fallback model:`, fallbackModelUrl);
              const fallbackGltf = await loader.loadAsync(fallbackModelUrl);
              const fallbackVrm = fallbackGltf.userData.vrm;
              
              if (fallbackVrm) {
                // Remove old remote VRM from scene
                if (remoteVrm.current) {
                  scene.remove(remoteVrm.current.scene);
                }
                
                // Add fallback VRM to scene
                fallbackVrm.scene.userData.modelUrl = fallbackModelUrl;
                
                // Use the exact same positioning logic as the initial dual avatar setup
                if (callMode === 'normal-video') {
                  fallbackVrm.scene.position.set(0, 0, 0); // Centered
                  fallbackVrm.scene.rotation.y = Math.PI; // Face forward
                  fallbackVrm.scene.scale.setScalar(1.2); // Slightly bigger
                } else {
                  fallbackVrm.scene.position.set(0.6, 0, 0); // Right side for dual mode (same as initial setup)
                  fallbackVrm.scene.rotation.y = Math.PI; // Face forward
                  fallbackVrm.scene.scale.setScalar(1.0); // Normal size
                }
                
                console.log(`[${instanceId}] 🔧 Fallback model positioned at:`, fallbackVrm.scene.position);
                
                scene.add(fallbackVrm.scene);
                remoteVrm.current = fallbackVrm;
                
                console.log(`[${instanceId}] ✅ Fallback remote VRM loaded successfully`);
                
                // Force a re-render for fallback model too
                setTimeout(() => {
                  setSelectedModel(prev => prev); // This forces a re-render without changing the value
                  console.log(`[${instanceId}] 🔄 Forced re-render after fallback model change`);
                }, 100);
              }
            } catch (fallbackError) {
              console.error(`[${instanceId}] ❌ Fallback model also failed:`, fallbackError);
              // Keep the old model if both fail
            }
          }
        } catch (error) {
          console.error(`[${instanceId}] ❌ Failed to reload remote VRM:`, error, 'for model:', remoteModelUrl);
        } finally {
          isLoadingRef.current = false;
        }
      };

      reloadRemoteVRM();
    }
  }, [remoteModelUrl, remoteModel, isDualAvatar, callMode, instanceId]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing three-canvas-container">
        {/* Hide Next.js logo and development indicators */}
        <style jsx global>{`
          /* Hide Next.js development logo */
          [data-nextjs-scroll-focus-boundary],
          .__nextjs_original-stack-frames,
          [data-nextjs-dialog-overlay],
          [data-nextjs-dialog],
          [data-nextjs-toast],
          [data-nextjs-portal],
          [data-nextjs-portal-overlay],
          [data-nextjs-portal-backdrop],
          /* Hide any element with Next.js logo or 'N' */
          [class*="nextjs"],
          [id*="nextjs"],
          [data-nextjs],
          /* Hide any circular black elements with white 'N' */
          div[style*="background: black"],
          div[style*="background-color: black"],
          div[style*="background: #000"],
          div[style*="background-color: #000"],
          /* Hide any positioned elements in bottom-left */
          div[style*="position: fixed"][style*="bottom"][style*="left"],
          div[style*="position: absolute"][style*="bottom"][style*="left"]
          {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `}</style>
        <video ref={videoRef} style={{ display: "none" }}></video>
        

        {/* Avatar Labels for Dual Mode */}
        {isDualAvatar && (
          <>
            <div className="absolute top-4 left-4 bg-purple-600/80 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm font-semibold z-10">
              {localAvatarName}
            </div>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-pink-600/80 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-sm font-semibold z-10">
              {remoteAvatarName}
            </div>
          </>
        )}
        
        {/* Greeting Animation Indicator */}
        {isWaving && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-green-500 bg-opacity-80 text-white px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
              👋 Greeting!
            </div>
          </div>
        )}
        
        {/* Big Wave Animation Indicator */}
        {isBigWave && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-orange-500 bg-opacity-80 text-white px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
              🎉 Big Wave!
            </div>
          </div>
        )}
        
        {/* Bow Animation Indicator */}
        {isBowing && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-purple-500 bg-opacity-80 text-white px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
              🙇 Bowing!
            </div>
          </div>
        )}
        
        {/* Wink Animation Indicator */}
        {isWinking && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-blue-500 bg-opacity-80 text-white px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
              😉 Winking!
            </div>
          </div>
        )}
        
        {/* Surprised Animation Indicator */}
        {isSurprised && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-yellow-500 bg-opacity-80 text-white px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
              😲 Surprised!
            </div>
          </div>
        )}
        
        {/* Confused Animation Indicator */}
        {isConfused && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-gray-500 bg-opacity-80 text-white px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
              🤔 Confused!
            </div>
          </div>
        )}
        
        {/* Excited Animation Indicator */}
        {isExcited && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-pink-500 bg-opacity-80 text-white px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
              🤩 Excited!
            </div>
          </div>
        )}
        
        {/* Head Bob Dance Indicator */}
        {isHeadBob && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-cyan-500 bg-opacity-80 text-white px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
              🎵 Head Bob!
            </div>
          </div>
        )}
        
        {/* Shoulder Shimmy Dance Indicator */}
        {isShoulderShimmy && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-indigo-500 bg-opacity-80 text-white px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
              💃 Shoulder Shimmy!
            </div>
          </div>
        )}
        
        {/* Hip Sway Dance Indicator */}
        {isHipSway && (
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-emerald-500 bg-opacity-80 text-white px-4 py-2 rounded-lg font-semibold text-sm animate-pulse">
              🕺 Hip Sway!
            </div>
          </div>
        )}
        
        {/* Draggable Controls Panel */}
        {showControls && (
          <div 
            className="absolute z-10 cursor-move select-none"
            style={{ left: controlsPosition.x, top: controlsPosition.y }}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            <div className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-xs border border-gray-600">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold">Controls</div>
                <button 
                  onClick={() => setShowControls(false)}
                  className="text-gray-400 hover:text-white text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <div className="mb-1">
                <div>Press <kbd className="bg-gray-600 px-1 rounded">Q</kbd> to greet</div>
                <div>Press <kbd className="bg-gray-600 px-1 rounded">W</kbd> for big wave</div>
                <div>Press <kbd className="bg-gray-600 px-1 rounded">O</kbd> to bow</div>
              </div>
              <div className="font-semibold mb-1">Facial Expressions:</div>
              <div className="mb-1">
                <div>Press <kbd className="bg-gray-600 px-1 rounded">D</kbd> or <kbd className="bg-gray-600 px-1 rounded">1</kbd> to wink</div>
                <div>Press <kbd className="bg-gray-600 px-1 rounded">F</kbd> or <kbd className="bg-gray-600 px-1 rounded">2</kbd> for surprised</div>
                <div>Press <kbd className="bg-gray-600 px-1 rounded">G</kbd> or <kbd className="bg-gray-600 px-1 rounded">3</kbd> for confused</div>
                <div>Press <kbd className="bg-gray-600 px-1 rounded">H</kbd> or <kbd className="bg-gray-600 px-1 rounded">4</kbd> for excited</div>
              </div>
              <div className="font-semibold mb-1">Dance Moves:</div>
              <div className="mb-1">
                <div>Press <kbd className="bg-gray-600 px-1 rounded">J</kbd> for head bob</div>
                <div>Press <kbd className="bg-gray-600 px-1 rounded">K</kbd> for shoulder shimmy</div>
                <div>Press <kbd className="bg-gray-600 px-1 rounded">L</kbd> for hip sway</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Landscape Background Toggle Button */}
        <div className="absolute top-48 right-4 z-10">
          <button
            onClick={toggleLandscapeBackground}
            className={`w-10 h-10 rounded-lg text-lg transition-all duration-200 flex items-center justify-center ${
              isLandscapeBackgroundEnabled 
                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-gray-200'
            }`}
          >
            🌅
          </button>
        </div>
        
        


      </div>
    </div>
  );
};

export default ThreeCanvas;
