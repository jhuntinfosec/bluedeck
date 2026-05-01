import { FormEvent, useMemo, useState } from 'react';
import { Image, Send, X } from 'lucide-react';
import { useDeckStore } from '../store/deckStore';

const maxChars = 300;
const maxImages = 4;

export function Composer() {
  const compose = useDeckStore((state) => state.compose);
  const closeCompose = useDeckStore((state) => state.closeCompose);
  const submitPost = useDeckStore((state) => state.submitPost);
  const busy = useDeckStore((state) => state.busyAction === 'compose');
  const [text, setText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const remaining = maxChars - text.length;
  const preview = useMemo(() => images.map((file) => ({ file, url: URL.createObjectURL(file) })), [images]);
  const invalid = text.trim().length === 0 || remaining < 0 || images.length > maxImages;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    await submitPost(text, images);
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel composer" onSubmit={onSubmit}>
        <header className="modal-header">
          <h2>{compose?.mode === 'reply' ? 'Reply' : compose?.mode === 'quote' ? 'Quote post' : 'New post'}</h2>
          <button type="button" className="icon-button" title="Close" onClick={closeCompose}>
            <X size={17} />
          </button>
        </header>
        {compose?.mode !== 'post' ? <p className="compose-context">@{compose?.item.authorHandle}: {compose?.item.text}</p> : null}
        <textarea value={text} onChange={(event) => setText(event.target.value)} autoFocus />
        <div className="composer-preview">
          {preview.map(({ file, url }) => (
            <img key={file.name + file.lastModified} src={url} alt="" />
          ))}
        </div>
        <footer className="composer-footer">
          <label className="icon-button text-button">
            <Image size={16} />
            Images
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(event) => setImages(Array.from(event.target.files ?? []).slice(0, maxImages))}
            />
          </label>
          <span className={remaining < 0 ? 'error-text' : 'muted'}>{remaining}</span>
          <button className="primary-button" disabled={invalid || busy}>
            <Send size={16} />
            {busy ? 'Posting...' : 'Post'}
          </button>
        </footer>
      </form>
    </div>
  );
}
