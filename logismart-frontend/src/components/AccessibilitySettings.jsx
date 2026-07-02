import { useEffect, useState } from 'react';
import { Contrast, Eye, Gauge, RotateCcw } from 'lucide-react';
import { accessibilityDefaults as defaults, applyAccessibilityPreferences, loadAccessibilityPreferences } from '../accessibility';

export default function AccessibilitySettings() {
  const [preferences, setPreferences] = useState(loadAccessibilityPreferences);

  useEffect(() => {
    applyAccessibilityPreferences(preferences);
    localStorage.setItem('accessibilityPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const options = [
    { key: 'highContrast', icon: Contrast, title: 'Contraste reforzado', description: 'Aumenta la separación entre texto, controles y superficies.' },
    { key: 'colorSafe', icon: Eye, title: 'Estados aptos para daltonismo', description: 'Refuerza estados con una paleta azul, ámbar y formas diferenciadas.' },
    { key: 'reduceMotion', icon: Gauge, title: 'Reducir movimiento', description: 'Desactiva transiciones, pulsos y desplazamientos no esenciales.' },
  ];

  return <section className="settings-section" aria-labelledby="accessibility-title">
    <div className="settings-section__header">
      <div><h2 id="accessibility-title">Accesibilidad visual</h2><p>Estas preferencias se guardan únicamente en este dispositivo.</p></div>
      <button className="button button--secondary" onClick={() => setPreferences(defaults)}><RotateCcw size={16} />Restablecer</button>
    </div>
    <div className="preference-list">
      {options.map(({ key, icon: Icon, title, description }) => <label className="preference-row" key={key}>
        <span className="preference-row__icon"><Icon size={19} /></span>
        <span className="preference-row__copy"><strong>{title}</strong><small>{description}</small></span>
        <input className="switch-input" type="checkbox" checked={preferences[key]} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} />
        <span className="switch" aria-hidden="true" />
      </label>)}
    </div>
  </section>;
}
