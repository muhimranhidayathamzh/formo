export function NotesBanner({ notes }: { notes: string }) {
  return (
    <div className="banner banner-caution preview-notes">
      <strong>Catatan ekstraksi format:</strong> {notes}
    </div>
  );
}
