import { useEffect, useMemo, useState } from 'react';
import { Box, Check, LockKeyhole, Sparkles } from 'lucide-react';

const slotOrder = [
  ['adelante', 1, 'C1'], ['adelante', 2, 'C2'],
  ['posterior', 1, 'C3'], ['posterior', 2, 'C4'],
];

export default function WarehouseGrid({ locations, boxes = [], selectedId = null, recommendedId = null, reservedIds = [], compatibleIds = null, focusAisle = null, onSelect, allowOccupied = true }) {
  const aisles = useMemo(() => [...new Set(locations.map(item => item.pasillo))].sort(), [locations]);
  const [activeAisle, setActiveAisle] = useState(aisles[0] || 'A');
  useEffect(() => { if (aisles.length && !aisles.includes(activeAisle)) setActiveAisle(aisles[0]); }, [aisles, activeAisle]);
  useEffect(() => { if (focusAisle && aisles.includes(focusAisle)) setActiveAisle(focusAisle); }, [aisles, focusAisle]);
  const boxByLocation = useMemo(() => new Map(boxes.filter(box => box.id_ubicacion).map(box => [Number(box.id_ubicacion), box])), [boxes]);
  const reservedSet = useMemo(() => new Set(reservedIds.map(Number)), [reservedIds]);
  const compatibleSet = useMemo(
    () => compatibleIds === null ? null : new Set(compatibleIds.map(Number)),
    [compatibleIds],
  );
  const shelves = useMemo(() => {
    const grouped = {};
    locations.filter(item => item.pasillo === activeAisle).forEach(item => { (grouped[item.estante] ||= []).push(item); });
    return grouped;
  }, [locations, activeAisle]);

  return <div className="warehouse-map">
    <div className="warehouse-aisles" role="tablist" aria-label="Pasillos del almacén">
      {aisles.map(aisle => <button key={aisle} type="button" role="tab" aria-selected={activeAisle===aisle} onClick={()=>setActiveAisle(aisle)}>Pasillo {aisle}<small>{locations.filter(item=>item.pasillo===aisle && item.estado_ocupacion).length}/{locations.filter(item=>item.pasillo===aisle).length}</small></button>)}
    </div>
    <div className="warehouse-legend" aria-label="Leyenda"><span><i className="is-free"/>Libre</span><span><i className="is-occupied"/>Ocupado</span>{locations.some(item=>item.activo===false) && <span><i className="is-inactive"/>Fuera de servicio</span>}{compatibleSet && <span><i className="is-unavailable"/>No compatible</span>}{recommendedId && <span><i className="is-recommended"/>Recomendado</span>}<span><i className="is-selected"/>Seleccionado</span></div>
    <div className="warehouse-shelves">
      {Object.entries(shelves).sort(([a],[b])=>Number(a)-Number(b)).map(([shelf, slots]) => {
        const levels = [...new Set(slots.map(item=>item.nivel))].sort((a,b)=>b-a);
        return <section className="warehouse-shelf" key={shelf} aria-label={`Estante ${activeAisle}${shelf}`}>
          <header><strong>Estante {activeAisle}{shelf}</strong><small>{slots.filter(item=>item.estado_ocupacion).length} de {slots.length} ocupados</small></header>
          <div className="warehouse-levels">{levels.map(level => <div className="warehouse-level" key={level}><span>Nivel {level}</span><div className="warehouse-slots">{slotOrder.map(([side, locker, label]) => {
            const location = slots.find(item=>item.nivel===level && (item.lado || 'adelante')===side && item.casillero===locker);
            if (!location) return <span className="warehouse-slot is-missing" key={label}/>;
            const box = boxByLocation.get(Number(location.id_ubicacion));
            const selected = Number(selectedId) === Number(location.id_ubicacion);
            const recommended = Number(recommendedId) === Number(location.id_ubicacion);
            const reserved = reservedSet.has(Number(location.id_ubicacion));
            const occupied = location.estado_ocupacion;
            const incompatible = compatibleSet !== null && !compatibleSet.has(Number(location.id_ubicacion));
            const inactive = location.activo === false;
            const disabled = reserved || incompatible || (occupied && !allowOccupied) || (inactive && !allowOccupied);
            const state = selected ? 'selected' : reserved ? 'reserved' : incompatible ? 'unavailable' : inactive ? 'inactive' : occupied ? 'occupied' : recommended ? 'recommended' : 'free';
            const dimensions = `${location.ancho_util_cm ?? '-'}×${location.fondo_util_cm ?? '-'}×${location.alto_util_cm ?? '-'} cm`;
            const title = incompatible
              ? `${location.pasillo}${location.estante} · ${label} · No compatible con esta caja`
              : `${location.pasillo}${location.estante} · Nivel ${level} · ${label} · ${dimensions} · ${location.capacidad_peso_kg ?? '-'} kg`;
            return <button type="button" key={location.id_ubicacion} className={`warehouse-slot is-${state}`} disabled={disabled} aria-pressed={selected} onClick={()=>onSelect?.(location, box)} title={title}>
              <span>{label}</span>{selected ? <Check size={13}/> : reserved || inactive ? <LockKeyhole size={12}/> : occupied ? <Box size={12}/> : recommended ? <Sparkles size={12}/> : null}
            </button>;
          })}</div></div>)}</div>
        </section>;
      })}
    </div>
  </div>;
}
