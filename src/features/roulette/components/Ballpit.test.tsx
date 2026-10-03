import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KEYCHAINS } from "../keychains";
import { Ballpit } from "./Ballpit";

describe("Ballpit background", () => {
  it("enlarges fallback capsules along with the 3D capsules", () => {
    const { container } = render(<Ballpit count={KEYCHAINS.length} images={KEYCHAINS} />);
    const capsules = [...container.querySelectorAll<HTMLElement>(".ballpit-capsule")];
    expect(capsules[0].style.getPropertyValue("--capsule-size")).toBe("87px");
    expect(capsules[4].style.getPropertyValue("--capsule-size")).toBe("135px");
  });

  it("keeps 37 local image capsules as a decorative fallback when WebGL is unavailable", () => {
    const { container } = render(<Ballpit count={KEYCHAINS.length} images={KEYCHAINS} />);
    expect(container.querySelector(".ballpit-background")).toHaveAttribute("aria-hidden", "true");
    const images = [...container.querySelectorAll("img")];
    expect(images).toHaveLength(37);
    expect(new Set(images.map((image) => image.getAttribute("src"))).size).toBe(37);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
