import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ServiceWorkerRegistrar from "./ServiceWorkerRegistrar";

describe("ServiceWorkerRegistrar", () => {
  it("does not register a service worker outside production", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register, getRegistrations: vi.fn().mockResolvedValue([]) }
    });

    render(<ServiceWorkerRegistrar />);

    expect(register).not.toHaveBeenCalled();
  });
});
