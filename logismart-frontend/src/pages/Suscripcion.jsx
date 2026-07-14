import { useEffect, useState } from 'react';
import {
  ArrowLeft, Building2, Check, CircleCheck, Clock3, CreditCard,
  ExternalLink, RefreshCw, ShieldCheck,
} from 'lucide-react';

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content || '';
const statusLabels = {
  none: 'Sin suscripción', incomplete: 'Pendiente de completar', incomplete_expired: 'Sesión expirada',
  trialing: 'Periodo de prueba', active: 'Suscripción activa', past_due: 'Pago pendiente',
  canceled: 'Suscripción cancelada', unpaid: 'Pago pendiente', paused: 'Suscripción pausada',
};

async function post(url, body = {}) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRFToken': csrf(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

export default function Suscripcion() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  const checkoutSucceeded = params.has('success');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState(params.has('canceled') ? 'El pago fue cancelado. No se realizó ningún cargo.' : '');
  const [quote, setQuote] = useState({ empresa: '', email: '', necesidad: '' });

  useEffect(() => {
    let cancelled = false;
    const confirm = async () => {
      try {
      if (checkoutSucceeded && sessionId) {
        setBusy(true);
        try {
          await post('/suscripcion/confirmar/', { session_id: sessionId });
          setMessage('Pago confirmado. Tu suscripción ya está vinculada con LogiSmart.');
        } catch (error) {
          setMessage(error.message);
        } finally {
          setBusy(false);
        }
      }
      const response = await fetch('/suscripcion/estado/', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('No se pudo consultar el estado de la suscripcion.');
      const nextStatus = await response.json();
      if (!cancelled) {
        setStatus(nextStatus);
        setLoading(false);
      }
      } catch (error) {
      if (!cancelled) { setMessage(error.message); setLoading(false); }
      }
    };
    void confirm();
    return () => { cancelled = true; };
  }, [checkoutSucceeded, sessionId]);

  const checkout = async () => {
    if (!status?.authenticated) return window.location.assign('/login/?next=/suscripcion/');
    setBusy(true); setMessage('');
    try {
      const data = await post('/suscripcion/checkout/');
      window.location.assign(data.checkout_url);
    } catch (error) {
      setMessage(error.message);
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true); setMessage('');
    try {
      const data = await post('/suscripcion/portal/');
      window.location.assign(data.portal_url);
    } catch (error) {
      setMessage(error.message);
      setBusy(false);
    }
  };

  const sendQuote = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const data = await post('/suscripcion/cotizacion/', quote);
      setMessage(data.mensaje || 'Solicitud recibida.');
      setQuote({ empresa: '', email: '', necesidad: '' });
    } catch (error) {
      if (!status?.authenticated) return window.location.assign('/login/?next=/suscripcion/');
      setMessage(error.message);
    } finally { setBusy(false); }
  };

  const active = status?.active;
  const period = status?.period_end ? new Date(status.period_end).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

  return <div className="pricing-page">
    <header className="pricing-header"><a href="/"><ArrowLeft size={17} />Volver al sistema</a><div><h1>Suscripción y facturación</h1><p>Administra el acceso de tu operación mediante Stripe.</p></div></header>

    {message && <div className="inline-alert subscription-message" role="status">{message}</div>}

    {!loading && status?.authenticated && <section className={`subscription-status ${active ? 'is-active' : ''}`} aria-label="Estado de la suscripción">
      <div className="subscription-status__icon">{active ? <CircleCheck size={22}/> : <Clock3 size={22}/>}</div>
      <div><span>Plan Operación</span><strong>{statusLabels[status.status] || status.status}</strong><small>{period ? `${status.cancel_at_period_end ? 'Disponible hasta' : 'Próxima renovación'}: ${period}` : 'La facturación se procesa de forma segura en Stripe.'}</small></div>
      {status.has_customer && <button className="button button--secondary" disabled={busy} onClick={openPortal}><ExternalLink size={16}/>Administrar facturación</button>}
    </section>}

    {!loading && !status?.configured && <div className="inline-alert inline-alert--warning subscription-message" role="alert">El módulo está conectado, pero falta configurar el producto y las claves de Stripe en el servidor.</div>}

    <div className="pricing-grid">
      <article className="pricing-plan pricing-plan--primary">
        <div className="pricing-plan__icon"><ShieldCheck /></div><h2>Operación</h2>
        <p className="pricing-plan__lead">Control completo para un almacén conectado.</p>
        <div className="pricing-plan__price"><strong>$300</strong><span>USD / mes</span></div>
        <ul>{['Dashboard operativo','Inventario, stock y ubicaciones','Plantillas PDF y reportes Excel','Despachos y trazabilidad','API e integraciones'].map(item=><li key={item}><Check size={16}/>{item}</li>)}</ul>
        {active
          ? <button className="button button--secondary" disabled={busy} onClick={openPortal}><CreditCard size={17}/>{busy ? 'Abriendo Stripe…' : 'Gestionar suscripción'}</button>
          : <button className="button button--primary" disabled={busy || loading || !status?.configured} onClick={checkout}>{busy ? <RefreshCw className="spin" size={17}/> : <CreditCard size={17}/>} {busy ? 'Conectando con Stripe…' : status?.authenticated ? 'Suscribirse con Stripe' : 'Ingresar para suscribirse'}</button>}
        <p className="subscription-secure-copy"><ShieldCheck size={14}/>Pago y datos de tarjeta procesados directamente por Stripe.</p>
      </article>
      <article className="pricing-plan"><div className="pricing-plan__icon"><Building2 /></div><h2>Empresa</h2><p className="pricing-plan__lead">Para múltiples usuarios, sedes o integraciones especiales.</p><form onSubmit={sendQuote} className="quote-form"><input placeholder="Empresa" required value={quote.empresa} onChange={e=>setQuote({...quote,empresa:e.target.value})}/><input type="email" placeholder="Correo de contacto" required value={quote.email} onChange={e=>setQuote({...quote,email:e.target.value})}/><textarea rows="4" placeholder="Cuéntanos qué necesitas" value={quote.necesidad} onChange={e=>setQuote({...quote,necesidad:e.target.value})}/><button className="button button--secondary" disabled={busy}>{busy ? 'Enviando…' : 'Solicitar cotización'}</button></form></article>
    </div>
  </div>;
}
