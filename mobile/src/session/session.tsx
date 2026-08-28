/**
 * Sessão do usuário.
 *
 * O token fica no expo-secure-store (Keychain no iOS, Keystore no Android),
 * nunca em AsyncStorage — é credencial. O objeto do usuário fica junto só pra
 * o app abrir já sabendo o nome sem esperar rede.
 */

import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import * as api from '@/api/client';
import type { User, VerificationDocumentType } from '@/domain/types';

const CHAVE_TOKEN = 'uroute.token';
const CHAVE_USER = 'uroute.user';

/** SecureStore não existe no web; ali caímos pro localStorage. */
const cofre = {
  async get(chave: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(chave) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(chave);
  },
  async set(chave: string, valor: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.setItem(chave, valor);
      } catch {
        /* modo privado: segue sem persistir */
      }
      return;
    }
    await SecureStore.setItemAsync(chave, valor);
  },
  async del(chave: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        globalThis.localStorage?.removeItem(chave);
      } catch {
        /* idem */
      }
      return;
    }
    await SecureStore.deleteItemAsync(chave);
  },
};

interface SessaoValue {
  user: User | null;
  carregando: boolean;
  entrar: (rgm: string, senha: string) => Promise<void>;
  criarConta: (dados: api.DadosCadastro) => Promise<void>;
  sair: () => Promise<void>;
  atualizarUsuario: (mudancas: Partial<User>) => Promise<void>;
  alterarInstituicao: (instituicao: string) => Promise<void>;
  enviarDocumentoVerificacao: (
    uri: string,
    tipoDocumento: VerificationDocumentType,
  ) => Promise<void>;
  /** ÁREA DE DEMONSTRAÇÃO — ver `revisarVerificacaoDemo` em `api/client.ts`. */
  revisarVerificacaoDemo: (aprovado: boolean, motivo?: string) => Promise<void>;
}

const SessaoContext = createContext<SessaoValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Restaura a sessão salva na abertura do app.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [token, bruto] = await Promise.all([
          cofre.get(CHAVE_TOKEN),
          cofre.get(CHAVE_USER),
        ]);
        if (vivo && token && bruto) setUser(JSON.parse(bruto) as User);
      } catch {
        // Sessão corrompida: melhor voltar pro login do que abrir quebrado.
        await Promise.all([cofre.del(CHAVE_TOKEN), cofre.del(CHAVE_USER)]);
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const guardar = useCallback(async (sessao: api.Sessao) => {
    await Promise.all([
      cofre.set(CHAVE_TOKEN, sessao.token),
      cofre.set(CHAVE_USER, JSON.stringify(sessao.user)),
    ]);
    setUser(sessao.user);
  }, []);

  const entrar = useCallback(
    async (rgm: string, senha: string) => {
      await guardar(await api.login(rgm, senha));
    },
    [guardar],
  );

  const criarConta = useCallback(
    async (dados: api.DadosCadastro) => {
      await guardar(await api.cadastrar(dados));
    },
    [guardar],
  );

  const sair = useCallback(async () => {
    await Promise.all([cofre.del(CHAVE_TOKEN), cofre.del(CHAVE_USER)]);
    setUser(null);
  }, []);

  const atualizarUsuario = useCallback(
    async (mudancas: Partial<User>) => {
      if (!user) return;
      const atualizado = await api.atualizarPerfil(user.id, mudancas);
      await cofre.set(CHAVE_USER, JSON.stringify(atualizado));
      setUser(atualizado);
    },
    [user],
  );

  const alterarInstituicao = useCallback(
    async (instituicao: string) => {
      if (!user) return;
      const atualizado = await api.alterarInstituicao(user.id, instituicao);
      await cofre.set(CHAVE_USER, JSON.stringify(atualizado));
      setUser(atualizado);
    },
    [user],
  );

  const enviarDocumentoVerificacao = useCallback(
    async (uri: string, tipoDocumento: VerificationDocumentType) => {
      if (!user) return;
      const atualizado = await api.enviarDocumentoVerificacao(user.id, uri, tipoDocumento);
      await cofre.set(CHAVE_USER, JSON.stringify(atualizado));
      setUser(atualizado);
    },
    [user],
  );

  const revisarVerificacaoDemo = useCallback(
    async (aprovado: boolean, motivo?: string) => {
      if (!user) return;
      const atualizado = await api.revisarVerificacaoDemo(user.id, aprovado, motivo);
      await cofre.set(CHAVE_USER, JSON.stringify(atualizado));
      setUser(atualizado);
    },
    [user],
  );

  const value = useMemo<SessaoValue>(
    () => ({
      user,
      carregando,
      entrar,
      criarConta,
      sair,
      atualizarUsuario,
      alterarInstituicao,
      enviarDocumentoVerificacao,
      revisarVerificacaoDemo,
    }),
    [
      user,
      carregando,
      entrar,
      criarConta,
      sair,
      atualizarUsuario,
      alterarInstituicao,
      enviarDocumentoVerificacao,
      revisarVerificacaoDemo,
    ],
  );

  return <SessaoContext.Provider value={value}>{children}</SessaoContext.Provider>;
}

export function useSessao(): SessaoValue {
  const ctx = useContext(SessaoContext);
  if (!ctx) throw new Error('useSessao precisa estar dentro de <SessionProvider>.');
  return ctx;
}

/** Igual ao `useSessao`, mas garante que existe usuário. Use nas telas logadas. */
export function useUsuario(): User {
  const { user } = useSessao();
  if (!user) throw new Error('useUsuario chamado fora de uma tela autenticada.');
  return user;
}
