'use client';

import { useEffect, useState } from 'react';
import type { IDetailCellRendererParams } from 'ag-grid-community';
import { MessageSquare, ThumbsUp, Paperclip } from 'lucide-react';

interface Author {
  name: string;
  avatar: string;
}

interface Reply {
  id: string;
  author: Author;
  text: string;
  createdAt: string;
}

interface Comment {
  id: string;
  author: Author;
  text: string;
  createdAt: string;
  replies: Reply[];
}

interface Voter {
  userId: string;
  userName: string;
  votedAt: string;
}

interface Attachment {
  fileName: string;
  url: string;
  type: string;
  size: number;
}

interface DiscussionData {
  comments: Comment[];
  voters: Voter[];
  attachments: Attachment[];
}

export function IdeaDetailPanel(props: IDetailCellRendererParams) {
  const [data, setData] = useState<DiscussionData>({
    comments: [],
    voters: [],
    attachments: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDiscussions() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/strategic/ideas/${props.data.id}/discussions`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const { comments, voters, attachments } = await response.json();
        setData({ comments: comments || [], voters: voters || [], attachments: attachments || [] });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('Error fetching idea discussions:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchDiscussions();
  }, [props.data.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="mb-3 inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-blue-600 border-r-transparent"></div>
            <p className="text-sm text-gray-600">Carregando discussões...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-center">
          <p className="text-sm text-red-800">Erro ao carregar discussões: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900">
          Discussões - {props.data.code}
        </h4>
        <p className="text-sm text-gray-600 mt-1">
          {props.data.title}
        </p>
      </div>

      <div className="space-y-6">
        {/* Seção de Comentários */}
        <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h5 className="font-semibold text-gray-900">
              💬 Discussões ({data.comments.length})
            </h5>
          </div>

          {data.comments.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">
              Nenhum comentário ainda. Seja o primeiro a comentar!
            </p>
          ) : (
            <div className="space-y-4">
              {data.comments.map((comment) => (
                <div key={comment.id} className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                  {/* Header do comentário */}
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={comment.author.avatar}
                      alt={comment.author.name}
                      className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{comment.author.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Texto do comentário */}
                  <p className="text-sm text-gray-700 leading-relaxed">{comment.text}</p>

                  {/* Replies (nested) */}
                  {comment.replies.length > 0 && (
                    <div className="ml-8 mt-4 space-y-3 border-l-2 border-blue-300 pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="rounded bg-white p-3 shadow-sm">
                          <div className="mb-2 flex items-center gap-2">
                            <img
                              src={reply.author.avatar}
                              alt={reply.author.name}
                              className="h-7 w-7 rounded-full"
                            />
                            <div>
                              <p className="font-medium text-xs text-gray-900">
                                {reply.author.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(reply.createdAt)}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção de Votos */}
        <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp className="h-5 w-5 text-green-600" />
            <h5 className="font-semibold text-gray-900">
              👍 Votos ({data.voters.length})
            </h5>
          </div>

          {data.voters.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Nenhum voto ainda. Seja o primeiro a votar!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.voters.map((voter) => (
                <span
                  key={voter.userId}
                  className="inline-flex items-center rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800 border border-green-200"
                  title={`Votou em ${formatDate(voter.votedAt)}`}
                >
                  {voter.userName}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Seção de Anexos */}
        {data.attachments.length > 0 && (
          <div className="rounded-lg bg-white p-5 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Paperclip className="h-5 w-5 text-purple-600" />
              <h5 className="font-semibold text-gray-900">
                📎 Anexos ({data.attachments.length})
              </h5>
            </div>

            <ul className="space-y-2">
              {data.attachments.map((file, index) => (
                <li key={index}>
                  <a
                    href={file.url}
                    className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm hover:bg-gray-100 transition-colors border border-gray-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Paperclip className="h-4 w-4 text-gray-500" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-600">{file.fileName}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="mt-6 text-xs text-gray-500 flex items-center justify-between">
        <span>
          Total de interações: <strong className="text-gray-700">
            {data.comments.length + data.voters.length + data.attachments.length}
          </strong>
        </span>
        <span className="text-gray-400">
          💡 Dica: Clique nos anexos para visualizar
        </span>
      </div>
    </div>
  );
}
