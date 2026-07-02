import { ArrowLeft, Download, FileText } from 'lucide-react';

export default function PdfViewer() {
  const params = new URLSearchParams(window.location.search);
  const query = new URLSearchParams();
  ['cajas', 'usuario_id', 'token'].forEach((key) => {
    const value = params.get(key);
    if (value) query.set(key, value);
  });
  const pdfUrl = `/api/cajas/descargar_pdf_lote/?${query.toString()}`;

  return <div className="pdf-page">
    <header className="pdf-toolbar">
      <a href="/planillas/"><ArrowLeft size={17} />Volver a planillas</a>
      <div><FileText size={18} /><strong>Guía de trabajo</strong></div>
      <a href={pdfUrl} download className="button button--primary"><Download size={16} />Descargar PDF</a>
    </header>
    <main className="pdf-stage"><iframe src={`${pdfUrl}&preview=true`} title="Vista previa de la guía PDF" /></main>
  </div>;
}
