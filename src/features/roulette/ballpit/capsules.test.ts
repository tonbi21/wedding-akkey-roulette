import { Texture } from "three";
import { describe, expect, it, vi } from "vitest";
import { KEYCHAINS } from "../keychains";
import { createCapsules } from "./capsules";

describe("transparent keychain capsules", () => {
  it("puts one distinct, uncropped image inside each of the 37 transparent spheres", () => {
    const textures = KEYCHAINS.map(() => new Texture({ width: 256, height: 307 }));
    const capsules = createCapsules(KEYCHAINS, textures);
    expect(capsules.items).toHaveLength(37);
    expect(new Set(capsules.items.map((item) => item.group.name)).size).toBe(37);
    capsules.items.forEach(({ shell, artwork, group }, index) => {
      expect(group.name).toBe(KEYCHAINS[index].id);
      expect(shell.geometry.type).toBe("SphereGeometry");
      expect(shell.material.transparent).toBe(true);
      expect(shell.material.depthWrite).toBe(false);
      expect(artwork.material.map).toBe(textures[index]);
      expect(artwork.scale.x / artwork.scale.y).toBeCloseTo(256 / 307);
      expect(Math.hypot(artwork.scale.x / 2, artwork.scale.y / 2)).toBeLessThan(1);
      expect(artwork.position.length()).toBeLessThan(1);
    });
    capsules.dispose();
  });

  it("releases all image textures and materials on teardown", () => {
    const textures = KEYCHAINS.map(() => new Texture({ width: 256, height: 307 }));
    const released = textures.map((texture) => vi.spyOn(texture, "dispose"));
    const capsules = createCapsules(KEYCHAINS, textures);
    const geometry = vi.spyOn(capsules.items[0].shell.geometry, "dispose");
    capsules.dispose();
    expect(released.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    expect(geometry).toHaveBeenCalledOnce();
  });
});
