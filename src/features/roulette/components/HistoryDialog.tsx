import { useEffect } from "react";
import type { Keychain } from "../gameTypes";
import { RouletteImage } from "./RouletteImage";

type HistoryDialogProps = {
  winners: Keychain[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  hideTrigger?: boolean;
};

export function HistoryDialog({ winners, open, onOpen, onClose, hideTrigger = false }: HistoryDialogProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  return (
    <>
      {hideTrigger ? null : (
        <button aria-label="当選者" className="history-button" onClick={onOpen} type="button">
          当選者
        </button>
      )}
      {open ? (
        <div className="history-dialog-backdrop" onClick={onClose} role="presentation">
          <section
            aria-label="当選者"
            aria-modal="true"
            className="history-dialog history-dialog--expanded"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="history-dialog__heading">
              <h2 className="history-dialog__title">当選者</h2>
              <button aria-label="当選者を閉じる" className="history-dialog__close" onClick={onClose} type="button">
                <svg
                  aria-hidden="true"
                  className="history-dialog__close-icon"
                  data-testid="history-close-icon"
                  focusable="false"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="history-dialog__grid">
              {winners.map((winner, index) => (
                <div className="history-dialog__item" key={winner.id}>
                  <p>{index + 1}回目</p>
                  <RouletteImage
                    alt={`${index + 1}回目の当選画像`}
                    className="history-dialog__image history-dialog__image--inset"
                    keychain={winner}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
