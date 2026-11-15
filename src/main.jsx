
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Camera, Check, ChevronLeft, ChevronRight, CircleHelp,
  Heart, Image as ImageIcon, RefreshCw, ScanFace,
  ShieldCheck, Sparkles, X
} from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const imageUrl = value =>
  value?.startsWith('/') ? `${API}${value}` : value;

const money = n =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n || 0);

function App() {
  const [step, setStep] = useState('welcome');
  const [catalog, setCatalog] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [selectionMode, setSelectionMode] = useState('individual');
  const [selectedTop, setSelectedTop] = useState(null);
  const [selectedBottom, setSelectedBottom] = useState(null);
  const [resultLabel, setResultLabel] = useState('');
  const [resultPrice, setResultPrice] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('checking');
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [consent, setConsent] = useState(false);

  const [adminName, setAdminName] = useState('');
  const [adminCategory, setAdminCategory] = useState('Shirts');
  const [adminDepartment, setAdminDepartment] = useState('women');
  const [adminColor, setAdminColor] = useState('');
  const [adminPrice, setAdminPrice] = useState('');
  const [adminDescription, setAdminDescription] = useState('');
  const [adminImage, setAdminImage] = useState(null);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  const visibleCatalog = catalog.filter(item =>
    (departmentFilter === 'all' || item.department === departmentFilter) &&
    (categoryFilter === 'all' || item.category === categoryFilter)
  );
  const availableCategories = [...new Set(
    catalog
      .filter(item => departmentFilter === 'all' || item.department === departmentFilter)
      .map(item => item.category)
  )].sort();

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then(r => {
        if (!r.ok) throw new Error('Catalogue unavailable');
        return r.json();
      })
      .then(items => {
        setCatalog(items);
        setSelected(items[0] || null);
        setSelectedTop(items.find(item => item.tryon_category === 'tops') || null);
        setSelectedBottom(items.find(item => item.tryon_category === 'bottoms') || null);
      })
      .catch(() => {
        setError('Could not connect to the catalogue. Please start the backend.');
      });

    fetch(`${API}/api/health`)
      .then(r => r.json())
      .then(d => setMode(d.mode))
      .catch(() => setMode('offline'));
  }, []);

  useEffect(() => {
    if (step === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [step]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      setError('');
    } catch (err) {
      setCameraReady(false);
      setError(
        'Camera access is unavailable. Allow camera permission or upload a full-length photo.'
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext('2d').drawImage(
      video, 0, 0, canvas.width, canvas.height
    );

    canvas.toBlob(blob => {
      if (!blob) return;

      setPhoto(new File([blob], 'customer-photo.jpg', {
        type: 'image/jpeg'
      }));

      setSelected(catalog[0] || null);
      setStep('catalog');
    }, 'image/jpeg', 0.92);
  }

  function uploadPhoto(event) {
    const file = event.target.files?.[0];

    if (file) {
      setPhoto(file);
      setSelected(catalog[0] || null);
      setStep('catalog');
    }
  }

  function nextDress() {
    if (!catalog.length) return;

    const currentIndex = catalog.findIndex(
      item => item.id === selected?.id
    );

    const nextIndex = (currentIndex + 1) % catalog.length;
    setSelected(catalog[nextIndex]);
  }

  function previousDress() {
    if (!catalog.length) return;

    const currentIndex = catalog.findIndex(
      item => item.id === selected?.id
    );

    const previousIndex =
      (currentIndex - 1 + catalog.length) % catalog.length;

    setSelected(catalog[previousIndex]);
  }

  async function requestTryOn(personFile, item) {
    const garmentResponse = await fetch(imageUrl(item.image));
    if (!garmentResponse.ok) throw new Error(`Could not load ${item.name}.`);
    const garment = await garmentResponse.blob();
    const formData = new FormData();
    formData.append('person_image', personFile);
    formData.append('garment_image', new File([garment], `${item.id}.jpg`, { type: garment.type || 'image/jpeg' }));
    formData.append('category', item.tryon_category);
    const response = await fetch(`${API}/api/try-on`, { method: 'POST', body: formData });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.detail || `Try-on failed for ${item.name}.`);
    }
    return await response.blob();
  }

  async function generate(item = selected) {
    if (!photo || !item) return;

    setSelected(item);
    setStep('processing');
    setError('');

    try {
      const blob = await requestTryOn(photo, item);
      if (result) URL.revokeObjectURL(result);
      setResult(URL.createObjectURL(blob));
      setResultLabel(item.name);
      setResultPrice(Number(item.price || 0));
      setStep('result');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStep('catalog');
    }
  }

  async function generateOutfit() {
    if (!photo || !selectedTop || !selectedBottom) {
      setError('Please select one shirt and one pair of pants.');
      return;
    }
    setStep('processing');
    setError('');
    try {
      // FASHN accepts one garment per inference. Apply the top, then the bottom.
      const topResult = await requestTryOn(photo, selectedTop);
      const intermediatePerson = new File([topResult], 'vestiq-top-result.png', { type: 'image/png' });
      const finalResult = await requestTryOn(intermediatePerson, selectedBottom);
      if (result) URL.revokeObjectURL(result);
      setResult(URL.createObjectURL(finalResult));
      setResultLabel(`${selectedTop.name} + ${selectedBottom.name}`);
      setResultPrice(Number(selectedTop.price || 0) + Number(selectedBottom.price || 0));
      setStep('result');
    } catch (err) {
      setError(err.message || 'Complete outfit generation failed.');
      setStep('catalog');
    }
  }

  async function saveSaree(event) {
    event.preventDefault();
    setAdminMessage('');

    if (!adminImage) {
      setAdminMessage('Please choose a product photograph.');
      return;
    }

    setAdminSaving(true);

    try {
      const formData = new FormData();

      formData.append('name', adminName);
      formData.append('category', adminCategory);
      formData.append('color', adminColor);
      formData.append('price', adminPrice);
      formData.append('description', adminDescription);
      formData.append('department', adminDepartment);
      formData.append('image', adminImage);

      const response = await fetch(`${API}/api/products`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Could not save this product.');
      }

      const items = await fetch(`${API}/api/products`).then(r => r.json());

      setCatalog(items);
      setAdminMessage(`${data.name} was added to the catalogue.`);

      setAdminName('');
      setAdminColor('');
      setAdminPrice('');
      setAdminDescription('');
      setAdminImage(null);

      const fileInput = document.getElementById('admin-saree-image');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setAdminMessage(err.message || 'Upload failed.');
    } finally {
      setAdminSaving(false);
    }
  }

  function reset() {
    if (result) URL.revokeObjectURL(result);

    setPhoto(null);
    setResult(null);
    setConsent(false);
    setSelected(catalog[0] || null);
    setStep('welcome');
    setError('');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">S</span>
          <div>
            <b>VESTIQ</b>
            <small>YOUR STYLE. YOUR FIT. YOUR MIRROR.</small>
          </div>
        </div>

        <div className="top-center">
          THE VIRTUAL FITTING EXPERIENCE
        </div>

        <div className="top-actions">
          <span className={`mode-pill ${mode === 'local-ai-ready' ? 'live' : ''}`}>
            <i />
            {mode === 'local-ai-ready'
              ? 'LOCAL AI READY'
              : mode === 'local-ai-setup-required'
                ? 'LOCAL AI SETUP REQUIRED'
                : mode === 'offline'
                  ? 'BACKEND OFFLINE'
                  : 'CONNECTING'}
          </span>

          <button
            className="admin-link"
            onClick={() => {
              setAdminMessage('');
              setStep('admin');
            }}
          >
            CATALOGUE ADMIN
          </button>

          <button className="icon-btn" aria-label="Help">
            <CircleHelp size={19} />
          </button>
        </div>
      </header>

      <main>
        {step === 'admin' && (
          <section className="admin-layout">
            <div className="admin-heading">
              <div>
                <div className="eyebrow">SHOWROOM MANAGEMENT</div>
                <h2>Add a product to your collection</h2>
                <p className="muted">
                  Upload a clear product photograph to add it to the catalogue.
                </p>
              </div>

              <button className="secondary" onClick={() => setStep('welcome')}>
                BACK TO MIRROR
              </button>
            </div>

            <div className="admin-grid">
              <form className="admin-form" onSubmit={saveSaree}>
                <label>
                  Product name
                  <input
                    required
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    placeholder="e.g. Ruby Red Kanjivaram"
                  />
                </label>

                <label>
                  Department
                  <select
                    value={adminDepartment}
                    onChange={e => setAdminDepartment(e.target.value)}
                  >
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="kids">Kids</option>
                    <option value="footwear">Footwear</option>
                  </select>
                </label>

                <div className="admin-fields">
                  <label>
                    Category
                    <input
                      required
                      value={adminCategory}
                      onChange={e => setAdminCategory(e.target.value)}
                      placeholder="Kanjivaram"
                    />
                  </label>

                  <label>
                    Colour
                    <input
                      required
                      value={adminColor}
                      onChange={e => setAdminColor(e.target.value)}
                      placeholder="Ruby red"
                    />
                  </label>
                </div>

                <label>
                  Price (₹)
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={adminPrice}
                    onChange={e => setAdminPrice(e.target.value)}
                    placeholder="5990"
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={adminDescription}
                    onChange={e => setAdminDescription(e.target.value)}
                    placeholder="Fabric, colour and design details..."
                    rows="3"
                  />
                </label>

                <label className="upload-drop" htmlFor="admin-saree-image">
                  <ImageIcon size={25} />
                  <b>
                    {adminImage ? adminImage.name : 'Choose product photograph'}
                  </b>
                  <small>JPG, PNG or WEBP · Maximum 20 MB</small>
                  <input
                    id="admin-saree-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => setAdminImage(e.target.files?.[0] || null)}
                    required={!adminImage}
                  />
                </label>

                <button className="primary" disabled={adminSaving}>
                  {adminSaving ? 'UPLOADING...' : 'UPLOAD TO CATALOGUE'}
                  <Sparkles size={16} />
                </button>

                {adminMessage && (
                  <p className="admin-message" role="status">
                    {adminMessage}
                  </p>
                )}
              </form>

              <div className="admin-preview">
                <div className="eyebrow">PHOTO GUIDELINES</div>
                <h3>Help the AI see the garment clearly.</h3>
                <ul>
                  <li>Photograph one product at a time.</li>
                  <li>Show the complete garment.</li>
                  <li>Use even lighting and a plain background.</li>
                  <li>Avoid plastic wrapping and heavy shadows.</li>
                  <li>Keep the fabric pattern visible.</li>
                </ul>

                {adminImage && (
                  <div className="admin-image-preview">
                    <img src={URL.createObjectURL(adminImage)} />
                    <span>UPLOAD PREVIEW</span>
                  </div>
                )}
              </div>
            </div>

            <div className="admin-existing">
              <div className="eyebrow">
                CURRENT CATALOGUE · {catalog.length} ITEMS
              </div>

              <div className="admin-products">
                {catalog.map(item => (
                  <div className="admin-product" key={item.id}>
                    <img src={imageUrl(item.image)} />
                    <div>
                      <b>{item.name}</b>
                      <small>
                        {item.category} · {item.color} · {money(item.price)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 'welcome' && (
          <section className="welcome layout">
            <div className="welcome-copy">
              <div className="eyebrow">
                <Sparkles size={14} />
                A NEW WAY TO DISCOVER YOUR LOOK
              </div>

              <h1>
                Your style.<br />
                <em>Your moment.</em>
              </h1>

              <p>
                Discover how a new outfit looks on you, without stepping
                into a trial room. Just stand, capture, and explore.
              </p>

              <div className="benefits">
                <span><ScanFace /> Your look, your photo</span>
                <span><Sparkles /> Explore different styles</span>
                <span><ShieldCheck /> Private session</span>
              </div>

              <button
                className="primary large"
                onClick={() => setStep('consent')}
              >
                START YOUR EXPERIENCE <ChevronRight size={18} />
              </button>

              <small className="micro">
                Takes about 30 seconds · No account needed
              </small>
            </div>

            <div className="welcome-art">
              <img src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=90" />
              <div className="art-note">
                <span className="sparkle">✳</span>
                <div>
                  <b>Find the one</b>
                  <small>Made for the way you wear it.</small>
                </div>
              </div>
              <div className="art-stamp">
                YOUR<br />STYLE<br />EDIT
              </div>
            </div>
          </section>
        )}

        {step === 'consent' && (
          <section className="center-stage">
            <div className="step-count">01 / 03</div>
            <div className="round-icon"><ShieldCheck /></div>
            <div className="eyebrow">YOUR PRIVACY MATTERS</div>
            <h2>A quick note before we begin</h2>
            <p className="muted">
              We'll take one photo to create your virtual fitting.
              Your photo is used for this session.
            </p>

            <label className="consent-row">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
              />
              <span>
                I consent to having my photo captured and processed
                for this virtual try-on.
              </span>
            </label>

            <button
              className="primary"
              disabled={!consent}
              onClick={() => setStep('camera')}
            >
              CONTINUE TO CAMERA <ChevronRight size={18} />
            </button>

            <button className="text-btn" onClick={reset}>Cancel</button>
          </section>
        )}

        {step === 'camera' && (
          <section className="camera-layout">
            <div className="camera-copy">
              <div className="step-count">01 / 03</div>
              <div className="eyebrow">LET'S GET YOUR FIT</div>
              <h2>Stand in front<br />of the mirror.</h2>
              <p className="muted">
                Position yourself inside the outline. Make sure your full
                body is visible, with a little space around you.
              </p>

              <ul className="tips">
                <li><Check /> Face the camera directly</li>
                <li><Check /> Keep your arms slightly away</li>
                <li><Check /> Good, even lighting works best</li>
              </ul>

              <button
                className="primary"
                disabled={!cameraReady}
                onClick={capture}
              >
                <Camera size={18} /> CAPTURE MY PHOTO
              </button>

              <button
                className="text-btn"
                onClick={() => fileRef.current?.click()}
              >
                <ImageIcon size={16} /> Upload a photo instead
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={uploadPhoto}
              />
            </div>

            <div className="camera-frame">
              <video ref={videoRef} muted playsInline />
              <div className="camera-overlay">
                <div className="corner tl" />
                <div className="corner tr" />
                <div className="corner bl" />
                <div className="corner br" />
                <div className="guide">
                  <span>KEEP YOUR FULL BODY IN FRAME</span>
                </div>
              </div>

              <div className="camera-bottom">
                <span><i /> LIVE CAMERA</span>
                <span>PORTRAIT · FULL LENGTH</span>
              </div>
            </div>
          </section>
        )}

        {step === 'catalog' && (
          <section className="catalog-layout">
            <div className="catalog-heading">
              <div>
                <div className="step-count">02 / 03</div>
                <div className="eyebrow">EXPLORE THE COLLECTION</div>
                <h2>Which look feels like you?</h2>
                <p className="muted">
                  Try one product on its own, or build a complete look with a shirt and pants.
                </p>
              </div>

              <div className="photo-thumb">
                {photo && <img src={URL.createObjectURL(photo)} />}
                <span><Check size={13} /> PHOTO CAPTURED</span>
              </div>
            </div>

            <div style={{display:'flex', gap:10, flexWrap:'wrap', margin:'20px 0 12px'}}>
              <button className={selectionMode === 'individual' ? 'primary' : 'secondary'} onClick={() => setSelectionMode('individual')}>INDIVIDUAL TRY-ON</button>
              <button className={selectionMode === 'outfit' ? 'primary' : 'secondary'} onClick={() => setSelectionMode('outfit')}>BUILD COMPLETE OUTFIT</button>
            </div>
            {selectionMode === 'outfit' && (
              <div style={{display:'flex', gap:12, flexWrap:'wrap', margin:'8px 0 16px'}}>
                <div style={{padding:'12px 16px', border:'1px solid #d9c9bf', borderRadius:8, minWidth:210}}>
                  <small style={{display:'block', color:'#8b6b5b'}}>SELECTED SHIRT</small>
                  <b>{selectedTop?.name || 'Choose a shirt below'}</b>
                </div>
                <div style={{padding:'12px 16px', border:'1px solid #d9c9bf', borderRadius:8, minWidth:210}}>
                  <small style={{display:'block', color:'#8b6b5b'}}>SELECTED PANTS</small>
                  <b>{selectedBottom?.name || 'Choose pants below'}</b>
                </div>
              </div>
            )}
            <div style={{display:'flex', gap:12, flexWrap:'wrap', margin:'22px 0 8px'}}>
              <label style={{fontSize:12, color:'#76675e'}}>
                Department&nbsp;
                <select value={departmentFilter} onChange={e => {setDepartmentFilter(e.target.value); setCategoryFilter('all');}}>
                  <option value="all">All departments</option>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                  <option value="kids">Kids</option>
                  <option value="footwear">Footwear</option>
                </select>
              </label>
              <label style={{fontSize:12, color:'#76675e'}}>
                Category&nbsp;
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="all">All categories</option>
                  {availableCategories.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <span style={{fontSize:12, color:'#96877e', alignSelf:'center'}}>{visibleCatalog.length} products</span>
            </div>

            {catalog.length === 0 ? (
              <div className="empty-catalog">
                <ImageIcon size={32} />
                <h3>No products available yet</h3>
                <p>Please add products through Catalogue Admin.</p>
              </div>
            ) : (
              <>
                {visibleCatalog.length === 0 ? (
                  <p className="muted">No products match these filters.</p>
                ) : (
                <div className="product-grid">
                  {visibleCatalog.map(product => (
                    <button
                      key={product.id}
                      className={`product-card ${
                        (selectionMode === 'individual' && selected?.id === product.id) ||
                        (selectionMode === 'outfit' && (selectedTop?.id === product.id || selectedBottom?.id === product.id)) ? 'selected' : ''
                      }`}
                      onClick={() => {
                        if (selectionMode === 'individual') setSelected(product);
                        else if (product.tryon_category === 'tops') setSelectedTop(product);
                        else if (product.tryon_category === 'bottoms') setSelectedBottom(product);
                        else setError('Choose a shirt or pants for a two-piece outfit.');
                      }}
                    >
                      <div className="product-image">
                        <img src={imageUrl(product.image)} />
                        <span className="select-mark">
                          {(selectionMode === 'individual' && selected?.id === product.id) ||
                           (selectionMode === 'outfit' && selectedTop?.id === product.id) ? <Check size={15} /> :
                           (selectionMode === 'outfit' && selectedBottom?.id === product.id) ? <span>2</span> : <span />}
                        </span>
                      </div>

                      <div className="product-info">
                        <div>
                          <b>{product.name}</b>
                          <small>{product.category} · {product.color}</small>
                        </div>
                        <strong>{money(product.price)}</strong>
                      </div>
                    </button>
                  ))}
                </div>
                )}

                <div className="catalog-footer">
                  <button
                    className="text-btn"
                    onClick={() => setStep('camera')}
                  >
                    <ChevronLeft size={16} /> Retake photo
                  </button>

                  <div className="catalog-navigation">
                    <button
                      className="secondary"
                      onClick={previousDress}
                      disabled={visibleCatalog.length < 2}
                    >
                      <ChevronLeft size={17} /> Previous
                    </button>

                    <button
                      className="secondary next-dress"
                      onClick={nextDress}
                      disabled={visibleCatalog.length < 2}
                    >
                      NEXT PRODUCT <ChevronRight size={17} />
                    </button>

                    {selectionMode === 'individual' ? (
                      <button className="primary" disabled={!selected || !selected.tryon_category} onClick={() => generate(selected)}>
                        TRY THIS PRODUCT <Sparkles size={17} />
                      </button>
                    ) : (
                      <button className="primary" disabled={!selectedTop || !selectedBottom} onClick={generateOutfit}>
                        TRY COMPLETE OUTFIT <Sparkles size={17} />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {step === 'processing' && (
          <section className="center-stage processing">
            <div className="processing-visual">
              <div className="scan-line" />
              <img src={photo ? URL.createObjectURL(photo) : ''} />
              <div className="processing-spark"><Sparkles /></div>
            </div>

            <div className="eyebrow">CREATING YOUR LOOK</div>
            <h2>A little magic<br />is happening.</h2>
            <p className="muted">
              We're preparing your virtual fitting. This can take a little while.
            </p>
            <div className="progress"><span /></div>
            <small className="micro">PLEASE KEEP THIS SCREEN OPEN</small>
          </section>
        )}

        {step === 'result' && (
          <section className="result-layout">
            <div className="result-heading">
              <div>
                <div className="eyebrow">
                  <Sparkles size={14} /> YOUR VIRTUAL LOOK
                </div>
                <h2>There you are.</h2>
                <p className="muted">
                  {resultLabel || selected?.name} · {money(resultPrice || selected?.price || 0)}
                </p>
              </div>

              <button className="icon-btn" onClick={reset}>
                <X />
              </button>
            </div>

            <div className="result-stage">
              <div className="result-person">
                <img src={result} />
                <span className="result-tag">YOUR TRY-ON</span>
              </div>

              <aside className="result-details">
                <div className="eyebrow">THE LOOK</div>
                <h3>{resultLabel || selected?.name}</h3>
                <p>{selectionMode === 'outfit' ? 'Complete outfit preview generated in two sequential AI passes.' : selected?.description}</p>
                <strong className="price-large">
                  {money(resultPrice || selected?.price || 0)}
                </strong>

                <div className="detail-rule" />

                <p className="muted small">
                  Love this look? Ask our team to help you find it in store.
                </p>

                <button
                  className="primary full"
                  onClick={() => setStep('catalog')}
                >
                  <RefreshCw size={17} /> TRY ANOTHER PRODUCT
                </button>

                <button className="secondary full" onClick={reset}>
                  FINISH SESSION
                </button>
              </aside>
            </div>

            <div className="result-disclaimer">
              AI-generated preview. Actual garment appearance, draping,
              colour and fit may vary.
            </div>
          </section>
        )}

        {error && (
          <div className="toast" role="alert">
            {error}
            <button onClick={() => setError('')}>
              <X size={15} />
            </button>
          </div>
        )}
      </main>

      <footer>
        <span>VESTIQ · VIRTUAL FITTING STUDIO</span>
        <span>CRAFTED FOR YOUR MOMENT <Heart size={12} /></span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
