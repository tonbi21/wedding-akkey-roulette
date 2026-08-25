type StartButtonProps = {
  onClick: () => void;
};

export function StartButton({ onClick }: StartButtonProps) {
  return (
    <button className="roulette-button roulette-button--primary" onClick={onClick} type="button">
      START
    </button>
  );
}
