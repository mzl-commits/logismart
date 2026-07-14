import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return <div className="py-16"><EmptyState icon={FileQuestion} title="Pagina no encontrada" description="La direccion solicitada no existe o ya no esta disponible." /><div className="text-center mt-5"><Link className="button button--primary" to="/">Volver al dashboard</Link></div></div>;
}
