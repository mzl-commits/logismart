import { Boxes, KeyRound, LockKeyhole, UserRound } from 'lucide-react';

export default function Login() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next') || '/';
  const error = params.has('error');
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';

  return <div className="auth-layout">
    <section className="auth-intro">
      <div className="brand brand--public"><span className="brand__mark"><Boxes size={22} /></span><span><strong>LogiSmart</strong><small>Control de almacén</small></span></div>
      <div><p className="auth-intro__label">Operación conectada</p><h1>Decisiones claras para cada movimiento.</h1><p>Inventario, ubicaciones y despachos en una sola herramienta operativa.</p></div>
      <div className="auth-intro__status"><span /> Sistema protegido por sesión segura</div>
    </section>
    <section className="auth-panel" aria-labelledby="login-title">
      <div className="auth-panel__heading"><LockKeyhole size={22} /><div><h1 id="login-title">Acceso al sistema</h1><p>Ingresa tus credenciales de operación.</p></div></div>
      {error && <div className="inline-alert inline-alert--danger" role="alert">Usuario o contraseña incorrectos.</div>}
      <form method="post" action={`/login/?next=${encodeURIComponent(next)}`} className="auth-form">
        <input type="hidden" name="csrfmiddlewaretoken" value={csrf} />
        <label><span>Usuario</span><div><UserRound size={17} /><input name="username" autoComplete="username" required autoFocus /></div></label>
        <label><span>Contraseña</span><div><KeyRound size={17} /><input type="password" name="password" autoComplete="current-password" required /></div></label>
        <button type="submit" className="button button--primary auth-submit">Ingresar</button>
      </form>
      <a href="/suscripcion/" className="auth-secondary-link">Consultar planes de servicio</a>
    </section>
  </div>;
}
