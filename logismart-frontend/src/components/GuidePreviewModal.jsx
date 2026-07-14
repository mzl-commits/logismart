import { CheckCircle2, Download } from 'lucide-react';
import { Modal } from './ui';

export default function GuidePreviewModal({
  guide,
  onClose,
  title = 'Guía de trabajo lista',
  statusTitle = 'Planilla creada correctamente',
  statusDescription = 'Revisa la guía antes de descargarla. La cola y sus ubicaciones ya fueron procesadas.',
}) {
  return <Modal isOpen={Boolean(guide)} onClose={onClose} title={title} size="wide" contentClassName="guide-review-modal">
    {guide && <div className="guide-review">
      <div className="guide-review__status" role="status">
        <span><CheckCircle2 size={20}/></span>
        <div><strong>{statusTitle}</strong><p>{statusDescription}</p></div>
        {guide.preparing ? <small>Preparando informe local...</small> : guide.enhanced && <small>Informe local incluido</small>}
      </div>
      <div className="guide-review__document">
        <iframe src={guide.previewUrl} title="Vista previa de la guía generada" />
      </div>
      <footer className="guide-review__actions">
        <button type="button" className="button button--secondary" onClick={onClose}>Volver a LogiSmart</button>
        <a className="button button--primary" href={guide.downloadUrl} download><Download size={16}/>Descargar PDF</a>
      </footer>
    </div>}
  </Modal>;
}
