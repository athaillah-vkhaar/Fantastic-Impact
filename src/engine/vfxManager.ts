import * as THREE from 'three';
import { ElementType, ElementalReactionType } from '../types/game';

interface Particle {
  mesh: THREE.Mesh | THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  scaleGrowth: number;
  color?: THREE.Color;
}

export class VFXManager {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private slashMeshes: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];
  private ringMeshes: { mesh: THREE.Mesh; life: number; maxLife: number; growRate: number }[] = [];

  // Cached Geometries & Materials
  private sphereGeom = new THREE.SphereGeometry(0.12, 6, 6);
  private boxGeom = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  private ringGeom = new THREE.RingGeometry(0.2, 0.4, 24);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public update(dt: number) {
    // Update individual particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 3.5 * dt; // slight gravity

      const progress = p.life / p.maxLife;
      const s = THREE.MathUtils.lerp(1, p.scaleGrowth, 1 - progress);
      p.mesh.scale.setScalar(s);

      const mat = (p.mesh as THREE.Mesh).material as THREE.Material;
      if (mat && 'opacity' in mat) {
        (mat as any).opacity = Math.max(0, progress);
      }
    }

    // Update slash arcs
    for (let i = this.slashMeshes.length - 1; i >= 0; i--) {
      const s = this.slashMeshes[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.slashMeshes.splice(i, 1);
        continue;
      }
      const progress = s.life / s.maxLife;
      s.mesh.scale.multiplyScalar(1 + dt * 2);
      const mat = s.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = progress;
    }

    // Update shockwave rings
    for (let i = this.ringMeshes.length - 1; i >= 0; i--) {
      const r = this.ringMeshes[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        this.ringMeshes.splice(i, 1);
        continue;
      }
      const progress = r.life / r.maxLife;
      r.mesh.scale.addScalar(r.growRate * dt);
      const mat = r.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = progress * 0.9;
    }
  }

  public spawnSlash(position: THREE.Vector3, rotationY: number, element: ElementType) {
    let color = 0xffffff;
    if (element === 'EMBER') color = 0xff4500;
    else if (element === 'AQUA') color = 0x00d2ff;
    else if (element === 'VOLT') color = 0xbf00ff;

    const arcGeom = new THREE.TorusGeometry(1.2, 0.08, 6, 18, Math.PI * 0.8);
    const arcMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const arcMesh = new THREE.Mesh(arcGeom, arcMat);
    arcMesh.position.copy(position).add(new THREE.Vector3(0, 1.0, 0));
    arcMesh.rotation.y = rotationY;
    arcMesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;

    this.scene.add(arcMesh);
    this.slashMeshes.push({ mesh: arcMesh, life: 0.22, maxLife: 0.22 });

    // Spawn sparks along arc
    for (let i = 0; i < 8; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const spark = new THREE.Mesh(this.boxGeom, sparkMat);
      spark.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 1.0 + Math.random() * 0.5, (Math.random() - 0.5) * 1.5));
      const vel = new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5 + 1, (Math.random() - 0.5) * 6);
      this.scene.add(spark);
      this.particles.push({ mesh: spark, velocity: vel, life: 0.35, maxLife: 0.35, scaleGrowth: 0.2 });
    }
  }

  public spawnElementalSkillVFX(position: THREE.Vector3, element: ElementType) {
    if (element === 'EMBER') {
      // Fire ring and burst
      this.spawnRing(position, 0xff3700, 15, 0.6);
      for (let i = 0; i < 25; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff4500 : 0xffea00, transparent: true, opacity: 1 });
        const p = new THREE.Mesh(this.sphereGeom, mat);
        p.position.copy(position).add(new THREE.Vector3(0, 0.5, 0));
        const angle = (i / 25) * Math.PI * 2;
        const speed = 4 + Math.random() * 6;
        const vel = new THREE.Vector3(Math.cos(angle) * speed, Math.random() * 6 + 2, Math.sin(angle) * speed);
        this.scene.add(p);
        this.particles.push({ mesh: p, velocity: vel, life: 0.6, maxLife: 0.6, scaleGrowth: 2.0 });
      }
    } else if (element === 'AQUA') {
      // Swirling Water Vortex
      this.spawnRing(position, 0x00ffff, 12, 0.7);
      for (let i = 0; i < 30; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0x00b4d8, transparent: true, opacity: 0.85 });
        const p = new THREE.Mesh(this.sphereGeom, mat);
        p.position.copy(position).add(new THREE.Vector3(0, 0.2, 0));
        const angle = (i / 30) * Math.PI * 2;
        const vel = new THREE.Vector3(Math.cos(angle) * 5 - Math.sin(angle) * 3, Math.random() * 7 + 3, Math.sin(angle) * 5 + Math.cos(angle) * 3);
        this.scene.add(p);
        this.particles.push({ mesh: p, velocity: vel, life: 0.7, maxLife: 0.7, scaleGrowth: 1.5 });
      }
    } else if (element === 'VOLT') {
      // Ground lightning impact & crackles
      this.spawnRing(position, 0x8a2be2, 20, 0.4);
      for (let i = 0; i < 20; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 1 });
        const p = new THREE.Mesh(this.boxGeom, mat);
        p.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 2, 0.2, (Math.random() - 0.5) * 2));
        const vel = new THREE.Vector3((Math.random() - 0.5) * 12, Math.random() * 8 + 2, (Math.random() - 0.5) * 12);
        this.scene.add(p);
        this.particles.push({ mesh: p, velocity: vel, life: 0.4, maxLife: 0.4, scaleGrowth: 0.5 });
      }
    }
  }

  public spawnBurstCinematicVFX(position: THREE.Vector3, element: ElementType) {
    if (element === 'EMBER') {
      // Phoenix Break: Massive explosion + 3 rings
      this.spawnRing(position, 0xff2200, 25, 0.8);
      this.spawnRing(position, 0xffaa00, 18, 0.6);
      for (let i = 0; i < 60; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 1 });
        const p = new THREE.Mesh(this.sphereGeom, mat);
        p.position.copy(position).add(new THREE.Vector3(0, 1, 0));
        const vel = new THREE.Vector3((Math.random() - 0.5) * 16, Math.random() * 14 + 2, (Math.random() - 0.5) * 16);
        this.scene.add(p);
        this.particles.push({ mesh: p, velocity: vel, life: 1.0, maxLife: 1.0, scaleGrowth: 3.0 });
      }
    } else if (element === 'AQUA') {
      // Ocean Crown: Majestic rising water pillars
      this.spawnRing(position, 0x00f5d4, 18, 1.2);
      for (let i = 0; i < 50; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0x00bbf9, transparent: true, opacity: 0.8 });
        const p = new THREE.Mesh(this.sphereGeom, mat);
        p.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 4, 0.2, (Math.random() - 0.5) * 4));
        const vel = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 12 + 6, (Math.random() - 0.5) * 4);
        this.scene.add(p);
        this.particles.push({ mesh: p, velocity: vel, life: 1.2, maxLife: 1.2, scaleGrowth: 2.2 });
      }
    } else if (element === 'VOLT') {
      // Stormbreaker: Massive lightning beam from skies
      const beamGeom = new THREE.CylinderGeometry(0.5, 1.2, 30, 8);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xfcee09, transparent: true, opacity: 0.95 });
      const beam = new THREE.Mesh(beamGeom, beamMat);
      beam.position.copy(position).add(new THREE.Vector3(0, 15, 0));
      this.scene.add(beam);
      this.slashMeshes.push({ mesh: beam, life: 0.45, maxLife: 0.45 });

      this.spawnRing(position, 0x9b5de5, 30, 0.7);
      for (let i = 0; i < 40; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
        const p = new THREE.Mesh(this.boxGeom, mat);
        p.position.copy(position).add(new THREE.Vector3(0, 0.5, 0));
        const vel = new THREE.Vector3((Math.random() - 0.5) * 20, Math.random() * 10 + 3, (Math.random() - 0.5) * 20);
        this.scene.add(p);
        this.particles.push({ mesh: p, velocity: vel, life: 0.5, maxLife: 0.5, scaleGrowth: 0.4 });
      }
    }
  }

  public spawnReactionVFX(position: THREE.Vector3, reaction: ElementalReactionType) {
    if (reaction === 'STEAM BURST') {
      // Scalding steam clouds
      this.spawnRing(position, 0xe0f7fa, 16, 0.6);
      for (let i = 0; i < 30; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
        const p = new THREE.Mesh(this.sphereGeom, mat);
        p.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2));
        const vel = new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 8 + 4, (Math.random() - 0.5) * 6);
        this.scene.add(p);
        this.particles.push({ mesh: p, velocity: vel, life: 0.8, maxLife: 0.8, scaleGrowth: 4.0 });
      }
    } else if (reaction === 'OVERLOAD') {
      // Fiery electric explosion
      this.spawnRing(position, 0xff0055, 24, 0.4);
      for (let i = 0; i < 35; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xff3b30 : 0xaf52de, transparent: true, opacity: 1 });
        const p = new THREE.Mesh(this.sphereGeom, mat);
        p.position.copy(position).add(new THREE.Vector3(0, 1, 0));
        const vel = new THREE.Vector3((Math.random() - 0.5) * 16, Math.random() * 12 + 2, (Math.random() - 0.5) * 16);
        this.scene.add(p);
        this.particles.push({ mesh: p, velocity: vel, life: 0.5, maxLife: 0.5, scaleGrowth: 1.5 });
      }
    } else if (reaction === 'ELECTROSHOCK') {
      // Electric arcs
      for (let i = 0; i < 20; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 1 });
        const p = new THREE.Mesh(this.boxGeom, mat);
        p.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 3, 1, (Math.random() - 0.5) * 3));
        const vel = new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 6, (Math.random() - 0.5) * 10);
        this.scene.add(p);
        this.particles.push({ mesh: p, velocity: vel, life: 0.4, maxLife: 0.4, scaleGrowth: 0.5 });
      }
    } else if (reaction === 'FREEZE') {
      // Glacial ice shards
      for (let i = 0; i < 20; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xb3e5fc, transparent: true, opacity: 0.9 });
        const p = new THREE.Mesh(this.boxGeom, mat);
        p.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 2, 0.5, (Math.random() - 0.5) * 2));
        const vel = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 5 + 1, (Math.random() - 0.5) * 4);
        this.scene.add(p);
        this.particles.push({ mesh: p, velocity: vel, life: 0.7, maxLife: 0.7, scaleGrowth: 1.0 });
      }
    }
  }

  public spawnRing(position: THREE.Vector3, color: number, growRate: number, life: number) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(this.ringGeom, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position).add(new THREE.Vector3(0, 0.1, 0));
    this.scene.add(ring);
    this.ringMeshes.push({ mesh: ring, life, maxLife: life, growRate });
  }

  public spawnHitSparks(position: THREE.Vector3, count: number = 6) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 1 });
      const p = new THREE.Mesh(this.boxGeom, mat);
      p.position.copy(position);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6 + 1, (Math.random() - 0.5) * 8);
      this.scene.add(p);
      this.particles.push({ mesh: p, velocity: vel, life: 0.25, maxLife: 0.25, scaleGrowth: 0.2 });
    }
  }
}
