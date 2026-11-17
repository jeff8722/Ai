import React, { useState } from 'react';
import { ArrowLeft, ImagePlus, Lock, Trash2 } from 'lucide-react';
import { API, TYPE_LABEL, TagButton, imageUrl, priceLabel, tone, useObjectUrl } from './ui';

const EMPTY = { name: '', department: 'women', category: '', color: '', price: '', description: '', tryon: '' };

const AI_STATUS = {
  'local-ai-ready': 'Try-on AI is ready',
  'local-ai-setup-required': 'Try-on AI needs setting up',
  offline: 'Backend is offline',
  checking: 'Checking the backend'
};

export default function Admin({ catalog, reload, health, pin, setPin, onExit }) {
  const locked = health.admin_locked;
  const [form, setForm] = useState(EMPTY);
  const [image, setImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [armed, setArmed] = useState(null); // product id waiting for its second "Remove" tap
  const preview = useObjectUrl(image);
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const headers = pin ? { 'X-Admin-Pin': pin } : {};

  async function unlock(event) {
    event.preventDefault();
    setPinError('');
    const r = await fetch(`${API}/api/admin/check`, { method: 'POST', headers: { 'X-Admin-Pin': pinInput } }).catch(() => null);
    if (r?.ok) setPin(pinInput);
    else setPinError(r ? 'That PIN is not right. Check ADMIN_PIN in backend/.env.' : 'The fitting computer is offline. Start the backend and try again.');
    setPinInput('');
  }

  async function save(event) {
    event.preventDefault();
    setMessage('');
    if (!image) return setMessage('Choose a product photo first.');
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries({ name: form.name, department: form.department, category: form.category, color: form.color, price: form.price, description: form.description }).forEach(([k, v]) => body.append(k, v));
      if (form.tryon) body.append('tryon_category', form.tryon);
      body.append('image', image);
      const response = await fetch(`${API}/api/products`, { method: 'POST', body, headers });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) setPin('');
      if (!response.ok) throw new Error(data.detail || 'Could not add this product.');
      await reload();
      setMessage(`Added ${data.name} as a ${TYPE_LABEL[data.tryon_category]?.toLowerCase() || 'display-only item'}.`);
      setForm(f => ({ ...EMPTY, department: f.department }));
      setImage(null);
      event.target.reset();
    } catch (err) {
      setMessage(err.message || 'Upload failed.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    if (armed !== item.id) return setArmed(item.id);
    setArmed(null);
    const response = await fetch(`${API}/api/products/${encodeURIComponent(item.id)}`, { method: 'DELETE', headers }).catch(() => null);
    if (response?.status === 401) setPin('');
    if (!response?.ok) return setMessage(`Could not remove ${item.name}.`);
    await reload();
    setMessage(`Removed ${item.name} from the rail.`);
  }

  if (locked && !pin) {
    return (
      <section className="staff-gate">
        <form className="hang solo" onSubmit={unlock}>
          <div className="swing">
          <span className="string" aria-hidden="true" />
          <div className="tag tone-weave gate-tag">
            <span className="eyelet" aria-hidden="true" />
            <Lock size={28} aria-hidden="true" />
            <h2 className="display">Staff only</h2>
            <p>Enter the staff PIN to add or remove products.</p>
            <label className="field">
              <span>Staff PIN</span>
              <input type="password" inputMode="numeric" autoComplete="off" autoFocus value={pinInput} onChange={e => setPinInput(e.target.value)} required />
            </label>
            {pinError && <p className="field-error" role="alert">{pinError}</p>}
            <TagButton label="Unlock" type="submit" />
            <button type="button" className="text-btn on-dark" onClick={onExit}><ArrowLeft size={16} /> Back to fitting room</button>
          </div>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="staff">
      <header className="staff-head">
        <div>
          <h2 className="display" data-split>Catalogue</h2>
          <p className="muted">Add stock from a product photo. Shoppers see changes straight away.</p>
          <p className={`ai-status ${health.mode === 'local-ai-ready' ? 'live' : ''}`} role="status">
            <i aria-hidden="true" />
            <b>{AI_STATUS[health.mode] || AI_STATUS.checking}.</b>
            {health.mode !== 'local-ai-ready' && health.message && <span> {health.message}</span>}
          </p>
        </div>
        <div className="staff-actions">
          {locked && <button className="ghost-btn" onClick={() => { setPin(''); onExit(); }}><Lock size={16} /> Lock</button>}
          <button className="ghost-btn" onClick={onExit}><ArrowLeft size={16} /> Back to fitting room</button>
        </div>
      </header>

      <div className="staff-grid">
        <form className="tag tone-paper tag-sheet" onSubmit={save}>
          <span className="eyelet" aria-hidden="true" />
          <h3 className="woven-label">New product tag</h3>
          <label className="field">
            <span>Product name</span>
            <input required value={form.name} onChange={set('name')} placeholder="Navy button-down shirt" />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Department</span>
              <select value={form.department} onChange={set('department')}>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="kids">Kids</option>
                <option value="footwear">Footwear</option>
              </select>
            </label>
            <label className="field">
              <span>Try-on type</span>
              <select value={form.tryon} onChange={set('tryon')} disabled={form.department === 'footwear'}>
                <option value="">Guess from category</option>
                <option value="tops">Top (shirt, blouse, jacket)</option>
                <option value="bottoms">Bottoms (pants, skirt, shorts)</option>
                <option value="one-pieces">Full length (dress, frock, kurta)</option>
              </select>
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Category</span>
              <input required value={form.category} onChange={set('category')} placeholder="Shirts" />
            </label>
            <label className="field">
              <span>Colour</span>
              <input required value={form.color} onChange={set('color')} placeholder="Navy" />
            </label>
          </div>
          <label className="field">
            <span>Price in ₹ (0 shows “Ask staff for price”)</span>
            <input required type="number" min="0" step="1" inputMode="numeric" value={form.price} onChange={set('price')} placeholder="1499" />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea rows="3" value={form.description} onChange={set('description')} placeholder="Fabric, fit and details" />
          </label>
          <label className="drop" htmlFor="staff-image">
            {preview ? <img src={preview} alt="Selected product photo" /> : <ImagePlus size={28} aria-hidden="true" />}
            <b>{image ? image.name : 'Choose product photo'}</b>
            <small>One garment, whole and flat, on a plain background. JPG, PNG or WEBP up to 20 MB.</small>
            <input id="staff-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImage(e.target.files?.[0] || null)} />
          </label>
          <TagButton label={saving ? 'Adding…' : 'Add to the rail'} type="submit" disabled={saving} />
          {message && <p className="staff-message" role="status">{message}</p>}
        </form>

        <div className="staff-list">
          <h3>On the rail <span className="count">{catalog.length}</span></h3>
          <ul>
            {catalog.map(item => (
              <li key={item.id} className={`staff-item tone-${tone(item.department)}`}>
                <span className="staff-hole" aria-hidden="true" />
                <img src={imageUrl(item.image)} alt="" loading="lazy" />
                <div>
                  <b>{item.name}</b>
                  <small>{item.id}. {item.category}, {item.color}. {TYPE_LABEL[item.tryon_category] || 'Display only'}. {priceLabel(item.price)}</small>
                </div>
                <button className={`remove ${armed === item.id ? 'armed' : ''}`} onClick={() => remove(item)} onBlur={() => setArmed(null)}>
                  <Trash2 size={16} aria-hidden="true" />
                  {armed === item.id ? 'Tap again to remove' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
