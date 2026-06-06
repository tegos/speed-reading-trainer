import { useCallback, useEffect, useRef, useState } from 'react';
import Toolbar from './components/Toolbar.jsx';
import ReaderZone from './components/ReaderZone.jsx';
import MarginSlider from './components/MarginSlider.jsx';

const DEFAULT_TEXT = `Lorem ipsum is a pseudo-Latin text used in web design, typography, layout, and printing in place of English to emphasise design elements over content. It's also called placeholder (or filler) text. It's a convenient tool for mock-ups. It helps to outline the visual elements of a document or presentation, eg typography, font, or layout. Lorem ipsum is mostly a part of a Latin text by the classical author and philosopher Cicero. Its words and letters have been changed by addition or removal, so to deliberately render its content nonsensical; it's not genuine, correct, or comprehensible Latin anymore. While lorem ipsum's still resembles classical Latin, it actually has no meaning whatsoever. As Cicero's text doesn't contain the letters K, W, or Z, alien to latin, these, and others are often inserted randomly to mimic the typographic appearence of European languages, as are digraphs not to be found in the original.

In a professional context it often happens that private or corporate clients order a publication to be made and presented with the actual content still not being ready. Think of a news blog that's filled with content hourly on the day of going live. However, reviewers tend to be distracted by comprehensible content, say, a random text copied from a newspaper or the internet. They are likely to focus on the text, disregarding the layout and its elements. Besides, random text risks to be unintendedly humorous or offensive, an unacceptable risk in corporate environments. Lorem ipsum and its many variants have been employed since the early 1960ies, and quite likely since the sixteenth century.`;

const TICK_MS = 250;

export default function App() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [speed, setSpeed] = useState(300); // words per minute
  const [fontSize, setFontSize] = useState(18);
  const [textAlign, setTextAlign] = useState('left');
  const [margins, setMargins] = useState([10, 90]); // percent of viewport width
  const [running, setRunning] = useState(false);
  const [position, setPosition] = useState(0); // words read (float for smooth ticks)
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);

  const words = text.split(/\s+/).filter(Boolean);

  const reset = useCallback(() => {
    setRunning(false);
    setPosition(0);
  }, []);

  const loadText = useCallback((content, failMessage) => {
    if (content && content.trim().length) {
      setText(content);
      setRunning(false);
      setPosition(0);
    } else {
      setError(failMessage);
    }
  }, []);

  // playback timer
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setPosition((pos) => pos + (speed / 60) * (TICK_MS / 1000));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, speed]);

  // stop at the end of the text
  useEffect(() => {
    if (position >= words.length && running) setRunning(false);
  }, [position, words.length, running]);

  // keyboard shortcuts + paste
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
      } else if (e.key === 'F5') {
        e.preventDefault();
        reset();
      }
    };
    const onPaste = (e) => {
      e.preventDefault();
      loadText(e.clipboardData.getData('text'), 'Failed to paste text. Please try again.');
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('paste', onPaste);
    };
  }, [reset, loadText]);

  // error dialog
  useEffect(() => {
    if (error) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [error]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file && file.type.match('text.*')) {
      file.text().then((content) =>
        loadText(content, 'Failed to load file. The file is empty.'),
      );
    } else {
      setError('Failed to load file. Please select a plain text file.');
    }
  };

  return (
    <div className="app">
      <header className="app-bar">
        <h1>Speed Reading Trainer</h1>
      </header>

      <Toolbar
        speed={speed}
        onSpeedChange={setSpeed}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        textAlign={textAlign}
        onTextAlignChange={setTextAlign}
        running={running}
        onToggleRun={() => setRunning((r) => !r)}
        onOpenFile={() => fileInputRef.current?.click()}
        onReset={reset}
      />

      <MarginSlider value={margins} onChange={setMargins} />

      <ReaderZone
        words={words}
        position={Math.floor(position)}
        fontSize={fontSize}
        textAlign={textAlign}
        margins={margins}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="text/plain"
        hidden
        onChange={handleFileChange}
      />

      <dialog ref={dialogRef} className="error-dialog" onClose={() => setError('')}>
        <h2>Error</h2>
        <p>{error}</p>
        <button type="button" onClick={() => setError('')}>OK</button>
      </dialog>
    </div>
  );
}
