'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  Template,
  TemplateType,
  TemplateCategory,
  UseTemplateRequest,
  UseTemplateResult,
} from '@/lib/templates/template-types';

interface UseTemplatesOptions {
  type?: TemplateType;
  category?: TemplateCategory;
}

interface UseTemplatesReturn {
  templates: Template[];
  systemTemplates: Template[];
  organizationTemplates: Template[];
  isLoading: boolean;
  error: Error | null;

  createTemplate: (template: Partial<Template>) => Promise<Template>;
  updateTemplate: (id: string, updates: Partial<Template>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  useTemplate: (request: UseTemplateRequest) => Promise<UseTemplateResult>;
  duplicateTemplate: (id: string) => Promise<Template>;
  refresh: () => Promise<void>;
}

export function useTemplates(options: UseTemplatesOptions = {}): UseTemplatesReturn {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (options.type) params.append('type', options.type);
      if (options.category) params.append('category', options.category);

      const response = await fetch(`/api/strategic/templates?${params}`);
      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, [options.type, options.category]);

  useEffect(() => {
    setIsLoading(true);
    fetchTemplates().finally(() => setIsLoading(false));
  }, [fetchTemplates]);

  const systemTemplates = templates.filter(
    (t) => t.visibility === 'system' || t.isSystem
  );
  const organizationTemplates = templates.filter(
    (t) => t.visibility !== 'system' && !t.isSystem
  );

  const createTemplate = useCallback(
    async (template: Partial<Template>): Promise<Template> => {
      const response = await fetch('/api/strategic/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });

      if (!response.ok) throw new Error('Failed to create template');

      const newTemplate = await response.json();
      setTemplates((prev) => [...prev, newTemplate]);
      return newTemplate;
    },
    []
  );

  const updateTemplate = useCallback(
    async (id: string, updates: Partial<Template>) => {
      const response = await fetch(`/api/strategic/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update template');

      const updated = await response.json();
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
      );
    },
    []
  );

  const deleteTemplate = useCallback(async (id: string) => {
    const response = await fetch(`/api/strategic/templates/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete template');

    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const useTemplate = useCallback(
    async (request: UseTemplateRequest): Promise<UseTemplateResult> => {
      const response = await fetch(
        `/api/strategic/templates/${request.templateId}/use`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) throw new Error('Failed to use template');

      return response.json();
    },
    []
  );

  const duplicateTemplate = useCallback(
    async (id: string): Promise<Template> => {
      const original = templates.find((t) => t.id === id);
      if (!original) throw new Error('Template not found');

      return createTemplate({
        ...original,
        id: undefined,
        name: `${original.name} (Cópia)`,
        visibility: 'organization',
        usageCount: 0,
        isSystem: false,
        isOwner: true,
      });
    },
    [templates, createTemplate]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchTemplates();
    setIsLoading(false);
  }, [fetchTemplates]);

  return {
    templates,
    systemTemplates,
    organizationTemplates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    useTemplate,
    duplicateTemplate,
    refresh,
  };
}
