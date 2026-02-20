/**
 * Bone System for 2D Avatar Animation
 * ====================================
 * Hierarchical bone structure where each bone's transform
 * is relative to its parent, enabling natural character animation.
 *
 * Ported from: src/core/bone_system.py
 */

export class Transform {
  constructor(x = 0, y = 0, rotation = 0, sx = 1, sy = 1) {
    this.x = x;
    this.y = y;
    this.rotation = rotation; // degrees
    this.sx = sx;
    this.sy = sy;
  }

  toMatrix() {
    const angle = (this.rotation * Math.PI) / 180;
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    // T @ R @ S  (Translation * Rotation * Scale)
    // [c*sx, -s*sy, x]
    // [s*sx,  c*sy, y]
    // [  0,    0,   1]
    return [
      c * this.sx, -s * this.sy, this.x,
      s * this.sx,  c * this.sy, this.y,
      0,            0,           1,
    ];
  }
}

function matMul(a, b) {
  return [
    a[0]*b[0] + a[1]*b[3] + a[2]*b[6],
    a[0]*b[1] + a[1]*b[4] + a[2]*b[7],
    a[0]*b[2] + a[1]*b[5] + a[2]*b[8],
    a[3]*b[0] + a[4]*b[3] + a[5]*b[6],
    a[3]*b[1] + a[4]*b[4] + a[5]*b[7],
    a[3]*b[2] + a[4]*b[5] + a[5]*b[8],
    a[6]*b[0] + a[7]*b[3] + a[8]*b[6],
    a[6]*b[1] + a[7]*b[4] + a[8]*b[7],
    a[6]*b[2] + a[7]*b[5] + a[8]*b[8],
  ];
}

export class Bone {
  constructor(name, localTransform = null, sprite = null, anchorPoint = [0.5, 0.5]) {
    this.name = name;
    this.local = localTransform || new Transform();
    this.sprite = sprite;         // Image object or null
    this.anchorPoint = anchorPoint; // [0-1, 0-1] pivot
    this.parent = null;
    this.children = [];
    this.visible = true;
  }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  getWorldMatrix() {
    const local = this.local.toMatrix();
    if (!this.parent) return local;
    return matMul(this.parent.getWorldMatrix(), local);
  }

  getWorldPos() {
    const m = this.getWorldMatrix();
    return [m[2], m[5]];
  }

  setPosition(x, y) {
    this.local.x = x;
    this.local.y = y;
  }

  setRotation(angle) {
    this.local.rotation = angle;
  }

  setScale(sx, sy) {
    if (sy === undefined) sy = sx;
    this.local.sx = sx;
    this.local.sy = sy;
  }

  draw(ctx, debug = false) {
    if (this.sprite && this.visible) {
      const worldMat = this.getWorldMatrix();

      // Extract rotation from matrix
      const rotationRad = Math.atan2(worldMat[3], worldMat[0]);

      // Extract scale
      const scaleX = Math.sqrt(worldMat[0] ** 2 + worldMat[3] ** 2);
      const scaleY = Math.sqrt(worldMat[1] ** 2 + worldMat[4] ** 2);

      // World position
      const wx = worldMat[2];
      const wy = worldMat[5];

      const img = this.sprite;
      const sw = img.width * scaleX;
      const sh = img.height * scaleY;

      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(rotationRad);

      // Draw image centered on anchor point
      const anchorX = img.width * this.anchorPoint[0] * scaleX;
      const anchorY = img.height * this.anchorPoint[1] * scaleY;
      ctx.drawImage(img, -anchorX, -anchorY, sw, sh);

      ctx.restore();
    }

    // Debug visualization
    if (debug) {
      const worldPos = this.getWorldPos();
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(worldPos[0], worldPos[1], 5, 0, Math.PI * 2);
      ctx.fill();

      if (this.parent) {
        const parentPos = this.parent.getWorldPos();
        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(parentPos[0], parentPos[1]);
        ctx.lineTo(worldPos[0], worldPos[1]);
        ctx.stroke();
      }

      ctx.fillStyle = "white";
      ctx.font = "12px sans-serif";
      ctx.fillText(this.name, worldPos[0] + 10, worldPos[1] - 5);
    }

    // Draw children
    for (const child of this.children) {
      child.draw(ctx, debug);
    }
  }

  findBone(name) {
    if (this.name === name) return this;
    for (const child of this.children) {
      const result = child.findBone(name);
      if (result) return result;
    }
    return null;
  }
}

export class SpriteVariant {
  constructor(variants, defaultKey = null) {
    this.variants = variants; // { name: Image }
    this.default = defaultKey || Object.keys(variants)[0];
    this.current = this.default;
  }

  setVariant(name) {
    if (name in this.variants) {
      this.current = name;
      return true;
    }
    return false;
  }

  getSprite() {
    return this.variants[this.current];
  }

  reset() {
    this.current = this.default;
  }
}
