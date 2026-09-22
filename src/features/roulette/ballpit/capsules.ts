import { Group, Mesh, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, Texture } from "three";
import type { Keychain } from "../gameTypes";

export function createCapsules(images: Keychain[], textures: Texture[]) {
  const geometry = new SphereGeometry(1, 32, 24);
  // A thin transparent shell with Fresnel rims and soft studio reflections.
  // The artwork lives at the sphere's center, not stretched over its surface.
  const glass = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = -viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec3 n = normalize(vNormal);
        float facing = max(dot(n, normalize(vView)), 0.0);
        float rim = pow(1.0 - facing, 2.8);
        float highlight = pow(max(dot(n, normalize(vec3(-0.45, 0.65, 0.62))), 0.0), 48.0);
        float reflection = pow(max(dot(n, normalize(vec3(0.65, -0.3, 0.65))), 0.0), 64.0);
        vec3 tint = mix(vec3(0.74, 0.83, 0.87), vec3(1.0), highlight + reflection);
        float alpha = 0.018 + rim * 0.5 + highlight * 0.8 + reflection * 0.35;
        gl_FragColor = vec4(tint, min(alpha, 0.88));
      }
    `
  });
  const items = images.map((image, index) => {
    const group = new Group();
    group.name = image.id;
    const shell = new Mesh(geometry, glass);
    const texture = textures[index];
    const artwork = new Sprite(new SpriteMaterial({
      map: texture, transparent: true, depthWrite: false, toneMapped: false
    }));
    const dimensions = texture.image as { width: number; height: number };
    const ratio = dimensions.width / dimensions.height;
    artwork.scale.set(1.38 * ratio, 1.38, 1);
    artwork.material.rotation = (index % 7 - 3) * 0.035;
    shell.renderOrder = 1;
    group.add(artwork, shell);
    return { group, shell, artwork };
  });
  return {
    items,
    dispose() {
      items.forEach(({ artwork }) => { artwork.material.map?.dispose(); artwork.material.dispose(); });
      geometry.dispose();
      glass.dispose();
    }
  };
}
