import { useState } from 'react';
import { Columns3, Eye, EyeOff, Menu, Table2, Workflow } from 'lucide-react';
import { CurriculumFlow } from './components/CurriculumFlow';
import { CurriculumImporter } from './components/CurriculumImporter';
import { CurriculumTable } from './components/CurriculumTable';

type ViewMode = 'split' | 'flow' | 'table';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('flow');
  const [isImporterVisible, setIsImporterVisible] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);

  const selectViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setIsViewMenuOpen(false);
  };

  const toggleImporter = () => {
    setIsImporterVisible((visible) => !visible);
    setIsViewMenuOpen(false);
  };

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
          <div className="app-header__actions">
            <a className="text-link" href="./optativas.html">
              Optativas
            </a>
            <div className="view-menu">
              <button
                type="button"
                className="view-menu__trigger"
                onClick={() => setIsViewMenuOpen((open) => !open)}
                aria-controls="view-menu-options"
                aria-expanded={isViewMenuOpen}
                aria-haspopup="menu"
                aria-label="Abrir menu de visualizacao"
                title="Menu"
              >
                <Menu size={18} />
              </button>
              {isViewMenuOpen ? (
                <div className="view-menu__options" id="view-menu-options" role="menu">
                  <button
                    type="button"
                    className={viewMode === 'split' ? 'is-active' : ''}
                    onClick={() => selectViewMode('split')}
                    aria-pressed={viewMode === 'split'}
                    role="menuitem"
                  >
                    <Columns3 size={16} />
                    Dividido
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'flow' ? 'is-active' : ''}
                    onClick={() => selectViewMode('flow')}
                    aria-pressed={viewMode === 'flow'}
                    role="menuitem"
                  >
                    <Workflow size={16} />
                    Fluxograma
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'table' ? 'is-active' : ''}
                    onClick={() => selectViewMode('table')}
                    aria-pressed={viewMode === 'table'}
                    role="menuitem"
                  >
                    <Table2 size={16} />
                    Tabela
                  </button>
                  <button
                    type="button"
                    className={isImporterVisible ? 'is-active' : ''}
                    onClick={toggleImporter}
                    aria-pressed={isImporterVisible}
                    aria-label={isImporterVisible ? 'Ocultar painel TSV' : 'Mostrar painel TSV'}
                    role="menuitem"
                  >
                    {isImporterVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    TSV
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {isImporterVisible ? <CurriculumImporter /> : null}

      <div className={`workspace workspace--${viewMode}`}>
        {viewMode !== 'table' ? <CurriculumFlow /> : null}
        {viewMode !== 'flow' ? <CurriculumTable /> : null}
      </div>
    </main>
  );
}

export default App;
