import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { INSTITUICOES, type VerificationDocumentType } from '@/domain/types';
import {
  DESCRICOES_VERIFICACAO,
  ROTULOS_DOCUMENTO,
  ROTULOS_VERIFICACAO,
  TOM_VERIFICACAO,
} from '@/domain/verificacao';
import { useSessao } from '@/session/session';
import { useTheme } from '@/theme/theme';
import { radius, spacing } from '@/theme/tokens';
import {
  Botao,
  Campo,
  Cartao,
  Chip,
  Etiqueta,
  SeletorBusca,
  Tela,
  Texto,
  TituloSecao,
  avisar,
  confirmar,
} from '@/ui';

const TIPOS_DOCUMENTO: VerificationDocumentType[] = ['STUDENT_ID', 'ENROLLMENT_PROOF', 'OTHER'];

export default function Verificacao() {
  const router = useRouter();
  const { user, enviarDocumentoVerificacao, alterarInstituicao, revisarVerificacaoDemo } =
    useSessao();
  const { colors } = useTheme();

  const [tipoDocumento, setTipoDocumento] = useState<VerificationDocumentType>('STUDENT_ID');
  const [imagemUri, setImagemUri] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [trocando, setTrocando] = useState(false);
  const [novaInstituicao, setNovaInstituicao] = useState<string | null>(null);
  const [salvandoInstituicao, setSalvandoInstituicao] = useState(false);

  const [motivoRecusaDemo, setMotivoRecusaDemo] = useState('');

  if (!user) return null;

  async function tirarFoto() {
    try {
      const permissao = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissao.granted) {
        avisar('Permissão necessária', 'Autorize a câmera pra fotografar o documento.');
        return;
      }
      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });
      if (!resultado.canceled && resultado.assets[0]) {
        setImagemUri(resultado.assets[0].uri);
        setErro(null);
      }
    } catch {
      avisar('Não deu', 'Não foi possível abrir a câmera.');
    }
  }

  async function escolherDaGaleria() {
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        avisar('Permissão necessária', 'Autorize o acesso às fotos pra escolher o documento.');
        return;
      }
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });
      if (!resultado.canceled && resultado.assets[0]) {
        setImagemUri(resultado.assets[0].uri);
        setErro(null);
      }
    } catch {
      avisar('Não deu', 'Não foi possível abrir a galeria.');
    }
  }

  async function enviar() {
    setErro(null);
    if (!imagemUri) {
      setErro('Tire uma foto ou escolha uma imagem do documento.');
      return;
    }
    setEnviando(true);
    try {
      await enviarDocumentoVerificacao(imagemUri, tipoDocumento);
      setImagemUri(null);
      avisar('Enviado', 'Seu documento entrou na fila de análise.');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível enviar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  function confirmarTroca() {
    if (!novaInstituicao) return;
    confirmar({
      titulo: 'Trocar instituição',
      mensagem:
        'Isso pede um novo documento de verificação. Publicar e reservar caronas fica bloqueado até a nova verificação ser aprovada. Confirma?',
      textoConfirmar: 'Trocar',
      destrutivo: true,
      onConfirmar: () => {
        setSalvandoInstituicao(true);
        void alterarInstituicao(novaInstituicao).finally(() => {
          setSalvandoInstituicao(false);
          setTrocando(false);
          setNovaInstituicao(null);
        });
      },
    });
  }

  const status = user.verification_status;
  const mostrarFormularioDeEnvio = status === 'UNVERIFIED' || status === 'REJECTED';

  return (
    <Tela>
      <View style={{ gap: spacing.xs }}>
        <Texto variante="titulo">Verificação de aluno</Texto>
        <Texto variante="legenda" cor="suave">
          Confirma que você é da sua instituição pra liberar publicar e reservar caronas.
        </Texto>
      </View>

      <Cartao padding={spacing.xl}>
        <View style={{ gap: spacing.md }}>
          <View style={estilos.linhaStatus}>
            <TituloSecao>Situação atual</TituloSecao>
            <Etiqueta tom={TOM_VERIFICACAO[status]}>{ROTULOS_VERIFICACAO[status]}</Etiqueta>
          </View>
          <Texto variante="legenda" cor="suave">
            {DESCRICOES_VERIFICACAO[status]}
          </Texto>
          <Texto variante="micro" cor="apagado">
            {user.institution ?? 'Nenhuma instituição selecionada.'}
          </Texto>
          {status === 'REJECTED' && user.verification_rejected_reason ? (
            <View style={[estilos.aviso, { backgroundColor: colors.dangerSoft }]}>
              <Texto variante="legenda" style={{ color: colors.danger }}>
                {user.verification_rejected_reason}
              </Texto>
            </View>
          ) : null}
        </View>
      </Cartao>

      {mostrarFormularioDeEnvio ? (
        <Cartao padding={spacing.xl}>
          <View style={{ gap: spacing.lg }}>
            <TituloSecao>Enviar documento</TituloSecao>
            <Texto variante="legenda" cor="suave">
              {`Carteirinha de estudante, comprovante de matrícula ou outro documento que mostre seu vínculo com ${user.institution ?? 'sua instituição'}.`}
            </Texto>

            <View style={{ gap: spacing.sm }}>
              <Texto variante="legenda" peso="bold" cor="suave">
                Tipo de documento
              </Texto>
              <View style={estilos.chips}>
                {TIPOS_DOCUMENTO.map((tipo) => (
                  <Chip
                    key={tipo}
                    rotulo={ROTULOS_DOCUMENTO[tipo]}
                    ativo={tipoDocumento === tipo}
                    onPress={() => setTipoDocumento(tipo)}
                  />
                ))}
              </View>
            </View>

            {imagemUri ? (
              <Image source={{ uri: imagemUri }} style={estilos.previa} resizeMode="cover" />
            ) : null}

            <View style={estilos.linha}>
              <Botao
                titulo="Tirar foto"
                variante="tonal"
                onPress={() => void tirarFoto()}
                style={estilos.botaoMetade}
              />
              <Botao
                titulo="Escolher da galeria"
                variante="fantasma"
                onPress={() => void escolherDaGaleria()}
                style={estilos.botaoMetade}
              />
            </View>

            {erro ? (
              <Texto variante="micro" cor="perigo">
                {erro}
              </Texto>
            ) : null}

            <Botao
              titulo="Enviar para análise"
              onPress={() => void enviar()}
              carregando={enviando}
              bloco
              tamanho="lg"
            />
          </View>
        </Cartao>
      ) : null}

      {status === 'VERIFIED' ? (
        <Cartao padding={spacing.xl}>
          <View style={{ gap: spacing.md }}>
            <TituloSecao>Trocar de instituição</TituloSecao>
            <Texto variante="micro" cor="apagado">
              Muda a instituição registrada e pede verificação de novo.
            </Texto>
            {trocando ? (
              <>
                <SeletorBusca
                  rotulo="Nova instituição"
                  opcoes={INSTITUICOES}
                  valor={novaInstituicao}
                  onChange={setNovaInstituicao}
                  placeholder="Busque sua instituição"
                />
                <View style={estilos.linha}>
                  <Botao
                    titulo="Cancelar"
                    variante="fantasma"
                    onPress={() => {
                      setTrocando(false);
                      setNovaInstituicao(null);
                    }}
                    style={estilos.botaoMetade}
                  />
                  <Botao
                    titulo="Confirmar troca"
                    variante="perigo"
                    onPress={confirmarTroca}
                    carregando={salvandoInstituicao}
                    desabilitado={!novaInstituicao}
                    style={estilos.botaoMetade}
                  />
                </View>
              </>
            ) : (
              <Botao
                titulo="Trocar instituição"
                variante="fantasma"
                bloco
                onPress={() => setTrocando(true)}
              />
            )}
          </View>
        </Cartao>
      ) : null}

      {status === 'PENDING' ? (
        <View style={[estilos.demo, { borderColor: colors.border }]}>
          <Texto variante="micro" cor="apagado">
            ÁREA DE DEMONSTRAÇÃO
          </Texto>
          <Texto variante="micro" cor="suave" peso="regular">
            Sem backend, quem aprova ou recusa é este botão. No app de verdade essa decisão sai
            de uma revisão do lado de fora do app de quem se cadastrou.
          </Texto>
          <Botao
            titulo="Aprovar (demo)"
            variante="tonal"
            tamanho="sm"
            bloco
            onPress={() => void revisarVerificacaoDemo(true)}
          />
          <Campo
            rotulo="Motivo da recusa (demo)"
            valor={motivoRecusaDemo}
            onChange={setMotivoRecusaDemo}
            placeholder="Ex.: foto ilegível"
          />
          <Botao
            titulo="Recusar (demo)"
            variante="perigo"
            tamanho="sm"
            bloco
            onPress={() => void revisarVerificacaoDemo(false, motivoRecusaDemo)}
          />
        </View>
      ) : null}

      <Botao titulo="Voltar" variante="fantasma" bloco onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  linhaStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  linha: { flexDirection: 'row', gap: spacing.sm },
  botaoMetade: { flex: 1 },
  previa: { width: '100%', height: 180, borderRadius: radius.sm },
  aviso: { padding: spacing.md, borderRadius: radius.sm },
  demo: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
