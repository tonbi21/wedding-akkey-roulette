"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Keychain } from "../gameTypes";
import { BALLPIT_SETTINGS } from "../ballpit/settings";

type Props = { count: number; images: Keychain[] };

export function Ballpit({ count, images }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const selected = useMemo(() => images.slice(0, count), [images, count]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof WebGL2RenderingContext === "undefined") return;
    const abort = new AbortController();
    let dispose: (() => void) | undefined;
    setReady(false);
    void import("../ballpit/createBallpit").then(async ({ createBallpit }) => {
      if (abort.signal.aborted) return;
      const controller = await createBallpit(canvas, selected, abort.signal, () => setReady(false));
      if (abort.signal.aborted) controller.dispose();
      else { dispose = controller.dispose; setReady(true); }
    }).catch(() => {
      // This decorative enhancement must never block the actual draw.
      if (!abort.signal.aborted) setReady(false);
    });
    return () => { abort.abort(); dispose?.(); };
  }, [selected]);

  return (
    <div className="ballpit-background" aria-hidden="true" data-renderer={ready ? "webgl" : "fallback"}>
      <div className="ballpit-fallback">
        {selected.map((image, index) => (
          <div className="ballpit-capsule" key={image.id} style={{
            "--capsule-x": `${5 + ((index * 37) % 90)}%`,
            "--capsule-y": `${5 + ((index * 23) % 90)}%`,
            "--capsule-size": `${(58 + index % 5 * 8) * BALLPIT_SETTINGS.capsuleScale}px`,
            "--capsule-turn": `${(index % 7 - 3) * 3}deg`
          } as CSSProperties}>
            <img src={image.imageSrc} alt="" draggable={false} />
          </div>
        ))}
      </div>
      <canvas ref={canvasRef} className="ballpit-canvas" />
    </div>
  );
}
