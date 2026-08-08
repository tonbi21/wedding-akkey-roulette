import { useEffect } from "react";
import type { Keychain } from "../gameTypes";
import { RouletteImage } from "./RouletteImage";

type HistoryDialogProps = {
  winners: Keychain[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export function HistoryDialog({ winners, open, onOpen, onClose }: HistoryDialogProps) {
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
      <button aria-label="履歴" className="history-button" onClick={onOpen} type="button">
        履歴
      </button>
      {open ? (
        <div className="history-dialog-backdrop" onClick={onClose} role="presentation">
          <section
            aria-label="履歴"
            aria-modal="true"
            className="history-dialog history-dialog--expanded"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="history-dialog__heading">
              <h2 className="history-dialog__title">履歴</h2>
              <button aria-label="Close history" onClick={onClose} type="button">×</button>
            </div>
            <div className="history-dialog__grid">
              {winners.map((winner, index) => (
                <div className="history-dialog__item" key={winner.id}>
                  <p>{index + 1}回目</p>
                  <RouletteImage alt={`${index + 1}回目の当選画像`} className="history-dialog__image" keychain={winner} />
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
