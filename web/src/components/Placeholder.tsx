import './Placeholder.css';

interface PlaceholderProps {
  title: string;
  note?: string;
}

export function Placeholder({ title, note }: PlaceholderProps) {
  return (
    <div className="panel placeholder">
      <span className="lbl">{title}</span>
      {note && <p className="placeholder-note">{note}</p>}
    </div>
  );
}
