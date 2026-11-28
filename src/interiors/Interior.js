import * as THREE from 'three';
import { CollisionWorld } from '../gameplay/CollisionWorld.js';
import { Kit, blobShadow } from './kit.js';

/**
 * One interior world: its own decorative group, its own 2D collision world, its own lights and ambience.
 * Coordinates are local metres; every interior is built around the origin so it never overlaps the campus (it is only visible while active).
 */
export class Interior {
  constructor(id, { name, mats, tex, bg = 0x20242a, hemi = [0xffffff, 0xcfc6b4, 1.6], envIntensity = 0.55, ceilingY = 3.4, camDist = 4.6 }) {
    this.id = id; this.name = name;
    this.mats = mats; this.tex = tex;
    this.kit = new Kit(mats, id);
    this.collision = new CollisionWorld(8);
    this.group = new THREE.Group(); this.group.name = `interior:${id}`;
    this.bg = bg; this.hemi = hemi; this.envIntensity = envIntensity;
    this.ceilingY = ceilingY; this.camDist = camDist;
    this.bounds = { x0: -1e3, x1: 1e3, z0: -1e3, z1: 1e3 };
    this.spawns = [];     // [{x,z,yaw}] by slot
    this.exits = [];      // [{x,z,nx,nz,slot,standOff,doorH,markerScale,label}]
    this.lights = [];
    this.people = [];
    this.updaters = [];
    this.stations = [];   // activities: { x, z, r, label, start(mgr) }
  }

  // ---- collision helpers ---------------------------------------------------------------------------------------------
  solid(x0, z0, x1, z1, tag = 'solid', top = Infinity) {
    this.collision.addPolygon([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], [], tag, top);
  }
  solidC(x, z, r, tag = 'solid') { this.collision.addCircle(x, z, r, tag); }
  /** Rectangular room: walls become collision slabs 1.2 m thick so the follow camera cannot leave the room either. */
  roomWalls(x0, z0, x1, z1, t = 1.2) {
    this.solid(x0 - t, z0 - t, x1 + t, z0, 'wall'); this.solid(x0 - t, z1, x1 + t, z1 + t, 'wall');
    this.solid(x0 - t, z0, x0, z1, 'wall'); this.solid(x1, z0, x1 + t, z1, 'wall');
    this.bounds = { x0: x0 + 0.35, x1: x1 - 0.35, z0: z0 + 0.35, z1: z1 - 0.35 };
  }
  floorSurface(x0, z0, x1, z1, h) { this.collision.addSurface([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], h, 'floor'); }

  // ---- decoration helpers --------------------------------------------------------------------------------------------
  light(color, intensity, x, y, z, dist = 16, decay = 1.6) {
    const l = new THREE.PointLight(color, intensity, dist, decay); l.position.set(x, y, z); this.group.add(l); this.lights.push(l); return l;
  }
  blob(w, d, x, z, y = 0.012, opacity = 0.5) { const m = blobShadow(this.tex.blob, w, d, x, z, y, opacity); this.group.add(m); return m; }
  person(p, x, y, z, yaw) { p.position.set(x, y, z); p.rotation.y = yaw; this.group.add(p); this.people.push(p); return p; }

  /** Textured quad (canvas texture) standing on a wall: faces the direction `yaw` (0 = +Z). */
  picture(texture, w, h, x, y, z, yaw = 0, { emissive = 0.0, rough = 0.6 } = {}) {
    const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: rough, emissive: emissive ? 0xffffff : 0x000000, emissiveMap: emissive ? texture : null, emissiveIntensity: emissive });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = yaw; this.group.add(m); return m;
  }

  ceilingAt() { return this.ceilingY; }

  finalize() {
    this.group.add(this.kit.finish());
    this.collision.finalize();
    return this;
  }
  /** Room-local exit definition: the player stands `standOff` in front of the door when the prompt appears. */
  addExit(x, z, nx, nz, slot, opts = {}) {
    this.exits.push({ x, z, nx, nz, slot, standOff: 0.9, doorH: 2.5, markerScale: 0.8, label: 'Sortir', ...opts });
  }
}
