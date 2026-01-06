"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface FileResult {
  fileName: string;
  type: string;
  success: boolean;
  imported?: number;
  duplicates?: number;
  error?: string;
}

interface UploadResult {
  success: boolean;
  imported: number;
  duplicates: number;
  errors: number;
  fileResults: FileResult[];
  errorMessages: string[];
}

export default function UploadXMLPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um arquivo XML",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      
      // Adiciona todos os arquivos
      for (let i = 0; i < files.length; i++) {
        formData.append("xml_files", files[i]);
      }

      const response = await fetch("/api/sefaz/upload-xml", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        toast({
          title: "Sucesso!",
          description: data.message,
        });
      } else {
        throw new Error(data.error || "Falha ao processar upload");
      }
    } catch (error: unknown) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
          📤 Upload de XMLs - NFe/CTe
        </h1>
        <p className="text-slate-400 mt-1">
          Importe NFes e CTes manualmente através de arquivos XML
        </p>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Como funciona?
        </h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Selecione um ou mais arquivos XML (NFe ou CTe)</li>
          <li>Clique em &quot;Importar XMLs&quot;</li>
          <li>O sistema detecta automaticamente se é NFe ou CTe</li>
          <li>NFes são classificadas automaticamente (CARGO, PURCHASE, etc)</li>
          <li>CTes externos são vinculados às NFes quando possível</li>
          <li>Duplicatas são ignoradas automaticamente</li>
        </ol>
      </div>

      {/* Upload Area */}
      <div className="bg-white border border-gray-200 rounded-lg p-8">
        <div className="text-center">
          <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          
          <div className="mb-4">
            <input
              type="file"
              accept=".xml"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="xml-upload"
              disabled={uploading}
            />
            <label htmlFor="xml-upload">
              <Button asChild disabled={uploading}>
                <span className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Selecionar XMLs
                </span>
              </Button>
            </label>
          </div>

          {files && files.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {files.length} arquivo(s) selecionado(s)
              </p>
              <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-2 text-left">
                {Array.from(files).map((file, index) => (
                  <div key={index} className="text-xs text-gray-700">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!files || files.length === 0 || uploading}
            className="w-full sm:w-auto"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importar XMLs
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Resultados */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Resultados da Importação</h2>

          {/* Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{result.totalFiles}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">Importados</p>
              <p className="text-2xl font-bold text-green-600">{result.imported}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-yellow-600">Duplicatas</p>
              <p className="text-2xl font-bold text-yellow-600">{result.duplicates}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-600">Erros</p>
              <p className="text-2xl font-bold text-red-600">{result.errors}</p>
            </div>
          </div>

          {/* Detalhes por arquivo */}
          {result.fileResults && result.fileResults.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Detalhes por Arquivo</h3>
              <div className="space-y-2">
                {result.fileResults.map((fileResult: FileResult, index: number) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded border ${
                      fileResult.success
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {fileResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{fileResult.fileName}</p>
                        <p className="text-xs text-gray-600">
                          Tipo: {fileResult.type}
                          {fileResult.imported > 0 && ` | Importado: ${fileResult.imported}`}
                          {fileResult.duplicates > 0 && ` | Duplicata: ${fileResult.duplicates}`}
                          {fileResult.error && ` | Erro: ${fileResult.error}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mensagens de erro */}
          {result.errorMessages && result.errorMessages.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">Erros Encontrados:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                {result.errorMessages.map((msg: string, index: number) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Estatísticas */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">💡 Recursos Automáticos</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Para NFes:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>✅ Classificação automática (CARGO, PURCHASE)</li>
              <li>✅ Auto-cadastro de fornecedores</li>
              <li>✅ Criação automática de cargo (se transporte)</li>
              <li>✅ Extração de metadados completos</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Para CTes Externos:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>✅ Detecção automática de CTe</li>
              <li>✅ Vinculação com NFe (se houver)</li>
              <li>✅ Atualização de cargo (hasExternalCte)</li>
              <li>✅ Extração de transportadora e valores</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

