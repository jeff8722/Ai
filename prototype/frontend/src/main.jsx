import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const DEPARTMENTS = [['women', 'Women'], ['men', 'Men'], ['kids', 'Kids']];
const KINDS = [['sarees', 'Sarees'], ['one-pieces', 'Dresses & one-pieces'], ['tops', 'Tops'], ['bottoms', 'Bottoms']];

function App() {
  const [garments, setGarments] = useState([]);
  const [department, setDepartment] = useState('women');
  const [photo, setPhoto] = useState(null); // { file, url }
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null); // object URL of the generated image
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/garments')
      .then(r => r.json())
      .then(setGarments)
      .catch(() => setError('The backend is not running. Start it, then reload this page.'));
  }, []);

  // Object URLs keep the customer's photo in memory; free each one as soon as it is replaced or cleared.
  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo]);
  useEffect(() => () => result && URL.revokeObjectURL(result), [result]);

  function choosePhoto(event) {
    const file = event.target.files[0];
    event.target.value = ''; // lets the same file be chosen again
    if (!file) return;
    setPhoto({ file, url: URL.createObjectURL(file) });
    setResult(null);
    setError('');
  }

  async function generate() {
    setBusy(true);
    setError('');
    setResult(null);
    const body = new FormData();
    body.append('person_image', photo.file);
    body.append('garment_id', picked.id);
    try {
      const response = await fetch('/api/try-on', { method: 'POST', body });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        throw new Error(problem.detail || 'The try-on did not finish. Try again.');
      }
      setResult(URL.createObjectURL(await response.blob()));
    } catch (e) {
      setError(e.message === 'Failed to fetch' ? 'The backend is not running.' : e.message);
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setPhoto(null);
    setPicked(null);
    setResult(null);
    setError('');
  }

  const shown = garments.filter(g => g.department === department);

  return (
    <main>
      <header>
        <h1>VESTIQ</h1>
        <button onClick={startOver} disabled={busy || (!photo && !picked)}>Start over</button>
      </header>

      <section className="stage" aria-label="Your photo">
        <div className="frame">
          {result ? (
            <img src={result} alt={`You wearing the ${picked.name}`} />
          ) : photo ? (
            <img src={photo.url} alt="Your photo" />
          ) : (
            <p>Stand back so your head and feet are in the photo.</p>
          )}
        </div>
        {result && <p className="note">AI preview. Fit, drape and colour can differ from the real garment.</p>}
        <label className="button">
          {photo ? 'Change photo' : 'Take or upload a full-length photo'}
          <input className="visually-hidden" type="file" accept="image/*" onChange={choosePhoto} disabled={busy} />
        </label>
      </section>

      <section aria-label="Garments">
        <h2>Choose a garment</h2>
        <div className="tabs" role="group" aria-label="Department">
          {DEPARTMENTS.map(([id, label]) => (
            <button key={id} aria-pressed={department === id} onClick={() => setDepartment(id)}>{label}</button>
          ))}
        </div>
        {KINDS.map(([kind, label]) => {
          const items = shown.filter(g => g.kind === kind);
          if (!items.length) return null;
          return (
            <div key={kind}>
              <h3>{label}</h3>
              <ul className="grid">
                {items.map(g => (
                  <li key={g.id}>
                    <button className="garment" aria-pressed={picked?.id === g.id} onClick={() => setPicked(g)} disabled={busy}>
                      <img src={g.image} alt="" loading="lazy" />
                      <span>{g.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {garments.length > 0 && !shown.length && <p className="note">No garments here yet. Add photos to garments/{department}/.</p>}
      </section>

      <footer>
        <button className="primary" onClick={generate} disabled={!photo || !picked || busy}>
          {busy ? 'Generating… this can take a minute' : !photo ? 'Add your photo first' : picked ? `Try on: ${picked.name}` : 'Pick a garment'}
        </button>
        <p className="error" role="status" aria-live="polite">{error}</p>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
