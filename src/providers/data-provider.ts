import { DataProvider } from "@refinedev/core";
import { AxiosInstance } from "axios";
import { axiosInstance, generateFilter, generateSort } from "@refinedev/simple-rest";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

/**
 * 🔐 AURACORE CUSTOM DATA PROVIDER
 * 
 * Extensão do Simple REST Data Provider do Refine com:
 * - Interceptação global de erros (409, 401, 403)
 * - Injeção automática de x-branch-id header
 * - Toast notifications para erros
 * - Redirecionamento automático em erros de autenticação
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Configuração do Axios Instance
const httpClient: AxiosInstance = axiosInstance;

httpClient.defaults.baseURL = API_URL;
httpClient.defaults.withCredentials = true; // 🔐 IMPORTANTE: Envia cookies de sessão

/**
 * Request Interceptor - Injeta Headers Globais
 */
httpClient.interceptors.request.use(
  (config) => {
    // 1️⃣ Injeta x-branch-id automaticamente
    const currentBranchId = localStorage.getItem("auracore:current-branch");
    if (currentBranchId) {
      config.headers["x-branch-id"] = currentBranchId;
    }

    // 2️⃣ Adiciona timestamp para evitar cache
    config.headers["x-request-time"] = new Date().toISOString();

    console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      branchId: currentBranchId,
    });

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor - Tratamento Global de Erros
 */
httpClient.interceptors.response.use(
  (response) => {
    // Sucesso - apenas retorna
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || errorData?.error || error.message;

    console.error(`❌ API Error [${status}]:`, errorMessage);

    // 🔐 ERRO 401: Não Autenticado
    if (status === 401) {
      toast.error("Sessão expirada. Redirecionando para login...", {
        duration: 3000,
      });

      // Aguarda 1s para o usuário ver o toast
      setTimeout(async () => {
        await signOut({ callbackUrl: "/login" });
      }, 1000);

      return Promise.reject(error);
    }

    // 🚫 ERRO 403: Sem Permissão
    if (status === 403) {
      toast.error("Você não tem permissão para realizar esta ação.", {
        description: "Entre em contato com o administrador se precisar de acesso.",
        duration: 5000,
      });

      return Promise.reject(error);
    }

    // ⚠️ ERRO 409: Conflito de Versão (Optimistic Lock)
    if (status === 409) {
      const isVersionConflict =
        errorData?.code === "VERSION_CONFLICT" ||
        errorMessage?.includes("versão") ||
        errorMessage?.includes("alterado por outro usuário");

      if (isVersionConflict) {
        toast.error("Conflito de versão detectado!", {
          description: "O registro foi alterado por outro usuário. Recarregando dados...",
          duration: 5000,
        });

        // Aguarda 2s e recarrega a página
        setTimeout(() => {
          window.location.reload();
        }, 2000);

        return Promise.reject(error);
      }

      // Outros conflitos (ex: duplicidade)
      toast.error("Operação não permitida", {
        description: errorMessage,
        duration: 5000,
      });

      return Promise.reject(error);
    }

    // 🔍 ERRO 404: Não Encontrado
    if (status === 404) {
      toast.error("Recurso não encontrado", {
        description: "O registro solicitado não existe ou foi removido.",
        duration: 4000,
      });

      return Promise.reject(error);
    }

    // ⚠️ ERRO 400: Validação
    if (status === 400) {
      // Se houver errors de validação Zod
      if (errorData?.errors) {
        const firstError = Object.values(errorData.errors)[0];
        toast.error("Erro de validação", {
          description: Array.isArray(firstError) ? firstError[0] : String(firstError),
          duration: 5000,
        });
      } else {
        toast.error("Dados inválidos", {
          description: errorMessage,
          duration: 5000,
        });
      }

      return Promise.reject(error);
    }

    // 🔥 ERRO 500: Erro Interno do Servidor
    if (status === 500) {
      toast.error("Erro interno do servidor", {
        description: "Algo deu errado. Tente novamente mais tarde.",
        duration: 5000,
      });

      return Promise.reject(error);
    }

    // 🌐 Erro de Rede (sem resposta do servidor)
    if (!error.response) {
      toast.error("Erro de conexão", {
        description: "Não foi possível conectar ao servidor. Verifique sua internet.",
        duration: 5000,
      });

      return Promise.reject(error);
    }

    // Outros erros genéricos
    toast.error("Erro na operação", {
      description: errorMessage,
      duration: 5000,
    });

    return Promise.reject(error);
  }
);

/**
 * Data Provider Customizado para Refine
 */
export const dataProvider = (apiUrl: string): DataProvider => ({
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    const url = `${apiUrl}/${resource}`;

    interface PaginationWithCurrent {
      current?: number;
      pageSize?: number;
      mode?: string;
    }
    const { current = 1, pageSize = 10, mode = "server" } = (pagination ?? {}) as PaginationWithCurrent;

    const query: Record<string, any> = {};

    // Paginação
    if (mode === "server") {
      query._start = (current - 1) * pageSize;
      query._end = current * pageSize;
    }

    // Filtros
    if (filters) {
      const generatedFilters = generateFilter(filters);
      Object.assign(query, generatedFilters);
    }

    // Ordenação
    if (sorters) {
      const generatedSort = generateSort(sorters);
      Object.assign(query, generatedSort);
    }

    const { data, headers } = await httpClient.get(url, {
      params: query,
      ...meta,
    });

    // Tenta extrair total do header ou do response
    const total = headers["x-total-count"] || data.total || data.data?.length || 0;

    return {
      data: data.data || data,
      total: parseInt(total),
    };
  },

  getOne: async ({ resource, id, meta }) => {
    const url = `${apiUrl}/${resource}/${id}`;

    console.log("🔍 getOne called:", { resource, id, url });

    try {
      const response = await httpClient.get(url);
      
      console.log("✅ getOne response:", {
        status: response.status,
        data: response.data,
      });

      return {
        data: response.data,
      };
    } catch (error: any) {
      console.error("❌ getOne error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  create: async ({ resource, variables, meta }) => {
    const url = `${apiUrl}/${resource}`;

    const { data } = await httpClient.post(url, variables, meta as unknown as Record<string, unknown>);

    toast.success("Registro criado com sucesso!");

    return {
      data,
    };
  },

  update: async ({ resource, id, variables, meta }) => {
    const url = `${apiUrl}/${resource}/${id}`;

    const { data } = await httpClient.put(url, variables, meta as unknown as Record<string, unknown>);

    toast.success("Registro atualizado com sucesso!");

    return {
      data,
    };
  },

  deleteOne: async ({ resource, id, meta }) => {
    const url = `${apiUrl}/${resource}/${id}`;

    const { data } = await httpClient.delete(url, meta as unknown as Record<string, unknown>);

    toast.success("Registro excluído com sucesso!");

    return {
      data,
    };
  },

  getApiUrl: () => apiUrl,

  // Métodos opcionais do Refine
  custom: async ({ url, method, filters, sorters, payload, query, headers }) => {
    let requestUrl = `${url}?`;

    if (sorters) {
      const generatedSort = generateSort(sorters);
      if (Array.isArray(generatedSort)) {
        generatedSort.forEach(({ field, order }) => {
          requestUrl += `_sort[]=${field}&_order[]=${order}&`;
        });
      }
    }

    if (filters) {
      const generatedFilters = generateFilter(filters);
      Object.keys(generatedFilters).forEach((key) => {
        requestUrl += `${key}=${generatedFilters[key]}&`;
      });
    }

    if (query) {
      Object.keys(query).forEach((key) => {
        requestUrl += `${key}=${(query as any)[key]}&`;
      });
    }

    const { data } = await httpClient.request({
      url: requestUrl,
      method,
      data: payload,
      headers,
    });

    return { data };
  },
});

export default dataProvider(API_URL);

