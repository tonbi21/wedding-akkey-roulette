import type { Keychain } from "../gameTypes";
import { RouletteImage } from "./RouletteImage";

type HistoryDialogProps = {
  winners: Keychain[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export function HistoryDialog({ winners, open, onOpen, onClose }: HistoryDialogProps) {
  return (
    <>
      <button aria-label="History" className="history-button" onClick={onOpen} type="button">
        🏆 {winners.length}
      </button>
      {open ? (
        <section aria-label="履歴 / History" className="history-dialog" role="dialog">
          <div className="history-dialog__heading">
            <h2 className="history-dialog__title">履歴 / History</h2>
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
      ) : null}
    </>
  );
}
