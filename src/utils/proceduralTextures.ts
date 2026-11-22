import * as THREE from 'three';
import type { EventTrack } from '../types/festival';

export function createEventCardTexture(
  track: EventTrack,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Deep navy gradient base
    const grad = ctx.createLinearGradient(0, 0, 0, 640);
    grad.addColorStop(0, '#09142f');
    grad.addColorStop(0.55, '#050a1b');
    grad.addColorStop(1, '#0b1026');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 640);

    // Subtle schematic grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 32; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 640);
      ctx.stroke();
    }
    for (let y = 32; y < 640; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Accent border frame
    ctx.strokeStyle = track.accentColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 472, 600);

    // Inner corner brackets
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    const bracket = 28;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(36, 36 + bracket);
    ctx.lineTo(36, 36);
    ctx.lineTo(36 + bracket, 36);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(476 - bracket, 604);
    ctx.lineTo(476, 604);
    ctx.lineTo(476, 604 - bracket);
    ctx.stroke();

    // Central geometric emblem ring
    ctx.save();
    ctx.translate(256, 235);
    ctx.strokeStyle = track.accentColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 86, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 108, 0.3, Math.PI * 1.7);
    ctx.stroke();

    // Geometric emblem glyph
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 52 : 34;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = `${track.accentColor}28`;
    ctx.fill();
    ctx.strokeStyle = track.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Category label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(track.category.toUpperCase(), 256, 395);

    // Main title
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 34px sans-serif';
    ctx.fillText(track.title, 256, 445);

    // Divider line
    ctx.strokeStyle = `${track.accentColor}66`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(96, 478);
    ctx.lineTo(416, 478);
    ctx.stroke();

    // Venue & date
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 20px sans-serif';
    ctx.fillText(`${track.dateLabel}  ·  ${track.venue}`, 256, 520);

    // Format highlight
    ctx.fillStyle = track.accentColor;
    ctx.font = '600 21px sans-serif';
    ctx.fillText(track.prizeOrFormat, 256, 565);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createGridFloorTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#040714';
    ctx.fillRect(0, 0, 512, 512);

    // Sub-grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    // Major border line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 512, 512);

    // Intersection nodes
    ctx.fillStyle = 'rgba(167, 139, 250, 0.45)';
    ctx.fillRect(0, 0, 6, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 70);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    grad.addColorStop(0, 'rgba(2, 6, 20, 0.85)');
    grad.addColorStop(0.5, 'rgba(4, 10, 28, 0.45)');
    grad.addColorStop(1, 'rgba(4, 7, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
