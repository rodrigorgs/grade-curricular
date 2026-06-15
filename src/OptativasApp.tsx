import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, X } from 'lucide-react';
import optativasTsv from '../data/optativas.tsv?raw';

type Optativa = {
  codigo: string;
  nome: string;
  tipo: string;
  areaEnfase: string;
};

type ActiveFilter = {
  kind: 'tipo' | 'area';
  value: string;
};

const parseRows = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === '\t') {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  rows.push(row);

  return rows.filter((item) => item.some(Boolean));
};

const normalizeHeader = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const parseOptativas = (text: string): Optativa[] => {
  const rows = parseRows(text);
  const headers = rows[0]?.map(normalizeHeader) ?? [];
  const codigoIndex = headers.indexOf('codigo');
  const nomeIndex = headers.indexOf('nome');
  const tipoIndex = headers.indexOf('tipo');
  const areaIndex = headers.indexOf('areaenfase');

  return rows.slice(1).flatMap((row): Optativa[] => {
    const codigo = row[codigoIndex]?.trim();
    const nome = row[nomeIndex]?.trim();

    if (!codigo || !nome) return [];

    return [
      {
        codigo,
        nome,
        tipo: row[tipoIndex]?.trim() || 'Sem tipo',
        areaEnfase: row[areaIndex]?.trim() || '',
      },
    ];
  });
};

const countBy = (items: Optativa[], getValue: (item: Optativa) => string) => {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const value = getValue(item).trim() || 'Sem area de enfase';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
};

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) => {
  if (direction === 'asc') return <ArrowUp size={14} />;
  if (direction === 'desc') return <ArrowDown size={14} />;
  return <ArrowUpDown size={14} />;
};

export default function OptativasApp() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'nome', desc: false }]);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);
  const optativas = useMemo(() => parseOptativas(optativasTsv), []);
  const typeCounts = useMemo(() => countBy(optativas, (item) => item.tipo), [optativas]);
  const emphasisCounts = useMemo(
    () => countBy(optativas.filter((item) => item.areaEnfase), (item) => item.areaEnfase),
    [optativas],
  );
  const filteredOptativas = useMemo(() => {
    if (!activeFilter) return optativas;

    return optativas.filter((item) =>
      activeFilter.kind === 'tipo'
        ? item.tipo === activeFilter.value
        : item.areaEnfase === activeFilter.value,
    );
  }, [activeFilter, optativas]);
  const filterLabel =
    activeFilter?.kind === 'tipo'
      ? `Tipo: ${activeFilter.value}`
      : activeFilter
        ? `Area de enfase: ${activeFilter.value}`
        : null;

  const columns = useMemo<ColumnDef<Optativa>[]>(
    () => [
      {
        accessorKey: 'codigo',
        header: 'Codigo',
      },
      {
        accessorKey: 'nome',
        header: 'Disciplina',
      },
      {
        accessorKey: 'tipo',
        header: 'Tipo',
      },
      {
        accessorKey: 'areaEnfase',
        header: 'Area de enfase',
        cell: ({ getValue }) => getValue<string>() || '—',
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredOptativas,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <main className="app-shell optativas-shell">
      <header className="app-header optativas-header">
        <div>
          <p className="eyebrow">Consulta</p>
          <h1>Disciplinas optativas</h1>
        </div>
        <a className="text-link" href="./">
          Grade curricular
        </a>
      </header>

      <section className="optativas-summary" aria-label="Resumo das disciplinas optativas">
        <div className="summary-panel">
          <h2>Tipos</h2>
          <dl>
            {typeCounts.map(([type, count]) => (
              <button
                type="button"
                className={
                  activeFilter?.kind === 'tipo' && activeFilter.value === type
                    ? 'summary-filter is-active'
                    : 'summary-filter'
                }
                key={type}
                onClick={() => setActiveFilter({ kind: 'tipo', value: type })}
              >
                <span>{type}</span>
                <strong>{count}</strong>
              </button>
            ))}
          </dl>
        </div>
        <div className="summary-panel">
          <h2>Areas de enfase</h2>
          <dl>
            {emphasisCounts.map(([area, count]) => (
              <button
                type="button"
                className={
                  activeFilter?.kind === 'area' && activeFilter.value === area
                    ? 'summary-filter is-active'
                    : 'summary-filter'
                }
                key={area}
                onClick={() => setActiveFilter({ kind: 'area', value: area })}
              >
                <span>{area}</span>
                <strong>{count}</strong>
              </button>
            ))}
          </dl>
        </div>
      </section>

      <section className="table-panel optativas-panel" aria-label="Tabela de disciplinas optativas">
        <div className="panel-toolbar">
          <div>
            <h2>Optativas</h2>
            <p>
              {filteredOptativas.length} de {optativas.length} disciplinas
              {filterLabel ? ` · ${filterLabel}` : ''}
            </p>
          </div>
          {activeFilter ? (
            <button type="button" className="button-secondary" onClick={() => setActiveFilter(null)}>
              <X size={16} />
              Limpar filtro
            </button>
          ) : null}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className="sort-button"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon direction={header.column.getIsSorted()} />
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
