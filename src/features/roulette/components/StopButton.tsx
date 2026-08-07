type StopButtonProps = {
  onClick: () => void;
};

export function StopButton({ onClick }: StopButtonProps) {
  return (
    <button className="roulette-button roulette-button--danger" onClick={onClick} type="button">
      STOP
    </button>
  );
}
