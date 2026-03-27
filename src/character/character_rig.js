/**
 * Character Rig Builder
 * =====================
 * Complete rigged character from sprite assets using the hierarchical bone system.
 *
 * Ported from: src/character/character_rig.py
 */

import { Bone, Transform, SpriteVariant } from "../core/bone_system.js";

const ASSETS_BASE = "/assets/character";

// Design-space base position (used by canvas rendering)
export const DEFAULT_SCREEN_X = 400;
export const DEFAULT_SCREEN_Y = 420;

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`Image not found: ${path}`);
      // Return a tiny transparent placeholder
      const canvas = document.createElement("canvas");
      canvas.width = 50;
      canvas.height = 50;
      resolve(canvas);
    };
    img.src = path;
  });
}

async function loadAssetVariants(folder, prefix = "") {
  // We need to know the filenames ahead of time since we can't list directories in the browser.
  // These are hardcoded based on the actual asset inventory.
  const variantMap = {
    eyes: [
      "1_center", "1_down", "1_left", "1_leftdown", "1_leftup",
      "1_right", "1_rightdown", "1_rightup", "1_up",
      "2_center", "2_down", "2_left", "2_leftdown", "2_leftup",
      "2_right", "2_rightdown", "2_rightup", "2_up",
      "3_center", "3_down", "3_left", "3_leftdown", "3_leftup",
      "3_right", "3_rightdown", "3_rightup", "3_up",
      "close", "close2", "close3",
    ],
    mouth: ["1", "2", "3", "4", "Sil"],
    hands: [
      "L_hand_curl", "L_hand_fist", "L_hand_high", "L_hand_open", "L_hand_rest",
      "R_hand_curl", "R_hand_fist", "R_hand_high", "R_hand_open", "R_hand_rest",
    ],
    eyebrows: [
      "Stan_Eyebrows0001", "Stan_Eyebrows0002", "Stan_Eyebrows0003",
      "Stan_Eyebrows0004", "Stan_Eyebrows0005", "Stan_Eyebrows0006",
      "Stan_Eyebrows0007", "Stan_Eyebrows0008", "Stan_Eyebrows0009",
      "Stan_Eyebrows0010", "Stan_Eyebrows0011", "Stan_Eyebrows0012",
      "Stan_Eyebrows0013", "Stan_Eyebrows0014", "Stan_Eyebrows0015",
    ],
  };

  const names = variantMap[folder] || [];
  const filtered = prefix ? names.filter((n) => n.startsWith(prefix)) : names;
  const variants = {};

  await Promise.all(
    filtered.map(async (name) => {
      const img = await loadImage(`${ASSETS_BASE}/${folder}/${name}.png`);
      variants[name] = img;
    })
  );

  return variants;
}

export class CharacterRig {
  constructor() {
    this.root = null;
    this.bones = {};
    this.loaded = false;

    // Sprite references
    this.bodySprite = null;
    this.faceSprite = null;
    this.hatSprite = null;
    this.collarSprite = null;
    this.legsSprite = null;
    this.feetSprite = null;
    this.lArmUpperSprite = null;
    this.rArmUpperSprite = null;
    this.lArmForearmSprite = null;
    this.rArmForearmSprite = null;
    this.eyebrowsSprite = null;

    // Variant managers
    this.eyeVariants = null;
    this.mouthVariants = null;
    this.lHandVariants = null;
    this.rHandVariants = null;

    // Animation state
    this.blinkEnabled = true;
    this.lastBlinkTime = performance.now() / 1000;
    this.nextBlinkInterval = 2.0 + Math.random() * 3.0;
    this.isBlinking = false;
    this.blinkStartTime = 0.0;
    this.blinkDuration = 0.15;
    this.blinkEyes = [];
    this.normalEye = "1_center";
  }

  async init() {
    await this._loadAssets();
    this._buildSkeleton();
    this._initAnimationSystems();
    this.loaded = true;
    return this;
  }

  async _loadAssets() {
    // Core body parts
    [
      this.bodySprite,
      this.faceSprite,
      this.hatSprite,
      this.collarSprite,
      this.legsSprite,
      this.feetSprite,
      this.lArmUpperSprite,
      this.rArmUpperSprite,
      this.lArmForearmSprite,
      this.rArmForearmSprite,
      this.eyebrowsSprite,
    ] = await Promise.all([
      loadImage(`${ASSETS_BASE}/body.png`),
      loadImage(`${ASSETS_BASE}/face.png`),
      loadImage(`${ASSETS_BASE}/hat.png`),
      loadImage(`${ASSETS_BASE}/collar.png`),
      loadImage(`${ASSETS_BASE}/legs.png`),
      loadImage(`${ASSETS_BASE}/feet.png`),
      loadImage(`${ASSETS_BASE}/arms/left_upperarm.png`),
      loadImage(`${ASSETS_BASE}/arms/right_upperarm.png`),
      loadImage(`${ASSETS_BASE}/arms/left_forearm.png`),
      loadImage(`${ASSETS_BASE}/arms/right_forearm.png`),
      loadImage(`${ASSETS_BASE}/eyebrows/Stan_Eyebrows0003.png`),
    ]);

    // Load variants
    const [eyeVars, mouthVars, handVars] = await Promise.all([
      loadAssetVariants("eyes"),
      loadAssetVariants("mouth"),
      loadAssetVariants("hands"),
    ]);

    // Eye variants
    this.eyeVariants = new SpriteVariant(eyeVars, "1_center");

    // Mouth variants
    const mouthDefault = "1" in mouthVars ? "1" : Object.keys(mouthVars)[0];
    this.mouthVariants = new SpriteVariant(mouthVars, mouthDefault);

    // Hand variants (split L/R)
    const lHandDict = {};
    const rHandDict = {};
    for (const [k, v] of Object.entries(handVars)) {
      if (k.startsWith("L_")) lHandDict[k] = v;
      if (k.startsWith("R_")) rHandDict[k] = v;
    }
    this.lHandVariants = new SpriteVariant(lHandDict, "L_hand_rest");
    this.rHandVariants = new SpriteVariant(rHandDict, "R_hand_rest");
  }

  _buildSkeleton() {
    // Sprite dimensions (from actual PNGs)
    const bodyW = this.bodySprite.width;   // 219
    const bodyH = this.bodySprite.height;  // 134
    const bodyHalfW = Math.floor(bodyW / 2); // 109
    const faceH = this.faceSprite.height;  // 288
    const legsH = this.legsSprite.height;  // 86
    const lArmUpperH = this.lArmUpperSprite.height; // 71
    const rArmUpperH = this.rArmUpperSprite.height; // 71
    const lForearmH = this.lArmForearmSprite.height; // 62
    const rForearmH = this.rArmForearmSprite.height; // 62

    // --- ROOT ---
    this.root = new Bone("Root", new Transform(400, 450));

    // --- BODY ---
    const body = this.root.addChild(
      new Bone("Body", new Transform(0, 0), null, [0.5, 0.5])
    );

    // --- LEFT ARM: Shoulder -> Elbow -> Hand ---
    const shoulderL = body.addChild(
      new Bone("Shoulder_L",
        new Transform(-bodyHalfW + 14+10, -44, 30),
        this.lArmUpperSprite,
        [0.6, 0.2]
      )
    );
    const elbowL = shoulderL.addChild(
      new Bone("Elbow_L",
        new Transform(4, lArmUpperH - 25, 10),
        this.lArmForearmSprite,
        [0.6, 0.15]
      )
    );
    elbowL.addChild(
      new Bone("Hand_L",
        new Transform(-5, lForearmH - 16),
        this.lHandVariants.getSprite(),
        [0.5, 0.5]
      )
    );

    // --- RIGHT ARM: Shoulder -> Elbow -> Hand ---
    const shoulderR = body.addChild(
      new Bone("Shoulder_R",
        new Transform(bodyHalfW - 18 - 10, -40, -30),
        this.rArmUpperSprite,
        [0.4, 0.2]
      )
    );
    const elbowR = shoulderR.addChild(
      new Bone("Elbow_R",
        new Transform(-4, rArmUpperH - 24, -10),
        this.rArmForearmSprite,
        [0.4, 0.15]
      )
    );
    elbowR.addChild(
      new Bone("Hand_R",
        new Transform(5, rForearmH - 16),
        this.rHandVariants.getSprite(),
        [0.5, 0.5]
      )
    );

    // --- LEGS ---
    const legs = body.addChild(
      new Bone("Legs",
        new Transform(0, Math.floor(bodyH / 2) - 35),
        this.legsSprite,
        [0.5, 0.0]
      )
    );
    legs.addChild(
      new Bone("Feet",
        new Transform(0, legsH - 8),
        this.feetSprite,
        [0.5, 1.0]
      )
    );

    // --- BODY SPRITE ---
    body.addChild(
      new Bone("BodySprite",
        new Transform(0, 0),
        this.bodySprite,
        [0.5, 0.5]
      )
    );

    // --- COLLAR ---
    body.addChild(
      new Bone("Collar",
        new Transform(0, -50),
        this.collarSprite,
        [0.5, 0.5]
      )
    );

    // --- HEAD ---
    const head = body.addChild(
      new Bone("Head",
        new Transform(0, -Math.floor(bodyH / 2) - 100),
        null,
        [0.5, 0.5]
      )
    );

    // --- FACE ---
    const face = head.addChild(
      new Bone("Face",
        new Transform(0, 0),
        this.faceSprite,
        [0.5, 0.5]
      )
    );

    // --- HAT ---
    head.addChild(
      new Bone("Hat",
        new Transform(0, -Math.floor(faceH / 2) + 200),
        this.hatSprite,
        [0.5, 1.0]
      )
    );

    // --- EYES ---
    face.addChild(
      new Bone("Eyes",
        new Transform(0, 18),
        this.eyeVariants.getSprite(),
        [0.5, 0.5]
      )
    );

    // --- EYEBROWS ---
    head.addChild(
      new Bone("Eyebrows",
        new Transform(0, -30),
        this.eyebrowsSprite,
        [0.5, 0.5]
      )
    );

    // --- MOUTH ---
    face.addChild(
      new Bone("Mouth",
        new Transform(0, 100),
        this.mouthVariants.getSprite(),
        [0.5, 0.5]
      )
    );

    // Cache bone references
    this._cacheBones();
  }

  _cacheBones() {
    const addToCache = (bone) => {
      this.bones[bone.name] = bone;
      for (const child of bone.children) {
        addToCache(child);
      }
    };
    addToCache(this.root);
  }

  _initAnimationSystems() {
    const allEyeVariants = Object.keys(this.eyeVariants.variants);
    this.blinkEyes = ["close", "close2", "close3"].filter(
      (e) => allEyeVariants.includes(e)
    );
    if (this.blinkEyes.length === 0) {
      this.blinkEyes = allEyeVariants.filter((e) =>
        e.toLowerCase().includes("close")
      );
    }
    if (this.blinkEyes.length === 0) {
      this.blinkEyes = ["1_center"];
    }
    this.normalEye = "1_center";
  }

  // --- Animation Systems ---

  updateBlinkAnimation() {
    if (!this.blinkEnabled) return;

    const currentTime = performance.now() / 1000;

    if (!this.isBlinking) {
      if (currentTime - this.lastBlinkTime >= this.nextBlinkInterval) {
        this.isBlinking = true;
        this.blinkStartTime = currentTime;
        if (this.blinkEyes.length > 0) {
          this.setEyeVariant(
            this.blinkEyes[Math.floor(Math.random() * this.blinkEyes.length)]
          );
        }
      }
    } else {
      if (currentTime - this.blinkStartTime >= this.blinkDuration) {
        this.isBlinking = false;
        this.lastBlinkTime = currentTime;
        this.nextBlinkInterval = 2.0 + Math.random() * 3.0;
        this.setEyeVariant(this.normalEye);
      }
    }
  }

  // --- Public API (matches Python version) ---

  getBone(name) {
    return this.bones[name] || null;
  }

  setScreenPosition(x, y) {
    this.root.setPosition(x, y);
  }

  setBodyScale(scale) {
    const body = this.getBone("Body");
    if (body) body.setScale(scale);
  }

  setHeadRotation(angle) {
    const head = this.getBone("Head");
    if (head) head.setRotation(angle);
  }

  setHeadPositionOffset(x, y) {
    const head = this.getBone("Head");
    if (!head) return;
    const bodyH = this.bodySprite.height;
    const baseY = -Math.floor(bodyH / 2) - 100;
    head.setPosition(x, baseY + y);
  }

  setEyeVariant(variantName) {
    if (this.eyeVariants.setVariant(variantName)) {
      const eyes = this.getBone("Eyes");
      if (eyes) eyes.sprite = this.eyeVariants.getSprite();
    }
  }

  setMouthVariant(variantName) {
    if (this.mouthVariants.setVariant(variantName)) {
      const mouth = this.getBone("Mouth");
      if (mouth) mouth.sprite = this.mouthVariants.getSprite();
    }
  }

  setEyebrowHeight(offsetY) {
    const baseY = -30;
    const eyebrow = this.getBone("Eyebrows");
    if (eyebrow) {
      const currentX = eyebrow.local.x;
      eyebrow.setPosition(currentX, baseY + offsetY);
    }
  }

  setFaceScale(scale) {
    const mouth = this.getBone("Mouth");
    if (mouth) mouth.setScale(scale, scale);
  }

  setArmJointRotation(side, shoulderAngle, elbowAngle) {
    const sideChar = side[0].toUpperCase();
    const shoulder = this.getBone(`Shoulder_${sideChar}`);
    const elbow = this.getBone(`Elbow_${sideChar}`);
    if (shoulder) shoulder.setRotation(shoulderAngle);
    if (elbow) elbow.setRotation(elbowAngle);
  }

  setHandVariant(side, variantName) {
    let handVariants, boneName;
    if (side.toLowerCase() === "left") {
      handVariants = this.lHandVariants;
      boneName = "Hand_L";
    } else if (side.toLowerCase() === "right") {
      handVariants = this.rHandVariants;
      boneName = "Hand_R";
    } else {
      return;
    }

    if (handVariants.setVariant(variantName)) {
      const bone = this.getBone(boneName);
      if (bone) bone.sprite = handVariants.getSprite();
    }
  }

  // --- Reset to default pose ---

  resetToDefault() {
    this.setScreenPosition(DEFAULT_SCREEN_X, DEFAULT_SCREEN_Y);
    this.setBodyScale(1.0);
    this.setHeadPositionOffset(0, 0);
    this.setEyebrowHeight(0);
    this.setFaceScale(1.0);
    // Restore default arm rotations (from skeleton build)
    this.setArmJointRotation("left", 30, 10);
    this.setArmJointRotation("right", -30, -10);
    this.setHandVariant("left", "L_hand_rest");
    this.setHandVariant("right", "R_hand_rest");
    this.setMouthVariant("1");
    const feetBone = this.getBone("Feet");
    if (feetBone) feetBone.setScale(1.0, 1.0);
  }

  // --- Frame Update ---

  update() {
    this.updateBlinkAnimation();
  }

  draw(ctx, debug = false) {
    if (!this.loaded) return;
    this.root.draw(ctx, debug);
  }
}
