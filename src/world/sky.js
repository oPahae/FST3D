import * as THREE from 'three';

/** Realistic daytime sky (v0.7e): Preetham atmosphere with a sun disc + an animated procedural cloud layer. Follows the camera so the horizon never moves. */
export function buildSky(scene, sunDir) {
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: sunDir.clone().normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
    fragmentShader: `
      varying vec3 vD; uniform vec3 uSun;
      void main(){
        vec3 d = normalize(vD);
        float e = clamp(d.y, 0.0, 1.0);
        vec3 zen = vec3(0.10, 0.34, 0.74), mid = vec3(0.34, 0.60, 0.92), hor = vec3(0.80, 0.89, 0.96);
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.22, e));
        col = mix(col, zen, smoothstep(0.18, 0.85, e));
        float s = max(dot(d, uSun), 0.0);
        col += vec3(1.0, 0.86, 0.6) * (pow(s, 6.0) * 0.18 + pow(s, 64.0) * 0.35);
        col = mix(col, vec3(1.0, 0.98, 0.9), smoothstep(0.9993, 0.9998, s));   // sun disc
        if (d.y < 0.0) col = hor;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5800, 32, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -2;
  scene.add(sky);

  const cloudMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, fog: false,
    uniforms: { uTime: { value: 0 }, uSun: { value: sunDir.clone().normalize() } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w * 0.99995; }',
    fragmentShader: `
      varying vec3 vD; uniform float uTime; uniform vec3 uSun;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<6;i++){ s+=a*n(p); p=p*2.03+vec2(7.1,3.3); a*=0.5; } return s; }
      void main(){
        vec3 d = normalize(vD);
        if (d.y < 0.02) discard;
        vec2 p = d.xz / (d.y + 0.22) * 1.3 + vec2(uTime * 0.006, uTime * 0.003);
        float c = fbm(p) * 0.85 + fbm(p * 2.7 + 11.0) * 0.25;
        float cov = smoothstep(0.56, 0.78, c);
        float dens = smoothstep(0.5, 1.0, c);
        float fade = smoothstep(0.02, 0.28, d.y);
        float lit = clamp(0.62 + 0.5 * dot(normalize(vec3(uSun.x, 0.0, uSun.z)), normalize(vec3(d.x, 0.0, d.z))) * 0.5 + 0.3 * (1.0 - dens), 0.0, 1.0);
        vec3 col = mix(vec3(0.60, 0.67, 0.78), vec3(1.0, 0.99, 0.96), lit);
        gl_FragColor = vec4(col, cov * fade);
      }`,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(5500, 32, 16), cloudMat); clouds.frustumCulled = false; clouds.renderOrder = -1;
  scene.add(clouds);
  return { update(camera, t) { sky.position.copy(camera.position); clouds.position.copy(camera.position); cloudMat.uniforms.uTime.value = t; }, setVisible(v) { sky.visible = clouds.visible = v; } };
}
