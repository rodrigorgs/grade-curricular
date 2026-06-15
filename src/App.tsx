import { useState } from 'react';
import { Columns3, Eye, EyeOff, Table2, Workflow } from 'lucide-react';
import { CurriculumFlow } from './components/CurriculumFlow';
import { CurriculumImporter } from './components/CurriculumImporter';
import { CurriculumTable } from './components/CurriculumTable';

type ViewMode = 'split' | 'flow' | 'table';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [isImporterVisible, setIsImporterVisible] = useState(false);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Editor client-side</p>
          <h1>Grade curricular</h1>
        </div>
        <div className="app-header__aside">
          <p>
            Edite disciplinas, carga horaria, semestres e pre-requisitos. Arraste um bloco no
            fluxograma para realocar a disciplina entre semestres.
          </p>
          <a className="text-link" href="./optativas.html">
            Optativas
          </a>
        </div>
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
        <button
          type="button"
          className={isImporterVisible ? 'is-active' : ''}
          onClick={() => setIsImporterVisible((visible) => !visible)}
          aria-pressed={isImporterVisible}
          aria-label={isImporterVisible ? 'Ocultar painel TSV' : 'Mostrar painel TSV'}
        >
          {isImporterVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          TSV
        </button>
      </div>

      {isImporterVisible ? <CurriculumImporter /> : null}

      <div className={`workspace workspace--${viewMode}`}>
        {viewMode !== 'table' ? <CurriculumFlow /> : null}
        {viewMode !== 'flow' ? <CurriculumTable /> : null}
      </div>
    </main>
  );
}

export default App;
