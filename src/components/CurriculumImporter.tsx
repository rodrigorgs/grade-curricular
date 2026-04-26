import { useMemo, useState, type ChangeEvent } from 'react';
import { ClipboardCopy, FileUp, Upload } from 'lucide-react';
import { exportCoursesToTsv, parseCurriculumTsv } from '../lib/tsvImport';
import { useCurriculumStore } from '../store/curriculumStore';

export function CurriculumImporter() {
  const courses = useCurriculumStore((state) => state.courses);
  const importCourses = useCurriculumStore((state) => state.importCourses);
  const [text, setText] = useState('');
  const [message, setMessage] = useState('Cole um TSV ou selecione um arquivo para importar.');

  const preview = useMemo(() => parseCurriculumTsv(text), [text]);
  const canImport = preview.courses.length > 0;
  const totalWorkload = preview.courses.reduce((total, course) => total + course.workload, 0);

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setText(await file.text());
    setMessage(`${file.name} carregado para revisao.`);
  };

  const onExport = async () => {
    await navigator.clipboard.writeText(exportCoursesToTsv(courses));
    setMessage('TSV copiado para a área de transferência.');
  };

  const onImport = () => {
    if (!canImport) {
      setMessage(preview.warnings[0] ?? 'Nao ha disciplinas validas para importar.');
      return;
    }

    importCourses(preview.courses);
    setMessage(
      `${preview.courses.length} disciplinas importadas, ${totalWorkload} horas no total.`,
    );
  };

  return (
    <section className="import-panel" aria-label="Importar grade por TSV">
      <div className="import-panel__header">
        <div>
          <h2>Importar TSV</h2>
          <p>{message}</p>
        </div>
        <button type="button" onClick={onExport}>
          <ClipboardCopy size={16} />
          Exportar TSV
        </button>
        <label className="file-button">
          <FileUp size={16} />
          Arquivo
          <input type="file" accept=".tsv,text/tab-separated-values,text/plain" onChange={onFileChange} />
        </label>
      </div>

      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setMessage('Dados prontos para revisao.');
        }}
        placeholder="Cole aqui as colunas Semestre, id, Nome, CH, Pre-requisito, Natureza, Categoria e Departamento."
        aria-label="Dados TSV da grade curricular"
      />

      <div className="import-panel__footer">
        <div className="import-summary">
          <strong>{preview.courses.length}</strong> disciplinas
          <span>{totalWorkload} horas</span>
          {preview.skippedRows > 0 ? <span>{preview.skippedRows} linhas ignoradas</span> : null}
          {preview.warnings.length > 0 ? <span>{preview.warnings.length} avisos</span> : null}
        </div>
        <button type="button" disabled={!canImport} onClick={onImport}>
          <Upload size={16} />
          Carregar grade
        </button>
      </div>

      {preview.warnings.length > 0 ? (
        <ul className="import-warnings" aria-label="Avisos de importacao">
          {preview.warnings.slice(0, 4).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

