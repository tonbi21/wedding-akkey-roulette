import { useEffect } from "react";
import type { Keychain } from "../gameTypes";
import { PRIZES } from "../prizes";
import { RouletteImage } from "./RouletteImage";

type HistoryDialogProps = {
  winners: Keychain[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  hideTrigger?: boolean;
};

const getWinnerTone = (winner: Keychain): "green" | "orange" => {
  const keychainNumber = Number.parseInt(winner.id.replace("keychain-", ""), 10);
  return keychainNumber <= 24 ? "green" : "orange";
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
              <h2 className="history-dialog__title">RESULTS</h2>
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
              {winners.map((winner, index) => {
                const prize = PRIZES[index];

                return (
                  <div className="history-dialog__item" key={winner.id}>
                    <p className={`history-dialog__round history-dialog__round--${getWinnerTone(winner)}`}>
                      ROUND {String(index + 1).padStart(2, "0")}
                    </p>
                    <div className="history-dialog__keychain">
                      <RouletteImage
                        alt={`${index + 1}回目の当選画像`}
                        className="history-dialog__image"
                        keychain={winner}
                      />
                    </div>
                    <img alt={`${prize.name}の景品`} className="history-dialog__prize-placeholder" src={prize.imageSrc} />
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
