import { useState } from 'react';
import { ArrowLeft, Building2, Check, CreditCard, ShieldCheck } from 'lucide-react';

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content || '';

export default function Suscripcion() {
  const params = new URLSearchParams(window.location.search);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(params.has('success') ? 'Suscripción activada correctamente.' : params.has('canceled') ? 'El pago fue cancelado.' : '');
  const [quote, setQuote] = useState({ empresa: '', email: '', necesidad: '' });

  const checkout = async () => {
    setBusy(true);
    try {
      const response = await fetch('/suscripcion/checkout/', { method: 'POST', headers: { 'X-CSRFToken': csrf(), 'Content-Type': 'application/json' }, body: '{}' });
      if (response.status === 403) return window.location.assign('/login/?next=/suscripcion/');
      const data = await response.json();
      if (data.checkout_url) window.location.assign(data.checkout_url); else setMessage(data.error || 'No se pudo iniciar el pago.');
    } finally { setBusy(false); }
  };

  const sendQuote = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch('/suscripcion/cotizacion/', { method: 'POST', headers: { 'X-CSRFToken': csrf(), 'Content-Type': 'application/json' }, body: JSON.stringify(quote) });
      if (response.status === 403) return window.location.assign('/login/?next=/suscripcion/');
      const data = await response.json(); setMessage(data.mensaje || 'Solicitud recibida.');
    } finally { setBusy(false); }
  };

  return <div className="pricing-page">
    <header className="pricing-header"><a href="/"><ArrowLeft size={17} />Volver al sistema</a><div><h1>Planes LogiSmart</h1><p>Capacidad operativa sin contratos complejos.</p></div></header>
    {message && <div className="inline-alert" role="status">{message}</div>}
    <div className="pricing-grid">
      <article className="pricing-plan pricing-plan--primary"><div className="pricing-plan__icon"><ShieldCheck /></div><h2>Operación</h2><p className="pricing-plan__lead">Control completo para un almacén conectado.</p><div className="pricing-plan__price"><strong>$300</strong><span>USD / mes</span></div><ul>{['Dashboard operativo','Control de inventario y ubicaciones','Despachos y trazabilidad','API e integraciones','Actualizaciones incluidas'].map(item=><li key={item}><Check size={16}/>{item}</li>)}</ul><button className="button button--primary" disabled={busy} onClick={checkout}><CreditCard size={17}/>{busy?'Procesando':'Suscribirse'}</button></article>
      <article className="pricing-plan"><div className="pricing-plan__icon"><Building2 /></div><h2>Empresa</h2><p className="pricing-plan__lead">Para múltiples usuarios, sedes o integraciones especiales.</p><form onSubmit={sendQuote} className="quote-form"><input placeholder="Empresa" required value={quote.empresa} onChange={e=>setQuote({...quote,empresa:e.target.value})}/><input type="email" placeholder="Correo de contacto" required value={quote.email} onChange={e=>setQuote({...quote,email:e.target.value})}/><textarea rows="4" placeholder="Cuéntanos qué necesitas" value={quote.necesidad} onChange={e=>setQuote({...quote,necesidad:e.target.value})}/><button className="button button--secondary" disabled={busy}>Solicitar cotización</button></form></article>
    </div>
  </div>;
}
