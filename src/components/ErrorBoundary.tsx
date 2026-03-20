import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Captura erros de renderização React e exibe UI de recuperação.
 *
 * Resolve crashes causados por:
 * - Extensões de browser que modificam o DOM (ad blockers, password managers)
 * - Erros de "insertBefore" / "removeChild" quando React tenta manipular nós que foram removidos
 * - Outros erros não capturados durante a renderização
 *
 * Usado por apps como Notion, Linear, etc. para lidar com esse problema comum.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log para debugging (em produção, poderia enviar para serviço de monitoramento)
    console.error("[ErrorBoundary] Erro capturado:", error);
    console.error("[ErrorBoundary] Component Stack:", errorInfo.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const isDomError = this.state.error?.message?.includes("insertBefore") ||
                         this.state.error?.message?.includes("removeChild") ||
                         this.state.error?.message?.includes("not a child");

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-surface-primary p-6">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Ícone */}
            <div className="mx-auto w-16 h-16 rounded-full bg-accent-amber/10 flex items-center justify-center">
              <AlertTriangle size={32} className="text-accent-amber" />
            </div>

            {/* Título e descrição */}
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-text-primary">
                Algo deu errado
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed">
                {isDomError ? (
                  <>
                    Uma extensão do navegador pode ter causado esse problema.
                    Tente desativar extensões como ad blockers ou gerenciadores de senha e recarregue.
                  </>
                ) : (
                  <>
                    Ocorreu um erro inesperado.
                    Se o problema persistir, tente limpar o cache do navegador.
                  </>
                )}
              </p>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-accent-green text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer border-none"
              >
                <RefreshCw size={16} />
                Tentar novamente
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-surface-tertiary text-text-primary text-sm font-medium hover:bg-surface-secondary transition-colors cursor-pointer border border-border-secondary"
              >
                Recarregar página
              </button>
            </div>

            {/* Detalhes do erro (apenas em dev) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-text-tertiary cursor-pointer hover:text-text-secondary">
                  Detalhes técnicos (dev)
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-surface-tertiary text-[10px] text-text-secondary overflow-auto max-h-40 border border-border-secondary">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
