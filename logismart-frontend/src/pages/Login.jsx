import { useEffect, useState } from 'react';
import { Boxes, Eye, EyeOff, KeyRound, LockKeyhole, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';

export default function Login() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next') || '/';
  const error = params.has('error');
  const [csrf, setCsrf] = useState(() => document.querySelector('meta[name="csrf-token"]')?.content || '');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (csrf) return undefined;
    let active = true;
    fetch('/api/csrf/', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('CSRF bootstrap failed')))
      .then(data => { if (active) setCsrf(data.csrfToken || ''); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [csrf]);

  return <div className="auth-layout">
    <section className="auth-intro">
      <div className="brand brand--public"><span className="brand__mark"><Boxes size={22} /></span><span><strong>LogiSmart</strong><small>Control de almacén</small></span></div>
      <div className="auth-intro__message">
        <p className="auth-intro__label">Operación conectada</p>
        <h1>Control preciso en cada movimiento.</h1>
        <p>Inventario, ubicaciones y despachos coordinados desde una sola herramienta operativa.</p>
      </div>
      <div className="auth-intro__status"><ShieldCheck size={15} /><span>Sistema protegido por sesión segura</span></div>
    </section>

    <section className="auth-access">
      <button type="button" className="auth-theme" onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'}>
        {theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}<span>{theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}</span>
      </button>
      <div className="auth-panel" aria-labelledby="login-title">
        <div className="auth-panel__heading"><span><LockKeyhole size={20} /></span><div><h1 id="login-title">Acceso al sistema</h1><p>Ingresa con tu cuenta de operación.</p></div></div>
        {error && <div className="inline-alert inline-alert--danger" role="alert">Las credenciales no son correctas. Inténtalo nuevamente.</div>}
        <form method="post" action={`/login/?next=${encodeURIComponent(next)}`} className="auth-form">
          <input type="hidden" name="csrfmiddlewaretoken" value={csrf} />
          <label><span>Usuario</span><div className="auth-control"><UserRound size={17} /><input name="username" autoComplete="username" placeholder="Tu usuario" required autoFocus /></div></label>
          <label><span>Contraseña</span><div className="auth-control"><KeyRound size={17} /><input type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Tu contraseña" required onKeyUp={event => setCapsLock(event.getModifierState('CapsLock'))}/><button type="button" className="password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>{capsLock && <small className="field-hint">Bloq Mayús está activado</small>}</label>
          <button type="submit" disabled={!csrf} className="button button--primary auth-submit">{csrf ? 'Ingresar al sistema' : 'Preparando acceso...'}</button>
        </form>
        <div className="auth-panel__footer"><span>¿Necesitas acceso?</span><a href="/suscripcion/">Consultar planes</a></div>
      </div>
    </section>
  </div>;
}
