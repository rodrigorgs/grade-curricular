import { useState } from 'react';
import { Columns3, Table2, Workflow } from 'lucide-react';
import { CurriculumFlow } from './components/CurriculumFlow';
import { CurriculumImporter } from './components/CurriculumImporter';
import { CurriculumTable } from './components/CurriculumTable';

type ViewMode = 'split' | 'flow' | 'table';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Editor client-side</p>
          <h1>Grade curricular</h1>
        </div>
        <p>
          Edite disciplinas, carga horaria, semestres e pre-requisitos. Arraste um bloco no
          fluxograma para realocar a disciplina entre semestres.
        </p>
      </header>

      <div className="view-toolbar" aria-label="Modo de visualizacao">
        <button
          type="button"
          className={viewMode === 'split' ? 'is-active' : ''}
          onClick={() => setViewMode('split')}
          aria-pressed={viewMode === 'split'}
        >
          <Columns3 size={16} />
          Dividido
        </button>
        <button
          type="button"
          className={viewMode === 'flow' ? 'is-active' : ''}
          onClick={() => setViewMode('flow')}
          aria-pressed={viewMode === 'flow'}
        >
          <Workflow size={16} />
          Fluxograma
        </button>
        <button
          type="button"
          className={viewMode === 'table' ? 'is-active' : ''}
          onClick={() => setViewMode('table')}
          aria-pressed={viewMode === 'table'}
        >
          <Table2 size={16} />
          Tabela
        </button>
      </div>

      {viewMode === 'split' ? <CurriculumImporter /> : null}

      <div className={`workspace workspace--${viewMode}`}>
        {viewMode !== 'table' ? <CurriculumFlow /> : null}
        {viewMode !== 'flow' ? <CurriculumTable /> : null}
      </div>
    </main>
  );
}

export default App;
